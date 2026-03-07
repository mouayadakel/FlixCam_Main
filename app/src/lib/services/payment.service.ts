/**
 * @file payment.service.ts
 * @description Payment service with Tap Payments integration
 * @module lib/services/payment
 */

import { prisma } from '@/lib/db/prisma'
import { AuditService } from './audit.service'
import { BookingService } from './booking.service'
import { EventBus } from '@/lib/events/event-bus'
import { NotFoundError, ValidationError, ForbiddenError } from '@/lib/errors'
import { hasPermission } from '@/lib/auth/permissions'
import { PaymentStatus, BookingStatus } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

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

export class PaymentService {
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
        tapTransactionId: input.tapTransactionId,
        tapChargeId: input.tapChargeId,
        updatedBy: input.userId,
      },
    })

    // Update booking to CONFIRMED
    if (payment.booking.status === BookingStatus.PAYMENT_PENDING) {
      await BookingService.transitionState(payment.bookingId, BookingStatus.CONFIRMED, input.userId)
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
    event: { type: string; bookingId?: string; amount?: number; externalId?: string }
  ): Promise<void> {
    const bookingId = event.bookingId
    if (!bookingId) return

    const successTypes = ['charge.succeeded', 'payment_paid', 'payment.paid', 'paid', 'captured']
    const isSuccess = successTypes.some((t) => event.type?.toLowerCase().includes(t) || event.type === t)
    const rawAmount = event.amount != null ? Number(event.amount) : 0
    const amount = rawAmount >= 100 ? rawAmount / 100 : rawAmount

    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, deletedAt: null },
      select: { id: true, status: true },
    })
    if (!booking) return

    const existing = await prisma.payment.findFirst({
      where: { bookingId, deletedAt: null, status: PaymentStatus.SUCCESS },
    })
    if (existing) return

    await prisma.payment.create({
      data: {
        bookingId,
        amount: new Decimal(amount || 0),
        status: isSuccess ? PaymentStatus.SUCCESS : PaymentStatus.FAILED,
        tapTransactionId: event.externalId ?? undefined,
        tapChargeId: slug === 'tap' ? event.externalId ?? undefined : undefined,
        createdBy: 'system',
      },
    })

    if (isSuccess && booking.status === BookingStatus.PAYMENT_PENDING) {
      try {
        await BookingService.transitionState(bookingId, BookingStatus.CONFIRMED, 'system')
      } catch (e) {
        console.error('handleGatewayWebhook transition error:', e)
      }
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
      userId,
      timestamp: new Date(),
    })

    return updated
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

    // Process refund via Tap API
    const metadata = approval.metadata as Record<string, any> | null
    const refundAmount = metadata?.refundAmount
      ? new Decimal(metadata.refundAmount as string)
      : payment.amount

    const isPartialRefund = refundAmount.lessThan(payment.amount)

    const updated = await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: isPartialRefund ? PaymentStatus.PARTIALLY_REFUNDED : PaymentStatus.REFUNDED,
        refundAmount,
        refundReason: approval.reason || undefined,
        updatedBy: userId,
      },
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
      },
    })

    await EventBus.emit('payment.refunded', {
      paymentId,
      bookingId: payment.bookingId,
      refundAmount: refundAmount.toString(),
      userId,
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
