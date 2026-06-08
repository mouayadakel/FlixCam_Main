/**
 * Payment & financial cron jobs.
 */

import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { MoyasarClient } from '@/lib/integrations/moyasar/client'
import { PaymentService } from '@/lib/services/payment.service'
import { InvoiceService } from '@/lib/services/invoice.service'
import { enqueueNotification } from '@/lib/services/notification-queue.service'
import { PaymentGatewayConfigService } from '@/lib/services/payment-gateway-config.service'
import {
  cronRetryDelayMs,
  getCronActorId,
  parsePaymentMetadata,
  wrapCronJob,
} from './cron-utils'

const MAX_PAYMENT_RETRIES = 4

export const runPaymentRetry = wrapCronJob('payment-retry', async () => {
  const now = Date.now()
  const payments = await prisma.payment.findMany({
    where: {
      deletedAt: null,
      gateway: 'moyasar',
      status: { in: ['PENDING', 'FAILED', 'PROCESSING'] },
      createdAt: { gte: new Date(now - 7 * 24 * 60 * 60_000) },
    },
    include: {
      booking: { select: { id: true, customerId: true, bookingNumber: true } },
    },
    take: 100,
    orderBy: { updatedAt: 'asc' },
  })

  let retried = 0
  let reconciled = 0
  let skipped = 0
  let notified = 0

  const config = await PaymentGatewayConfigService.getConfig('moyasar')
  const secretKey = process.env.MOYASAR_SECRET_KEY?.trim() || config?.secretKey
  const client = secretKey ? new MoyasarClient(secretKey) : null

  for (const payment of payments) {
    const meta = parsePaymentMetadata(payment.metadata)
    const retryCount = Number(meta.cronRetryCount ?? 0)
    const lastRetryAt = meta.lastCronRetryAt ? new Date(String(meta.lastCronRetryAt)).getTime() : 0

    if (retryCount >= MAX_PAYMENT_RETRIES) {
      skipped++
      continue
    }
    if (lastRetryAt && now - lastRetryAt < cronRetryDelayMs(retryCount)) {
      skipped++
      continue
    }

    retried++

    if (payment.externalId && client) {
      try {
        const remote = await client.getPayment(payment.externalId)
        await PaymentService.handleGatewayWebhook('moyasar', {
          type: `payment.${remote.status}`,
          bookingId: payment.bookingId,
          amount: remote.amount,
          externalId: remote.id,
        })
        reconciled++
      } catch (err) {
        logger.warn('payment-retry: Moyasar fetch failed', {
          paymentId: payment.id,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    const customer = await prisma.user.findFirst({
      where: { id: payment.booking.customerId },
      select: { email: true, phone: true },
    })

    if (customer?.email) {
      enqueueNotification({
        channel: 'email',
        recipient: customer.email,
        subject: `Payment retry — Booking ${payment.booking.bookingNumber}`,
        body: `Please complete payment for booking ${payment.booking.bookingNumber} to confirm your rental.`,
        priority: 'high',
        recipientUserId: payment.booking.customerId,
      })
      notified++
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        metadata: {
          ...meta,
          cronRetryCount: retryCount + 1,
          lastCronRetryAt: new Date().toISOString(),
        },
      },
    })
  }

  return { scanned: payments.length, retried, reconciled, skipped, notified }
})

export const runMonthlyInvoices = wrapCronJob('monthly-invoices', async () => {
  const now = new Date()
  const periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const periodEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)

  const closedBookings = await prisma.booking.findMany({
    where: {
      deletedAt: null,
      status: { in: ['CLOSED', 'RETURNED'] },
      endDate: { gte: periodStart, lte: periodEnd },
      invoices: { none: { deletedAt: null } },
    },
    select: { id: true },
    take: 200,
  })

  let generated = 0
  let failed = 0

  for (const booking of closedBookings) {
    try {
      await InvoiceService.autoGenerateForBooking(booking.id)
      generated++
    } catch (err) {
      failed++
      logger.warn('monthly-invoices: generation failed', {
        bookingId: booking.id,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  const recurring = await prisma.recurringSeries.findMany({
    where: { isActive: true, deletedAt: null },
    select: { id: true, customerId: true, name: true },
  })

  return {
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    generated,
    failed,
    activeRecurringSeries: recurring.length,
  }
})

export const runWalletSettlements = wrapCronJob('wallet-settlements', async () => {
  const actorId = await getCronActorId()

  const pendingPayouts = await prisma.vendorPayout.findMany({
    where: { status: 'PENDING' },
    include: {
      vendor: { select: { companyName: true } },
    },
    take: 100,
  })

  let reviewed = 0
  let flagged = 0

  for (const payout of pendingPayouts) {
    reviewed++
    if (payout.bookingId) {
      const booking = await prisma.booking.findFirst({
        where: { id: payout.bookingId, deletedAt: null },
        select: { status: true },
      })
      if (booking && !['CLOSED', 'RETURNED'].includes(booking.status)) {
        flagged++
        continue
      }
    }
    const autoApprove = process.env.WALLET_AUTO_APPROVE_PAYOUTS === 'true'
    if (autoApprove) {
      await prisma.vendorPayout.update({
        where: { id: payout.id },
        data: { status: 'PROCESSING', notes: 'Auto-approved by wallet-settlements cron' },
      })
    }

    await prisma.auditLog.create({
      data: {
        action: 'cron.payout.ready_for_settlement',
        userId: actorId,
        resourceType: 'VendorPayout',
        resourceId: payout.id,
        metadata: {
          vendor: payout.vendor.companyName,
          netAmount: payout.netAmount.toString(),
          autoApproved: autoApprove,
        },
      },
    })
  }

  const ledgerImbalance = await prisma.ledgerEntry.groupBy({
    by: ['account'],
    _sum: { amount: true },
  })

  return {
    pendingPayouts: pendingPayouts.length,
    reviewed,
    flagged,
    ledgerAccounts: ledgerImbalance.length,
  }
})

export const runPaymentReconciliation = wrapCronJob('payment-reconciliation', async () => {
  const since = new Date(Date.now() - 24 * 60 * 60_000)

  const payments = await prisma.payment.findMany({
    where: {
      deletedAt: null,
      gateway: 'moyasar',
      status: 'SUCCESS',
      updatedAt: { gte: since },
    },
    select: { id: true, amount: true, bookingId: true, externalId: true, reconciledAt: true },
  })

  let matched = 0
  let mismatches = 0
  let marked = 0

  for (const payment of payments) {
    const ledger = await prisma.ledgerEntry.findFirst({
      where: {
        paymentId: payment.id,
        account: 'REVENUE',
        type: 'CREDIT',
      },
    })

    if (!ledger) {
      mismatches++
      await prisma.auditLog.create({
        data: {
          action: 'cron.payment.reconciliation_mismatch',
          resourceType: 'Payment',
          resourceId: payment.id,
          metadata: {
            reason: 'missing_ledger_entry',
            amount: payment.amount.toString(),
            externalId: payment.externalId,
          },
        },
      })
      continue
    }

    const ledgerAmt = Number(ledger.amount)
    const paymentAmt = Number(payment.amount)
    if (Math.abs(ledgerAmt - paymentAmt) > 0.01) {
      mismatches++
      await prisma.auditLog.create({
        data: {
          action: 'cron.payment.reconciliation_mismatch',
          resourceType: 'Payment',
          resourceId: payment.id,
          metadata: {
            reason: 'amount_mismatch',
            paymentAmount: paymentAmt,
            ledgerAmount: ledgerAmt,
          },
        },
      })
      continue
    }

    matched++
    if (!payment.reconciledAt) {
      await prisma.payment.update({
        where: { id: payment.id },
        data: { reconciledAt: new Date() },
      })
      marked++
    }
  }

  return { scanned: payments.length, matched, mismatches, markedReconciled: marked }
})
