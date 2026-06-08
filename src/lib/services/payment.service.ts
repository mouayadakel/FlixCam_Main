/**
 * @file payment.service.ts
 * @description Payment service with Tap Payments integration
 * @module lib/services/payment
 */

import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { sendMetaCapiPurchase } from '@/lib/services/meta-capi.service'
import { AuditService } from './audit.service'
import { BookingService } from './booking.service'
import { InvoiceService } from './invoice.service'
import { OrderNotificationService } from './order-notification.service'
import { DepositService } from './deposit.service'
import { EventBus } from '@/lib/events/event-bus'
import { EmailService } from './email.service'
import { hasActiveAutomationRulesForTrigger } from './messaging-automation.service'
import { NotFoundError, ValidationError, ForbiddenError } from '@/lib/errors'
import { hasPermission } from '@/lib/auth/permissions'
import { PaymentStatus, BookingStatus } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import { moyasarHalalahToSar } from '@/lib/utils/moyasar-amount'
import { bookingPayableBreakdown, toSarNumber } from '@/lib/utils/checkout-totals'
import { getVATRate } from '@/lib/vat'
import { fromGatewayAmount, toGatewayAmount } from '@/lib/payment/money'
import { getAdapter } from '@/lib/integrations/payment-gateway/registry'
import type { GatewaySlug } from '@/lib/integrations/payment-gateway/types'
import { PaymentGatewayConfigService } from './payment-gateway-config.service'
import {
  getMoyasarWebhookRegistryEntry,
  normalizeMoyasarWebhookType,
} from '@/lib/services/moyasar-webhook.registry'
import { handleMoyasarPayoutOrBalanceWebhook } from '@/lib/services/payout-webhook.handler'

/** [FIX 3] Queue processor / HTTP inline outcome for Moyasar webhooks */
export interface GatewayWebhookHandleResult {
  queueOutcome: 'PROCESSED' | 'SKIPPED'
  skipReason?: string
}

export interface CreatePaymentInput {
  bookingId: string
  amount: number
  userId: string
}

export interface ProcessPaymentInput {
  paymentId: string
  tapTransactionId: string
  tapChargeId: string
  userId: string
}

export interface RefundPaymentInput {
  paymentId: string
  amount?: number // Partial refund if specified, full refund if not
  reason: string
  userId: string
}

async function sendPurchaseCapiForBooking(bookingId: string, valueSar: number): Promise<void> {
  const full = await prisma.booking.findFirst({
    where: { id: bookingId, deletedAt: null },
    select: {
      id: true,
      bookingNumber: true,
      totalAmount: true,
      customer: { select: { email: true, phone: true } },
    },
  })
  if (!full) return
  const base = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.APP_URL ||
    'https://flixcam.rent'
  ).replace(/\/$/, '')
  const v = Number.isFinite(valueSar) && valueSar > 0 ? valueSar : Number(full.totalAmount)
  await sendMetaCapiPurchase({
    orderId: full.bookingNumber || full.id,
    value: Number.isFinite(v) ? v : 0,
    currency: 'SAR',
    email: full.customer.email,
    phone: full.customer.phone,
    eventSourceUrl: `${base}/booking/confirmation/${full.id}`,
  })
}

async function usesAdminManagedPaymentReceivedNotifications(): Promise<boolean> {
  try {
    return await hasActiveAutomationRulesForTrigger('PAYMENT_RECEIVED')
  } catch (error) {
    logger.warn('Failed to inspect PAYMENT_RECEIVED automation rules; using legacy fallback', {
      error: error instanceof Error ? error.message : String(error),
    })
    return false
  }
}

export class PaymentService {
  private static async syncBookingInvoice(bookingId: string, userId: string): Promise<void> {
    await InvoiceService.autoGenerateForBooking(bookingId).catch((error) => {
      logger.warn('PaymentService: failed to auto-generate booking invoice during payment sync', {
        bookingId,
        error: error instanceof Error ? error.message : String(error),
      })
    })

    await InvoiceService.syncBookingInvoicePayments(bookingId, userId).catch((error) => {
      logger.warn('PaymentService: failed to sync invoice payments after payment update', {
        bookingId,
        error: error instanceof Error ? error.message : String(error),
      })
    })
  }

  private static normalizeRefundGateway(payment: {
    gateway: string | null
    tapChargeId: string | null
    tapTransactionId: string | null
  }): GatewaySlug {
    const gateway = payment.gateway?.toLowerCase()
    if (gateway === 'tap' || gateway === 'moyasar') return gateway
    if (payment.tapChargeId || payment.tapTransactionId) return 'tap'
    throw new ValidationError('Payment gateway is missing; cannot execute gateway refund')
  }

  private static async executeGatewayRefund(
    gateway: GatewaySlug,
    externalId: string,
    amount: Decimal
  ): Promise<{ id?: string; raw?: unknown }> {
    const config = await PaymentGatewayConfigService.getConfig(gateway)
    if (!config) {
      throw new ValidationError(`Payment gateway ${gateway} is not configured`)
    }
    const adapter = getAdapter(gateway, config)
    if (!adapter.refund) {
      throw new ValidationError(`Refund is not implemented for gateway ${gateway}`)
    }

    const nativeAmount = toGatewayAmount(amount, gateway)
    const result = await adapter.refund(externalId, nativeAmount)
    if (!result.success) {
      throw new ValidationError(result.error || `Gateway refund failed for ${gateway}`)
    }
    return { id: externalId, raw: result }
  }

  private static mapGatewayEventToPaymentStatus(eventType: string): PaymentStatus {
    const normalized = eventType.toLowerCase()

    if (
      normalized.includes('payment_paid') ||
      normalized.includes('payment.paid') ||
      normalized.includes('payment_captured') ||
      normalized.includes('captured') ||
      normalized === 'paid' ||
      normalized === 'charge.succeeded'
    ) {
      return PaymentStatus.SUCCESS
    }

    if (
      normalized.includes('payment_authorized') ||
      normalized.includes('payment_verified') ||
      normalized.includes('initiated') ||
      normalized.includes('authorized') ||
      normalized.includes('verified')
    ) {
      return PaymentStatus.PROCESSING
    }

    if (normalized.includes('payment_refunded') || normalized.includes('refunded')) {
      return PaymentStatus.REFUNDED
    }

    if (
      normalized.includes('payment_failed') ||
      normalized.includes('payment_faild') ||
      normalized.includes('failed') ||
      normalized.includes('voided') ||
      normalized.includes('abandoned') ||
      normalized === 'charge.failed' ||
      normalized === 'charge.cancelled'
    ) {
      return PaymentStatus.FAILED
    }

    return PaymentStatus.PROCESSING
  }

  /**
   * Create a payment intent for a booking
   */
  static async create(input: CreatePaymentInput) {
    // Check permission
    const canProcess = await hasPermission(input.userId, 'payment.read' as any)
    if (!canProcess) {
      throw new ForbiddenError('You do not have permission to process payments')
    }

    // Get booking
    const booking = await prisma.booking.findFirst({
      where: {
        id: input.bookingId,
        deletedAt: null,
      },
    })

    if (!booking) {
      throw new NotFoundError('Booking not found')
    }

    // Validate booking is in correct state
    if (booking.status !== BookingStatus.PAYMENT_PENDING) {
      throw new ValidationError('Booking is not in payment pending state')
    }

    // Check if payment already exists
    const existing = await prisma.payment.findFirst({
      where: {
        bookingId: input.bookingId,
        deletedAt: null,
        status: {
          in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING, PaymentStatus.SUCCESS],
        },
      },
    })

    if (existing) {
      throw new ValidationError('Payment already exists for this booking')
    }

    // Create payment
    const payment = await prisma.payment.create({
      data: {
        bookingId: input.bookingId,
        amount: new Decimal(input.amount),
        status: PaymentStatus.PENDING,
        createdBy: input.userId,
      },
    })

    await AuditService.log({
      action: 'payment.created',
      userId: input.userId,
      resourceType: 'payment',
      resourceId: payment.id,
      metadata: {
        bookingId: input.bookingId,
        amount: input.amount,
      },
    })

    await EventBus.emit('payment.created', {
      paymentId: payment.id,
      bookingId: input.bookingId,
      amount: input.amount,
      userId: input.userId,
      timestamp: new Date(),
    })

    return payment
  }

  /**
   * Process payment (called by webhook or manual confirmation)
   */
  static async process(input: ProcessPaymentInput) {
    const payment = await prisma.payment.findFirst({
      where: {
        id: input.paymentId,
        deletedAt: null,
      },
      include: {
        booking: true,
      },
    })

    if (!payment) {
      throw new NotFoundError('Payment not found')
    }

    // Update payment with Tap transaction details
    const updated = await prisma.payment.update({
      where: { id: input.paymentId },
      data: {
        status: PaymentStatus.SUCCESS,
        gateway: 'tap',
        externalId: input.tapChargeId || input.tapTransactionId,
        tapTransactionId: input.tapTransactionId,
        tapChargeId: input.tapChargeId,
        updatedBy: input.userId,
      },
    })

    const existingLedgerEntry = await prisma.ledgerEntry.findFirst({
      where: { paymentId: updated.id, account: 'REVENUE', type: 'CREDIT' },
      select: { id: true },
    })
    if (!existingLedgerEntry) {
      await prisma.ledgerEntry.create({
        data: {
          type: 'CREDIT',
          amount: payment.amount,
          account: 'REVENUE',
          bookingId: payment.bookingId,
          paymentId: updated.id,
          description: 'Tap payment received',
          reference: updated.externalId ?? updated.tapChargeId ?? updated.tapTransactionId ?? updated.id,
        },
      })
    }

    // Update booking to CONFIRMED
    if (payment.booking.status === BookingStatus.PAYMENT_PENDING) {
      await BookingService.transitionState(payment.bookingId, BookingStatus.CONFIRMED, input.userId)
      await sendPurchaseCapiForBooking(
        payment.bookingId,
        Number(payment.amount)
      ).catch((e) =>
        logger.warn('Meta CAPI Purchase after process()', {
          error: e instanceof Error ? e.message : String(e),
        })
      )
    }

    await this.syncBookingInvoice(payment.bookingId, input.userId)

    await EventBus.emit('payment.success', {
      paymentId: updated.id,
      bookingId: payment.bookingId,
      amount: Number(payment.amount).toString(),
      customerId: payment.booking.customerId,
      bookingNumber: payment.booking.bookingNumber ?? undefined,
      userId: input.userId,
      timestamp: new Date(),
    })

    const paymentReceivedManagedByAdmin = await usesAdminManagedPaymentReceivedNotifications()

    if (!paymentReceivedManagedByAdmin) {
      await OrderNotificationService.notifyPaymentConfirmed(
        payment.bookingId,
        Number(payment.amount)
      ).catch((error) =>
        logger.warn('PaymentService.process: WhatsApp success notification failed', {
          bookingId: payment.bookingId,
          error: error instanceof Error ? error.message : String(error),
        })
      )

      await EmailService.sendPaymentDocumentsEmail({
        bookingId: payment.bookingId,
      }).catch((e) =>
        logger.warn('Failed to send payment documents email', {
          error: e instanceof Error ? e.message : String(e),
          bookingId: payment.bookingId,
        })
      )
    } else {
      await OrderNotificationService.notifyPaymentConfirmedExtraEmails(
        payment.bookingId,
        Number(payment.amount)
      ).catch((error) =>
        logger.warn('PaymentService.process: extra order completed emails failed', {
          bookingId: payment.bookingId,
          error: error instanceof Error ? error.message : String(error),
        })
      )
    }

    await AuditService.log({
      action: 'payment.success',
      userId: input.userId,
      resourceType: 'payment',
      resourceId: payment.id,
      metadata: {
        tapTransactionId: input.tapTransactionId,
        tapChargeId: input.tapChargeId,
      },
    })

    return updated
  }

  /**
   * Handle webhook event from a payment gateway (Tap, Moyasar, etc.).
   * Creates payment record and transitions booking to CONFIRMED on success.
   */
  static async handleGatewayWebhook(
    slug: string,
    event: { type: string; bookingId?: string; amount?: number; externalId?: string },
    options?: { rawWebhook?: unknown }
  ): Promise<GatewayWebhookHandleResult> {
    if (slug === 'moyasar') {
      // [FIX 1] [FIX 2] [FIX 3]
      return this.handleMoyasarGatewayWebhook(event, options?.rawWebhook)
    }
    return this.handleTapGatewayWebhook(event)
  }

  // [FIX 1] [FIX 3]
  private static async handleMoyasarGatewayWebhook(
    event: { type: string; bookingId?: string; amount?: number; externalId?: string },
    rawWebhook: unknown | undefined
  ): Promise<GatewayWebhookHandleResult> {
    const registryKey = normalizeMoyasarWebhookType(event.type)
    const entry = getMoyasarWebhookRegistryEntry(event.type)
    const bookingId = event.bookingId

    if (entry.eventClass === 'payout' || entry.eventClass === 'balance') {
      const dataId = typeof event.externalId === 'string' ? event.externalId.trim() : ''
      if (!dataId) {
        throw new Error(`[Moyasar] ${registryKey} missing data.id — cannot process`)
      }
      await handleMoyasarPayoutOrBalanceWebhook({
        registryKey,
        entry,
        dataId,
        amountHalalah: event.amount,
        currency: 'SAR',
        failureReason: null,
        rawPayload: rawWebhook ?? event,
      })
      if (!bookingId) {
        logger.info('[Moyasar] Skipped — payout/balance event, no booking link', {
          eventType: registryKey,
          resourceId: dataId,
        })
        return { queueOutcome: 'SKIPPED', skipReason: 'payout_balance_no_booking' }
      }
      return { queueOutcome: 'PROCESSED' }
    }

    if (!bookingId) {
      throw new Error(
        `[Moyasar] ${registryKey} missing booking_id in metadata — cannot process`
      )
    }

    if (!entry.paymentStatus) {
      throw new Error(`[Moyasar] ${registryKey} has no paymentStatus for booking pipeline`)
    }

    if (entry.domainEvent === null && entry.notifyStaff && entry.eventClass === 'payment') {
      logger.info('[Moyasar] Payment lifecycle webhook (no domain emit)', {
        eventType: registryKey,
        bookingId,
        externalId: event.externalId,
      })
    }

    await this.applyGatewayPaymentWebhookSideEffects({
      slug: 'moyasar',
      event: { ...event, bookingId },
      mappedStatus: entry.paymentStatus,
      moyasarRegistryKey: registryKey,
      moyasarEntry: entry,
    })
    return { queueOutcome: 'PROCESSED' }
  }

  // [FIX 1]
  private static async handleTapGatewayWebhook(
    event: { type: string; bookingId?: string; amount?: number; externalId?: string }
  ): Promise<GatewayWebhookHandleResult> {
    const bookingId = event.bookingId
    if (!bookingId) {
      logger.warn('Payment webhook ignored because bookingId is missing', {
        gateway: 'tap',
        eventType: event.type,
        externalId: event.externalId,
      })
      return { queueOutcome: 'PROCESSED' }
    }
    const mappedStatus = this.mapGatewayEventToPaymentStatus(event.type || '')
    await this.applyGatewayPaymentWebhookSideEffects({
      slug: 'tap',
      event: { ...event, bookingId },
      mappedStatus,
    })
    return { queueOutcome: 'PROCESSED' }
  }

  // [FIX 2] Shared payment row + emits (Tap heuristics vs Moyasar registry)
  private static async applyGatewayPaymentWebhookSideEffects(params: {
    slug: 'moyasar' | 'tap'
    event: { type: string; bookingId: string; amount?: number; externalId?: string }
    mappedStatus: PaymentStatus
    moyasarRegistryKey?: string
    moyasarEntry?: import('@/lib/services/moyasar-webhook.registry').MoyasarWebhookRegistryEntry
  }): Promise<void> {
    const { slug, event, mappedStatus, moyasarEntry } = params
    const bookingId = event.bookingId
    const isSuccess = mappedStatus === PaymentStatus.SUCCESS
    const rawAmount = event.amount != null ? Number(event.amount) : 0
    const amount = slug === 'moyasar' ? moyasarHalalahToSar(rawAmount) : fromGatewayAmount(rawAmount, 'tap').toNumber()

    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, deletedAt: null },
      select: {
        id: true,
        status: true,
        customerId: true,
        bookingNumber: true,
        totalAmount: true,
        vatAmount: true,
        depositAmount: true,
      },
    })
    if (!booking) {
      throw new Error(`Booking ${bookingId} not found for ${slug} webhook`)
    }

    if (slug === 'moyasar' && isSuccess && rawAmount > 0) {
      const vatRateNum = (await getVATRate()).toNumber()
      const expectedHalalah = bookingPayableBreakdown(
        toSarNumber(booking.totalAmount),
        toSarNumber(booking.vatAmount ?? 0),
        vatRateNum
      ).amountHalalah
      if (expectedHalalah >= 100 && Math.abs(rawAmount - expectedHalalah) > 1) {
        logger.error('Moyasar webhook: paid amount does not match booking grand total', {
          bookingId,
          rawHalalah: rawAmount,
          expectedHalalah,
        })
        const mismatchData = {
          bookingId,
          amount: new Decimal(amount || 0),
          status: PaymentStatus.AMOUNT_MISMATCH,
          gateway: slug,
          externalId: event.externalId ?? undefined,
          metadata: {
            reason: 'amount_mismatch',
            rawHalalah: rawAmount,
            expectedHalalah,
            eventType: event.type,
          },
          createdBy: 'system',
          updatedBy: 'system',
        }
        if (event.externalId) {
          await prisma.payment.upsert({
            where: { externalId: event.externalId },
            create: mismatchData,
            update: {
              amount: mismatchData.amount,
              status: PaymentStatus.AMOUNT_MISMATCH,
              metadata: mismatchData.metadata,
              updatedBy: 'system',
            },
          })
        } else {
          await prisma.payment.create({ data: mismatchData })
        }
        throw new Error(
          `Moyasar amount mismatch for booking ${bookingId}: received ${rawAmount} halalah, expected ${expectedHalalah}`
        )
      }
    }

    let paymentRecord = await prisma.payment.findFirst({
      where: {
        bookingId,
        deletedAt: null,
        ...(event.externalId
          ? {
              OR: [
                { externalId: event.externalId },
                ...(slug === 'tap'
                  ? [{ tapTransactionId: event.externalId }, { tapChargeId: event.externalId }]
                  : []),
              ],
            }
          : {}),
      },
    })

    if (!paymentRecord) {
      paymentRecord = await prisma.payment.findFirst({
        where: { bookingId, deletedAt: null, status: PaymentStatus.SUCCESS },
      })
    }

    const wasSuccess = paymentRecord?.status === PaymentStatus.SUCCESS
    const wasFailed = paymentRecord?.status === PaymentStatus.FAILED
    const wasRefunded =
      paymentRecord?.status === PaymentStatus.REFUNDED ||
      paymentRecord?.status === PaymentStatus.PARTIALLY_REFUNDED

    const domainSuccess = moyasarEntry
      ? moyasarEntry.domainEvent === 'payment.success'
      : mappedStatus === PaymentStatus.SUCCESS
    const domainFailed = moyasarEntry
      ? moyasarEntry.domainEvent === 'payment.failed'
      : mappedStatus === PaymentStatus.FAILED
    const domainRefunded = moyasarEntry
      ? moyasarEntry.domainEvent === 'payment.refunded'
      : mappedStatus === PaymentStatus.REFUNDED

    const shouldEmitSuccess = domainSuccess && !wasSuccess
    const shouldEmitFailure = domainFailed && !wasFailed
    const shouldEmitRefund = domainRefunded && !wasRefunded

    const notifyCustomerFailure = moyasarEntry?.notifyCustomer ?? true
    const notifyCustomerRefund = moyasarEntry?.notifyCustomer ?? true

    if (!paymentRecord) {
      paymentRecord = await prisma.payment.create({
        data: {
          bookingId,
          amount: new Decimal(amount || 0),
          status: mappedStatus,
          gateway: slug,
          externalId: event.externalId ?? undefined,
          tapTransactionId: slug === 'tap' ? event.externalId ?? undefined : undefined,
          tapChargeId: slug === 'tap' ? event.externalId ?? undefined : undefined,
          createdBy: 'system',
        },
      })
      logger.info('Payment webhook created payment record', {
        gateway: slug,
        bookingId,
        paymentId: paymentRecord.id,
        status: mappedStatus,
        externalId: event.externalId,
      })
    } else if (
      paymentRecord.status !== mappedStatus ||
      (event.externalId && !paymentRecord.externalId) ||
      (amount > 0 && Number(paymentRecord.amount || 0) !== amount)
    ) {
      paymentRecord = await prisma.payment.update({
        where: { id: paymentRecord.id },
        data: {
          status: mappedStatus,
          amount: amount > 0 ? new Decimal(amount) : paymentRecord.amount,
          gateway: slug,
          externalId: event.externalId ?? paymentRecord.externalId ?? undefined,
          tapTransactionId:
            slug === 'tap'
              ? event.externalId ?? paymentRecord.tapTransactionId ?? undefined
              : paymentRecord.tapTransactionId ?? undefined,
          tapChargeId:
            slug === 'tap'
              ? event.externalId ?? paymentRecord.tapChargeId ?? undefined
              : paymentRecord.tapChargeId ?? undefined,
          updatedBy: 'system',
        },
      })
      logger.info('Payment webhook updated payment record', {
        gateway: slug,
        bookingId,
        paymentId: paymentRecord.id,
        status: mappedStatus,
        externalId: event.externalId,
      })
    } else {
      logger.info('Payment webhook matched existing payment state; continuing reconciliation', {
        gateway: slug,
        bookingId,
        paymentId: paymentRecord.id,
        status: mappedStatus,
        externalId: event.externalId,
      })
    }

    if (isSuccess && booking.status === BookingStatus.PAYMENT_PENDING) {
      try {
        await BookingService.transitionState(bookingId, BookingStatus.CONFIRMED, 'system')
        await sendPurchaseCapiForBooking(bookingId, amount)
        if (Number(booking.depositAmount ?? 0) > 0) {
          await DepositService.markCollected(
            bookingId,
            event.externalId ?? paymentRecord.externalId ?? undefined,
            'system'
          )
        }
      } catch (e) {
        logger.error('handleGatewayWebhook transition or Meta CAPI', {
          error: e instanceof Error ? e.message : String(e),
          bookingId,
        })
      }
    }

    if (isSuccess) {
      const existingLedgerEntry = await prisma.ledgerEntry.findFirst({
        where: {
          paymentId: paymentRecord.id,
          account: 'REVENUE',
          type: 'CREDIT',
        },
        select: { id: true },
      })
      if (!existingLedgerEntry) {
        await prisma.ledgerEntry.create({
          data: {
            type: 'CREDIT',
            amount: new Decimal(amount || paymentRecord.amount || 0),
            account: 'REVENUE',
            bookingId,
            paymentId: paymentRecord.id,
            description: `${slug} payment received`,
            reference: event.externalId ?? paymentRecord.externalId ?? paymentRecord.id,
          },
        })
      }
      await this.syncBookingInvoice(bookingId, 'system')
    }

    if (shouldEmitSuccess) {
      await EventBus.emit('payment.success', {
        paymentId: paymentRecord.id,
        bookingId,
        amount: amount.toString(),
        customerId: booking.customerId,
        bookingNumber: booking.bookingNumber ?? undefined,
        userId: booking.customerId || 'system',
        timestamp: new Date(),
      })

      const paymentReceivedManagedByAdmin = await usesAdminManagedPaymentReceivedNotifications()

      if (!paymentReceivedManagedByAdmin) {
        await EmailService.sendPaymentDocumentsEmail({
          bookingId,
        }).catch((e) =>
          logger.warn('Failed to send payment documents email (webhook)', {
            error: e instanceof Error ? e.message : String(e),
            bookingId,
          })
        )

        await OrderNotificationService.notifyPaymentConfirmed(bookingId, amount).catch((error) =>
          logger.warn('Payment webhook: WhatsApp success notification failed', {
            bookingId,
            error: error instanceof Error ? error.message : String(error),
          })
        )
      } else {
        await OrderNotificationService.notifyPaymentConfirmedExtraEmails(bookingId, amount).catch((error) =>
          logger.warn('Payment webhook: extra order completed emails failed', {
            bookingId,
            error: error instanceof Error ? error.message : String(error),
          })
        )
      }
    }

    if (shouldEmitFailure) {
      await EventBus.emit('payment.failed', {
        paymentId: paymentRecord.id,
        bookingId,
        reason: event.type,
        customerId: booking.customerId,
        bookingNumber: booking.bookingNumber ?? undefined,
        userId: booking.customerId || 'system',
        timestamp: new Date(),
        notifyCustomer: notifyCustomerFailure,
      })

      if (notifyCustomerFailure) {
        await OrderNotificationService.notifyPaymentFailed(bookingId, event.type).catch((error) =>
          logger.warn('Payment webhook: WhatsApp failure notification failed', {
            bookingId,
            error: error instanceof Error ? error.message : String(error),
          })
        )
      }
    }

    if (shouldEmitRefund) {
      await EventBus.emit('payment.refunded', {
        paymentId: paymentRecord.id,
        bookingId,
        refundAmount: amount > 0 ? amount.toString() : paymentRecord.amount.toString(),
        customerId: booking.customerId,
        bookingNumber: booking.bookingNumber ?? undefined,
        userId: booking.customerId || 'system',
        timestamp: new Date(),
        notifyCustomer: notifyCustomerRefund,
      })
    }
  }

  /**
   * Mark payment as failed
   */
  static async markFailed(paymentId: string, userId: string, reason?: string) {
    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        deletedAt: null,
      },
      include: {
        booking: { select: { customerId: true, bookingNumber: true } },
      },
    })

    if (!payment) {
      throw new NotFoundError('Payment not found')
    }

    const updated = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: PaymentStatus.FAILED,
        updatedBy: userId,
      },
    })

    await AuditService.log({
      action: 'payment.failed',
      userId,
      resourceType: 'payment',
      resourceId: paymentId,
      metadata: { reason },
    })

    await EventBus.emit('payment.failed', {
      paymentId,
      bookingId: payment.bookingId,
      reason,
      customerId: payment.booking.customerId,
      bookingNumber: payment.booking.bookingNumber ?? undefined,
      userId,
      timestamp: new Date(),
      notifyCustomer: true,
    })

    await OrderNotificationService.notifyPaymentFailed(payment.bookingId, reason).catch((error) =>
      logger.warn('PaymentService.markFailed: WhatsApp failure notification failed', {
        bookingId: payment.bookingId,
        error: error instanceof Error ? error.message : String(error),
      })
    )

    return updated
  }

  /**
   * Process gateway refunds after booking cancellation (best-effort; does not block cancel).
   */
  static async refundBookingCancellationPayments(options: {
    bookingId: string
    userId: string
    refundAmountSar: number
    reason: string
  }): Promise<{ refundedSar: number; errors: string[] }> {
    const { bookingId, userId, refundAmountSar, reason } = options
    if (refundAmountSar <= 0) {
      return { refundedSar: 0, errors: [] }
    }

    const payments = await prisma.payment.findMany({
      where: {
        bookingId,
        deletedAt: null,
        status: { in: [PaymentStatus.SUCCESS, PaymentStatus.PARTIALLY_REFUNDED] },
      },
      orderBy: { createdAt: 'desc' },
    })

    let remaining = refundAmountSar
    let refundedSar = 0
    const errors: string[] = []

    for (const payment of payments) {
      if (remaining <= 0.009) break

      const alreadyRefunded = Number(payment.refundAmount ?? 0)
      const paymentTotal = Number(payment.amount)
      const refundable = Math.max(0, paymentTotal - alreadyRefunded)
      if (refundable <= 0) continue

      const amountThisPayment = Math.min(remaining, refundable)
      const refundAmount = new Decimal(amountThisPayment)

      try {
        const gateway = this.normalizeRefundGateway(payment)
        const externalId =
          gateway === 'tap'
            ? payment.tapChargeId || payment.externalId || payment.tapTransactionId
            : payment.externalId
        if (!externalId) {
          errors.push(`Payment ${payment.id}: missing gateway reference`)
          continue
        }

        const gatewayRefund = await this.executeGatewayRefund(gateway, externalId, refundAmount)
        const totalRefundedAmount = new Decimal(alreadyRefunded).plus(refundAmount)
        const isPartialRefund = totalRefundedAmount.lessThan(payment.amount)

        await prisma.$transaction(async (tx) => {
          await tx.refund.create({
            data: {
              paymentId: payment.id,
              bookingId,
              amount: refundAmount,
              reason,
              status: 'COMPLETED',
              gatewayRefundId: gatewayRefund.id || externalId,
              processedBy: userId,
              processedAt: new Date(),
            },
          })

          await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: isPartialRefund ? PaymentStatus.PARTIALLY_REFUNDED : PaymentStatus.REFUNDED,
              refundAmount: totalRefundedAmount,
              refundReason: reason,
            },
          })
        })

        await EventBus.emit('payment.refunded', {
          paymentId: payment.id,
          bookingId,
          refundAmount: refundAmount.toString(),
          userId,
          timestamp: new Date(),
          notifyCustomer: true,
        } as any)

        refundedSar += amountThisPayment
        remaining -= amountThisPayment
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        errors.push(`Payment ${payment.id}: ${message}`)
        logger.warn('PaymentService.refundBookingCancellationPayments: refund failed', {
          bookingId,
          paymentId: payment.id,
          error: message,
        })
      }
    }

    return { refundedSar, errors }
  }

  /**
   * Request refund (requires approval)
   */
  static async requestRefund(input: RefundPaymentInput) {
    // Check permission
    const canRefund = await hasPermission(input.userId, 'payment.refund' as any)
    if (!canRefund) {
      throw new ForbiddenError('You do not have permission to process refunds')
    }

    const payment = await prisma.payment.findFirst({
      where: {
        id: input.paymentId,
        deletedAt: null,
      },
    })

    if (!payment) {
      throw new NotFoundError('Payment not found')
    }

    // Check payment status
    if (payment.status === PaymentStatus.REFUNDED) {
      throw new ValidationError('Payment already fully refunded')
    }

    if (
      payment.status !== PaymentStatus.SUCCESS &&
      payment.status !== PaymentStatus.PARTIALLY_REFUNDED
    ) {
      throw new ValidationError('Can only refund successful or partially refunded payments')
    }

    const refundAmount = input.amount ? new Decimal(input.amount) : payment.amount

    if (refundAmount.greaterThan(payment.amount)) {
      throw new ValidationError('Refund amount cannot exceed payment amount')
    }

    // Create approval request
    const { ApprovalService } = await import('./approval.service')
    const approval = await ApprovalService.request({
      action: 'payment.refund',
      resourceType: 'payment',
      resourceId: input.paymentId,
      requestedBy: input.userId,
      reason: input.reason,
      metadata: {
        refundAmount: refundAmount.toString(),
        originalAmount: payment.amount.toString(),
      },
    })

    await AuditService.log({
      action: 'payment.refund.requested',
      userId: input.userId,
      resourceType: 'payment',
      resourceId: input.paymentId,
      metadata: {
        approvalId: approval.id,
        refundAmount: refundAmount.toString(),
        reason: input.reason,
      },
    })

    return {
      payment,
      approval,
      refundAmount,
    }
  }

  /**
   * Process refund (after approval)
   */
  static async processRefund(paymentId: string, approvalId: string, userId: string) {
    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        deletedAt: null,
      },
      include: {
        booking: { select: { customerId: true, bookingNumber: true } },
      },
    })

    if (!payment) {
      throw new NotFoundError('Payment not found')
    }

    // Verify approval
    const { ApprovalService } = await import('./approval.service')
    const approval = await ApprovalService.getById(approvalId)

    if (!approval || approval.status !== 'approved') {
      throw new ValidationError('Refund approval not found or not approved')
    }

    if (approval.resourceId !== paymentId) {
      throw new ValidationError('Approval does not match payment')
    }

    const metadata = approval.metadata as Record<string, any> | null
    const refundAmount = metadata?.refundAmount
      ? new Decimal(metadata.refundAmount as string)
      : payment.amount

    const previousRefundAmount = new Decimal(payment.refundAmount ?? 0)
    const totalRefundedAmount = previousRefundAmount.plus(refundAmount)
    if (totalRefundedAmount.minus(payment.amount).greaterThan('0.01')) {
      throw new ValidationError('Refund amount exceeds remaining refundable payment amount')
    }

    const gateway = this.normalizeRefundGateway(payment)
    const externalId =
      gateway === 'tap'
        ? payment.tapChargeId || payment.externalId || payment.tapTransactionId
        : payment.externalId
    if (!externalId) {
      throw new ValidationError('No external payment ID is stored; cannot refund on gateway')
    }

    const gatewayRefund = await this.executeGatewayRefund(gateway, externalId, refundAmount)
    const isPartialRefund = totalRefundedAmount.lessThan(payment.amount)

    const updated = await prisma.$transaction(async (tx) => {
      const refund = await tx.refund.create({
        data: {
          paymentId,
          bookingId: payment.bookingId,
          amount: refundAmount,
          reason: approval.reason || undefined,
          status: 'COMPLETED',
          gatewayRefundId: gatewayRefund.id || externalId,
          processedBy: userId,
          processedAt: new Date(),
        },
      })

      const updatedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          status: isPartialRefund ? PaymentStatus.PARTIALLY_REFUNDED : PaymentStatus.REFUNDED,
          refundAmount: totalRefundedAmount,
          refundReason: approval.reason || undefined,
          updatedBy: userId,
        },
      })

      const invoice = await tx.invoice.findFirst({
        where: { bookingId: payment.bookingId, deletedAt: null },
        select: {
          id: true,
          totalAmount: true,
          paidAmount: true,
          refundedAmount: true,
        },
      })

      if (invoice) {
        const paidAfterRefundRaw = new Decimal(invoice.paidAmount).minus(refundAmount)
        const paidAfterRefund = paidAfterRefundRaw.gt(0) ? paidAfterRefundRaw : new Decimal(0)
        const remainingAfterRefundRaw = new Decimal(invoice.totalAmount).minus(paidAfterRefund)
        const remainingAfterRefund = remainingAfterRefundRaw.gt(0)
          ? remainingAfterRefundRaw
          : new Decimal(0)
        const nextStatus =
          paidAfterRefund.lte(0)
            ? 'SENT'
            : remainingAfterRefund.lte(0)
              ? 'PAID'
              : 'PARTIALLY_PAID'

        await tx.invoice.update({
          where: { id: invoice.id },
          data: {
            paidAmount: paidAfterRefund,
            refundedAmount: new Decimal(invoice.refundedAmount ?? 0).plus(refundAmount),
            remainingAmount: remainingAfterRefund,
            status: nextStatus,
            paidDate: nextStatus === 'PAID' ? undefined : null,
            updatedBy: userId,
          },
        })
      }

      await tx.ledgerEntry.create({
        data: {
          type: 'DEBIT',
          amount: refundAmount,
          account: 'REFUND_EXPENSE',
          bookingId: payment.bookingId,
          paymentId,
          refundId: refund.id,
          description: `Refund: ${approval.reason || 'No reason provided'}`,
          reference: gatewayRefund.id || externalId,
        },
      })

      return updatedPayment
    })

    await AuditService.log({
      action: 'payment.refunded',
      userId,
      resourceType: 'payment',
      resourceId: paymentId,
      metadata: {
        approvalId,
        refundAmount: refundAmount.toString(),
        isPartial: isPartialRefund,
        gateway,
        gatewayRefundId: gatewayRefund.id || externalId,
      },
    })

    let bookingRef: { customerId: string; bookingNumber: string | null } | null = payment.booking
    if (!bookingRef) {
      bookingRef = await prisma.booking.findFirst({
        where: { id: payment.bookingId, deletedAt: null },
        select: { customerId: true, bookingNumber: true },
      })
    }
    if (!bookingRef) {
      throw new NotFoundError('Booking not found for payment refund')
    }

    await EventBus.emit('payment.refunded', {
      paymentId,
      bookingId: payment.bookingId,
      refundAmount: refundAmount.toString(),
      userId,
      customerId: bookingRef.customerId,
      bookingNumber: bookingRef.bookingNumber ?? undefined,
      notifyCustomer: true,
      timestamp: new Date(),
    })

    return updated
  }

  /**
   * Get payment by ID
   */
  static async getById(paymentId: string, userId: string) {
    const canView = await hasPermission(userId, 'payment.read' as any)
    if (!canView) {
      throw new ForbiddenError('You do not have permission to view payments')
    }

    const payment = await prisma.payment.findFirst({
      where: {
        id: paymentId,
        deletedAt: null,
      },
      include: {
        booking: {
          include: {
            customer: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
    })

    if (!payment) {
      throw new NotFoundError('Payment not found')
    }

    return payment
  }

  /**
   * Get payments for a booking
   */
  static async getByBookingId(bookingId: string, userId: string) {
    const canView = await hasPermission(userId, 'payment.read' as any)
    if (!canView) {
      throw new ForbiddenError('You do not have permission to view payments')
    }

    return prisma.payment.findMany({
      where: {
        bookingId,
        deletedAt: null,
      },
      include: {
        booking: {
          include: {
            customer: {
              select: {
                id: true,
                email: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })
  }

  /**
   * List payments with filters
   */
  static async list(
    userId: string,
    filters: {
      status?: PaymentStatus
      bookingId?: string
      customerId?: string
      dateFrom?: Date
      dateTo?: Date
      minAmount?: number
      maxAmount?: number
      hasRefund?: boolean
      page?: number
      pageSize?: number
    } = {}
  ) {
    const canView = await hasPermission(userId, 'payment.read' as any)
    if (!canView) {
      throw new ForbiddenError('You do not have permission to view payments')
    }

    const page = filters.page || 1
    const pageSize = filters.pageSize || 20
    const skip = (page - 1) * pageSize

    const where: any = {
      deletedAt: null,
    }

    if (filters.status) {
      where.status = filters.status
    }

    if (filters.bookingId) {
      where.bookingId = filters.bookingId
    }

    if (filters.customerId) {
      where.booking = {
        customerId: filters.customerId,
        deletedAt: null,
      }
    }

    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {}
      if (filters.dateFrom) {
        where.createdAt.gte = filters.dateFrom
      }
      if (filters.dateTo) {
        where.createdAt.lte = filters.dateTo
      }
    }

    if (filters.minAmount !== undefined || filters.maxAmount !== undefined) {
      where.amount = {}
      if (filters.minAmount !== undefined) {
        where.amount.gte = new Decimal(filters.minAmount)
      }
      if (filters.maxAmount !== undefined) {
        where.amount.lte = new Decimal(filters.maxAmount)
      }
    }

    if (filters.hasRefund !== undefined) {
      if (filters.hasRefund) {
        where.refundAmount = { not: null }
      } else {
        where.refundAmount = null
      }
    }

    const [payments, total, aggSuccess, aggPending, aggFailed, aggRefunded] = await Promise.all([
      prisma.payment.findMany({
        where,
        include: {
          booking: {
            include: {
              customer: {
                select: {
                  id: true,
                  email: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip,
        take: pageSize,
      }),
      prisma.payment.count({ where }),
      prisma.payment.aggregate({
        where: { ...where, status: PaymentStatus.SUCCESS },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: { ...where, status: PaymentStatus.PENDING },
        _sum: { amount: true },
      }),
      prisma.payment.count({
        where: { ...where, status: PaymentStatus.FAILED },
      }),
      prisma.payment.aggregate({
        where: { ...where, refundAmount: { not: null } },
        _sum: { refundAmount: true },
      }),
    ])

    const summary = {
      totalCollected: Number(aggSuccess._sum.amount ?? 0),
      pendingAmount: Number(aggPending._sum.amount ?? 0),
      failedCount: aggFailed,
      refundedTotal: Number(aggRefunded._sum.refundAmount ?? 0),
    }

    return {
      payments: payments.map((p) => ({
        id: p.id,
        bookingId: p.bookingId,
        amount: Number(p.amount),
        status: p.status,
        gateway: p.gateway || (p.tapChargeId || p.tapTransactionId ? 'tap' : null),
        externalId: p.externalId || p.tapChargeId || p.tapTransactionId || null,
        tapTransactionId: p.tapTransactionId,
        tapChargeId: p.tapChargeId,
        refundAmount: p.refundAmount ? Number(p.refundAmount) : null,
        refundReason: p.refundReason,
        booking: p.booking
          ? {
              id: p.booking.id,
              bookingNumber: p.booking.bookingNumber,
              customerId: p.booking.customerId,
              totalPrice: Number(p.booking.totalAmount),
              customer: p.booking.customer,
            }
          : null,
        createdAt: p.createdAt,
        updatedAt: p.updatedAt,
        createdBy: p.createdBy,
        updatedBy: p.updatedBy,
      })),
      total,
      page,
      pageSize,
      summary,
    }
  }

  /**
   * Verify Tap webhook signature
   */
  static async verifyWebhookSignature(payload: string, signature: string): Promise<boolean> {
    const secretKey = process.env.TAP_SECRET_KEY
    if (!secretKey) {
      return false
    }

    // Tap uses HMAC-SHA256 for webhook signature verification
    const { createHmac } = await import('crypto')
    const expected = createHmac('sha256', secretKey).update(payload).digest('hex')
    const sigLower = signature.toLowerCase()
    const expLower = expected.toLowerCase()

    // Timing-safe comparison to prevent timing attacks
    if (sigLower.length !== expLower.length) return false
    const { timingSafeEqual } = await import('crypto')
    return timingSafeEqual(Buffer.from(sigLower), Buffer.from(expLower))
  }
}
