/**
 * @file event-bus.ts
 * @description Event bus for event-driven architecture
 * @module lib/events
 */

import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { AuditService } from '@/lib/services/audit.service'
import { publishAdminLive } from '@/lib/live-admin'
import { invalidateDashboardKpisCache } from '@/lib/services/dashboard.service'
import { NotificationService } from '@/lib/services/notification.service'
import { processEventForMessaging } from '@/lib/services/messaging-automation.service'
import { NotificationChannel, UserRole } from '@prisma/client'
import type {
  BookingEventPayload,
  DepositEventPayload,
  EventBookingRef,
  EventEquipmentRef,
  EventPaymentRef,
  PaymentEventPayload,
} from '@/lib/events/event-types'

export type EventName =
  | 'booking.created'
  | 'booking.updated'
  | 'booking.confirmed'
  | 'booking.cancelled'
  | 'booking.risk_check'
  | 'payment.created'
  | 'payment.success'
  | 'payment.failed'
  | 'payment.refund_requested'
  | 'payment.refunded'
  | 'contract.signed'
  | 'equipment.created'
  | 'equipment.updated'
  | 'warehouse.equipment.checked_out'
  | 'warehouse.equipment.checked_in'
  | 'delivery.scheduled'
  | 'delivery.status_updated'
  | 'quote.created'
  | 'quote.updated'
  | 'quote.converted'
  | 'quote.status_updated'
  | 'quote.deleted'
  | 'maintenance.created'
  | 'maintenance.updated'
  | 'maintenance.completed'
  | 'maintenance.deleted'
  | 'invoice.created'
  | 'invoice.updated'
  | 'invoice.payment_recorded'
  | 'invoice.deleted'
  | 'payment.created'
  | 'payment.success'
  | 'payment.failed'
  | 'payment.refunded'
  | 'contract.created'
  | 'contract.updated'
  | 'contract.signed'
  | 'contract.deleted'
  | 'client.created'
  | 'client.updated'
  | 'client.deleted'
  | 'coupon.created'
  | 'coupon.updated'
  | 'coupon.applied'
  | 'coupon.deleted'
  | 'marketing.campaign.created'
  | 'marketing.campaign.updated'
  | 'marketing.campaign.sent'
  | 'marketing.campaign.deleted'
  | 'marketing.event.created'
  | 'user.whale_sign_in'
  | 'user.referral_signup'
  | 'user.registered'
  | 'review.request'
  | 'review.submitted'
  | 'cart.abandoned'
  | 'warehouse.item_scanned'
  | 'payout.initiated'
  | 'payout.paid'
  | 'payout.failed'
  | 'payout.canceled'
  | 'payout.returned'
  | 'deposit.released'
  | 'deposit.forfeited'

export interface EventPayload {
  'booking.created': BookingEventPayload
  'booking.updated': BookingEventPayload & { timestamp: Date }
  'booking.confirmed': BookingEventPayload
  'booking.cancelled': BookingEventPayload
  'booking.risk_check': BookingEventPayload
  'payment.refund_requested': { payment: EventPaymentRef; userId: string }
  'equipment.created': { equipment: EventEquipmentRef; userId: string }
  'equipment.updated': { equipment: EventEquipmentRef; userId: string }
  'warehouse.equipment.checked_out': {
    bookingId: string
    equipmentIds: string[]
    checkedOutBy: string
    timestamp: Date
  }
  'warehouse.equipment.checked_in': {
    bookingId: string
    equipmentIds: string[]
    checkedInBy: string
    condition?: string
    timestamp: Date
  }
  'delivery.scheduled': {
    bookingId: string
    deliveryId?: string
    type: string
    scheduledDate: Date
    scheduledBy: string
    timestamp: Date
  }
  'delivery.status_updated': {
    deliveryId?: string
    bookingId: string
    status: string
    updatedBy: string
    timestamp: Date
  }
  'quote.created': {
    quoteId: string
    quoteNumber: string
    customerId: string
    createdBy: string
    timestamp: Date
  }
  'quote.updated': { quoteId: string; updatedBy: string; timestamp: Date }
  'quote.converted': {
    quoteId: string
    bookingId: string
    bookingNumber: string
    convertedBy: string
    timestamp: Date
  }
  'quote.status_updated': { quoteId: string; status: string; updatedBy: string; timestamp: Date }
  'quote.deleted': { quoteId: string; deletedBy: string; timestamp: Date }
  'maintenance.created': {
    maintenanceId: string
    equipmentId: string
    scheduledDate: Date
    createdBy: string
    timestamp: Date
  }
  'maintenance.updated': { maintenanceId: string; updatedBy: string; timestamp: Date }
  'maintenance.completed': {
    maintenanceId: string
    equipmentId: string
    completedBy: string
    timestamp: Date
  }
  'maintenance.deleted': { maintenanceId: string; deletedBy: string; timestamp: Date }
  'invoice.created': {
    invoiceId: string
    invoiceNumber: string
    bookingId: string | null
    customerId: string
    totalAmount: number
    createdBy: string
    timestamp: Date
  }
  'invoice.updated': { invoiceId: string; updatedBy: string; timestamp: Date }
  'invoice.payment_recorded': {
    invoiceId: string
    invoiceNumber: string
    amount: number
    remainingAmount: number
    recordedBy: string
    timestamp: Date
  }
  'invoice.deleted': { invoiceId: string; deletedBy: string; timestamp: Date }
  'payment.created': {
    paymentId: string
    bookingId: string
    amount: number
    userId: string
    timestamp: Date
  }
  'payment.success': {
    paymentId: string
    bookingId: string
    amount: string
    /** Customer who placed the order (never the admin/system actor). */
    customerId: string
    bookingNumber?: string
    userId: string
    timestamp: Date
  }
  'payment.failed': {
    paymentId: string
    bookingId: string
    reason?: string
    customerId: string
    bookingNumber?: string
    userId: string
    timestamp: Date
    /** [FIX 2] When false, staff still notified; customer in-app + WhatsApp suppressed */
    notifyCustomer?: boolean
  }
  'payment.refunded': {
    paymentId: string
    bookingId: string
    refundAmount: string
    userId: string
    customerId?: string
    bookingNumber?: string
    timestamp: Date
    notifyCustomer?: boolean
  }
  'payout.initiated': {
    moyasarPayoutId: string
    amount?: string
    currency?: string
    failureReason?: string
    userId: string
    timestamp: Date
  }
  'payout.paid': {
    moyasarPayoutId: string
    amount?: string
    currency?: string
    failureReason?: string
    userId: string
    timestamp: Date
  }
  'payout.failed': {
    moyasarPayoutId: string
    amount?: string
    currency?: string
    failureReason?: string
    userId: string
    timestamp: Date
  }
  'payout.canceled': {
    moyasarPayoutId: string
    amount?: string
    currency?: string
    failureReason?: string
    userId: string
    timestamp: Date
  }
  'payout.returned': {
    moyasarPayoutId: string
    amount?: string
    currency?: string
    failureReason?: string
    userId: string
    timestamp: Date
  }
  'deposit.released': DepositEventPayload
  'deposit.forfeited': DepositEventPayload
  'contract.created': {
    contractId: string
    bookingId: string
    termsVersion: string
    createdBy: string
    timestamp: Date
  }
  'contract.updated': { contractId: string; updatedBy: string; timestamp: Date }
  'contract.signed': { contractId: string; bookingId: string; signedBy: string; timestamp: Date }
  'contract.deleted': { contractId: string; deletedBy: string; timestamp: Date }
  'client.created': { clientId: string; email: string; createdBy: string; timestamp: Date }
  'client.updated': { clientId: string; updatedBy: string; timestamp: Date }
  'client.deleted': { clientId: string; deletedBy: string; timestamp: Date }
  'coupon.created': {
    couponId: string
    code: string
    type: string
    value: number
    createdBy: string
    timestamp: Date
  }
  'coupon.updated': { couponId: string; updatedBy: string; timestamp: Date }
  'coupon.applied': { couponId: string; code: string; appliedBy: string; timestamp: Date }
  'coupon.deleted': { couponId: string; deletedBy: string; timestamp: Date }
  'marketing.campaign.created': {
    campaignId: string
    name: string
    type: string
    createdBy: string
    timestamp: Date
  }
  'marketing.campaign.updated': { campaignId: string; updatedBy: string; timestamp: Date }
  'marketing.campaign.sent': {
    campaignId: string
    recipients: number
    sentBy: string
    timestamp: Date
  }
  'marketing.campaign.deleted': { campaignId: string; deletedBy: string; timestamp: Date }
  'marketing.event.created': {
    eventType: string
    sessionId: string | null
    userId?: string
    metadata?: any
    timestamp: Date
  }
  'user.whale_sign_in': { userId: string; timestamp: Date }
  'user.referral_signup': { userId: string; referralCode?: string; timestamp: Date }
  'user.registered': { userId: string; email: string; name?: string | null; timestamp: Date }
  'review.request': BookingEventPayload
  'review.submitted': { reviewId: string; userId: string; bookingId?: string }
  'cart.abandoned': { cartId: string; userId?: string; equipmentIds: string[] }
  'warehouse.item_scanned': { bookingId: string; equipmentId: string; sku: string; mode: string; timestamp: Date }
}

export class EventBus {
  /**
   * Emit an event
   */
  static async emit<T extends EventName>(event: T, payload: EventPayload[T]): Promise<void> {
    const p = payload as any
    // 1. Store event in database
    const eventRecord = await prisma.event.create({
      data: {
        eventName: event,
        payload: p,
        userId: 'userId' in p ? p.userId : undefined,
        resourceType: this.getResourceType(event),
        resourceId: this.getResourceId(p),
        timestamp: new Date(),
        status: 'PENDING',
      },
    })

    // 2. Log to audit
    await AuditService.log({
      action: `event.${event}`,
      userId: 'userId' in payload ? (payload as any).userId : undefined,
      resourceType: eventRecord.resourceType || undefined,
      resourceId: eventRecord.resourceId || undefined,
      metadata: { eventId: eventRecord.id, payload },
    })

    // 3. Mark as processed (handlers will be implemented later)
    await prisma.event.update({
      where: { id: eventRecord.id },
      data: {
        status: 'PROCESSED',
        processedAt: new Date(),
      },
    })

    if (
      event.startsWith('booking.') ||
      event.startsWith('payment.') ||
      event.startsWith('payout.') ||
      event === 'invoice.payment_recorded'
    ) {
      invalidateDashboardKpisCache().catch((e) =>
        // [FIX 7]
        logger.error('[EventBus] dashboard cache invalidation error', {
          eventType: event,
          error: e instanceof Error ? e.message : String(e),
          stack: e instanceof Error ? e.stack : undefined,
        })
      )
    }

    // 4. Publish to admin live stream (Redis) for real-time dashboard
    const resourceType = this.getResourceType(event)
    const resourceId = this.getResourceId(payload)
    publishAdminLive(event, {
      resourceType: resourceType ?? undefined,
      resourceId: resourceId ?? undefined,
      eventId: eventRecord.id,
    })

    // 5. Auto-create in-app notifications (fire-and-forget)
    this.createNotification(event, payload).catch((e) =>
      // [FIX 7]
      logger.error('[EventBus] notification error', {
        eventType: event,
        bookingId: (payload as { bookingId?: string }).bookingId,
        error: e instanceof Error ? e.message : String(e),
        stack: e instanceof Error ? e.stack : undefined,
      })
    )

    // 6. Messaging automation: rules + templates + multi-channel (fire-and-forget)
    processEventForMessaging(event, payload as Record<string, unknown>).catch((e) =>
      // [FIX 7]
      logger.error('[EventBus] messaging automation error', {
        eventType: event,
        bookingId: (payload as { bookingId?: string }).bookingId,
        error: e instanceof Error ? e.message : String(e),
        stack: e instanceof Error ? e.stack : undefined,
      })
    )

    this.notifyAdminEmailForEvent(event, payload).catch((e) =>
      logger.error('[EventBus] admin email notification error', {
        eventType: event,
        error: e instanceof Error ? e.message : String(e),
      })
    )

    this.sendInvoiceEmailForEvent(event, payload).catch((e) =>
      logger.error('[EventBus] invoice email error', {
        eventType: event,
        error: e instanceof Error ? e.message : String(e),
      })
    )
  }

  private static async sendInvoiceEmailForEvent(
    event: EventName,
    payload: unknown
  ): Promise<void> {
    if (event !== 'invoice.created') return
    const p = payload as { invoiceId?: string }
    if (!p.invoiceId) return

    const { EmailService } = await import('@/lib/services/email.service')
    await EmailService.sendInvoiceCreatedEmail({ invoiceId: p.invoiceId })
  }

  private static async notifyAdminEmailForEvent(event: EventName, payload: unknown): Promise<void> {
    const p = payload as {
      booking?: { id?: string; bookingNumber?: string }
      bookingId?: string
      amount?: string | number
    }

    if (event !== 'booking.confirmed' && event !== 'payment.success') return

    const bookingId = p.booking?.id ?? p.bookingId
    if (!bookingId) return

    const { OrderNotificationService } = await import('@/lib/services/order-notification.service')
    if (event === 'booking.confirmed') {
      await OrderNotificationService.notifyPaymentConfirmedExtraEmails(
        bookingId,
        Number(p.amount ?? 0)
      )
      return
    }

    await OrderNotificationService.notifyPaymentConfirmedExtraEmails(
      bookingId,
      Number(p.amount ?? 0)
    )
  }

  private static async createNotification(event: EventName, payload: any): Promise<void> {
    const p = payload as any

    if (event === 'user.registered') {
      const staff = await prisma.user.findMany({
        where: {
          deletedAt: null,
          role: { in: ['ADMIN', 'SALES_MANAGER', 'CUSTOMER_SERVICE'] },
        },
        select: { id: true },
        take: 50,
      })
      const label = p.name || p.email || 'عميل جديد'
      await Promise.all(
        staff.map((u) =>
          NotificationService.send({
            userId: u.id,
            channel: NotificationChannel.IN_APP,
            type: 'user.registered',
            title: 'تسجيل عميل جديد',
            message: `انضم ${label} (${p.email})`,
            data: { userId: p.userId },
          })
        )
      )
      return
    }

    const recipientUserId =
      event === 'payment.success' ||
      event === 'payment.failed' ||
      event === 'payment.refunded'
        ? p.customerId ?? p.booking?.customerId
        : p.booking?.customerId ?? p.userId

    if (
      event === 'payment.success' ||
      event === 'payment.failed' ||
      event === 'payment.refunded'
    ) {
      const skipCustomerInApp =
        (event === 'payment.failed' && p.notifyCustomer === false) ||
        (event === 'payment.refunded' && p.notifyCustomer === false)
      const PAYMENT_CUSTOMER_MAP: Record<
        'payment.success' | 'payment.failed' | 'payment.refunded',
        { title: string; message: (d: any) => string }
      > = {
        'payment.success': {
          title: 'تم الدفع بنجاح',
          message: (d) => {
            const orderRef = d.bookingNumber ?? d.bookingId ?? ''
            const orderPart = orderRef ? ` للطلب ${orderRef}` : ''
            return `تم استلام دفعتك بمبلغ ${d.amount ?? ''} ر.س.${orderPart}.`
          },
        },
        'payment.failed': {
          title: 'فشل الدفع',
          message: () => 'فشلت عملية الدفع. يرجى المحاولة مرة أخرى.',
        },
        'payment.refunded': {
          title: 'تم استرداد المبلغ',
          message: (d) =>
            `تم استرداد مبلغ ${d.refundAmount ?? ''} ر.س. للطلب ${d.bookingNumber ?? d.bookingId ?? ''}.`,
        },
      }
      const payTpl = PAYMENT_CUSTOMER_MAP[event]
      if (
        !skipCustomerInApp &&
        recipientUserId &&
        recipientUserId !== 'system' &&
        payTpl
      ) {
        const bookingId = p.booking?.id ?? p.bookingId ?? null
        await NotificationService.send({
          userId: recipientUserId,
          channel: NotificationChannel.IN_APP,
          type: event,
          title: payTpl.title,
          message: payTpl.message(p),
          data: bookingId
            ? { bookingId, bookingNumber: p.bookingNumber, paymentId: p.paymentId }
            : p.paymentId
              ? { paymentId: p.paymentId, bookingNumber: p.bookingNumber }
              : undefined,
        })
      }
      await EventBus.notifyStaffPaymentEvent(event, p)
      return
    }

    if (!recipientUserId || recipientUserId === 'system') return

    const NOTIFICATION_MAP: Record<string, { title: string; message: (p: any) => string }> = {
      'booking.created': {
        title: 'تم إنشاء الحجز',
        message: (d) =>
          `تم إنشاء حجزك رقم ${d.booking?.bookingNumber ?? ''} بنجاح. في انتظار الدفع.`,
      },
      'booking.confirmed': {
        title: 'تم تأكيد الحجز',
        message: (d) => `تم تأكيد حجزك رقم ${d.booking?.bookingNumber ?? ''}.`,
      },
      'booking.cancelled': {
        title: 'تم إلغاء الحجز',
        message: (d) => `تم إلغاء حجزك رقم ${d.booking?.bookingNumber ?? ''}.`,
      },
      'contract.signed': {
        title: 'تم توقيع العقد',
        message: () => 'تم توقيع العقد بنجاح.',
      },
    }

    const template = NOTIFICATION_MAP[event]
    if (!template) return

    if (event === 'booking.created' || event === 'booking.cancelled') {
      await EventBus.notifyStaffBookingEvent(event, p)
    }

    // Unpaid checkout still creates a DB row for payment metadata; do not tell the customer
    // the booking is "created" until it leaves the pre-payment workflow.
    if (event === 'booking.created') {
      const st = p.booking?.status as string | undefined
      if (
        st === 'DRAFT' ||
        st === 'RISK_CHECK' ||
        st === 'PAYMENT_PENDING'
      ) {
        return
      }
    }

    const bookingId = p.booking?.id ?? p.bookingId ?? null

    await NotificationService.send({
      userId: recipientUserId,
      channel: NotificationChannel.IN_APP,
      type: event,
      title: template.title,
      message: template.message(p),
      data: bookingId
        ? { bookingId, bookingNumber: p.bookingNumber, paymentId: p.paymentId }
        : p.paymentId
          ? { paymentId: p.paymentId, bookingNumber: p.bookingNumber }
          : undefined,
    })
  }

  private static async notifyStaffBookingEvent(
    event: 'booking.created' | 'booking.cancelled',
    p: {
      booking?: {
        id?: string
        bookingNumber?: string
        customerId?: string
        status?: string
      }
    }
  ): Promise<void> {
    const staff = await prisma.user.findMany({
      where: {
        deletedAt: null,
        role: { notIn: [UserRole.CUSTOMER, UserRole.VENDOR] },
      },
      select: { id: true },
    })
    if (staff.length === 0) return

    const orderRef = p.booking?.bookingNumber ?? p.booking?.id ?? ''
    const isCreated = event === 'booking.created'

    await prisma.notification.createMany({
      data: staff.map((u) => ({
        userId: u.id,
        channel: NotificationChannel.IN_APP,
        type: isCreated ? 'admin.order.received' : 'admin.booking.cancelled',
        title: isCreated ? 'طلب جديد' : 'تم إلغاء الطلب',
        message: isCreated ? `تم استلام طلب جديد ${orderRef}.` : `تم إلغاء الطلب ${orderRef}.`,
        data: {
          bookingId: p.booking?.id,
          bookingNumber: p.booking?.bookingNumber,
          customerId: p.booking?.customerId,
          status: p.booking?.status,
        },
      })),
    })
  }

  /**
   * In-app alerts for control-panel users (non-customer roles) when a payment succeeds or fails.
   */
  private static async notifyStaffPaymentEvent(
    event: 'payment.success' | 'payment.failed' | 'payment.refunded',
    p: {
      paymentId?: string
      bookingId?: string
      bookingNumber?: string
      amount?: string
      refundAmount?: string
      customerId?: string
    }
  ): Promise<void> {
    const staff = await prisma.user.findMany({
      where: {
        deletedAt: null,
        role: { notIn: [UserRole.CUSTOMER, UserRole.VENDOR] },
      },
      select: { id: true },
    })
    if (staff.length === 0) return

    const orderRef = p.bookingNumber ?? p.bookingId ?? ''
    const isSuccess = event === 'payment.success'
    const isRefund = event === 'payment.refunded'
    const title = isSuccess ? 'دفعة جديدة' : isRefund ? 'استرداد دفع' : 'فشل دفع'
    const message = isSuccess
      ? `تم استلام دفع للطلب ${orderRef}${p.amount ? ` — ${p.amount} ر.س.` : ''}.`
      : isRefund
        ? `استرداد للطلب ${orderRef}${p.refundAmount ? ` — ${p.refundAmount} ر.س.` : ''}.`
        : `فشل دفع للطلب ${orderRef}.`

    const notifType = isSuccess
      ? 'admin.payment.received'
      : isRefund
        ? 'admin.payment.refunded'
        : 'admin.payment.failed'

    await prisma.notification.createMany({
      data: staff.map((u) => ({
        userId: u.id,
        channel: NotificationChannel.IN_APP,
        type: notifType,
        title,
        message,
        data: {
          bookingId: p.bookingId,
          bookingNumber: p.bookingNumber,
          paymentId: p.paymentId,
          customerId: p.customerId,
        },
      })),
    })
  }

  private static getResourceType(event: EventName): string | null {
    if (event.startsWith('booking.')) return 'booking'
    if (event.startsWith('payment.')) return 'payment'
    if (event.startsWith('payout.')) return 'payout'
    if (event.startsWith('contract.')) return 'contract'
    if (event.startsWith('equipment.')) return 'equipment'
    if (event.startsWith('marketing.')) return 'marketing_event'
    return null
  }

  private static getResourceId(payload: any): string | null {
    if (payload.booking?.id) return payload.booking.id
    if (payload.moyasarPayoutId) return payload.moyasarPayoutId
    if (payload.paymentId) return payload.paymentId
    if (payload.payment?.id) return payload.payment.id
    if (payload.contract?.id) return payload.contract.id
    if (payload.equipment?.id) return payload.equipment.id
    return null
  }

  /**
   * Process a single event by ID
   */
  static async processEvent(eventId: string): Promise<void> {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
    })

    if (!event || event.status === 'PROCESSED') {
      return
    }

    // Process event handlers (to be implemented)
    // For now, just mark as processed
    await prisma.event.update({
      where: { id: eventId },
      data: {
        status: 'PROCESSED',
        processedAt: new Date(),
      },
    })
  }
}
