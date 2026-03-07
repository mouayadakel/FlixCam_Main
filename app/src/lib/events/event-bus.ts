/**
 * @file event-bus.ts
 * @description Event bus for event-driven architecture
 * @module lib/events
 */

import { prisma } from '@/lib/db/prisma'
import { AuditService } from '@/lib/services/audit.service'
import { publishAdminLive } from '@/lib/live-admin'
import { NotificationService } from '@/lib/services/notification.service'
import { processEventForMessaging } from '@/lib/services/messaging-automation.service'
import { NotificationChannel } from '@prisma/client'

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

export interface EventPayload {
  'booking.created': { booking: any; userId: string }
  'booking.updated': { booking: any; userId: string; timestamp: Date }
  'booking.confirmed': { booking: any; userId: string }
  'booking.cancelled': { booking: any; userId: string }
  'booking.risk_check': { booking: any; userId: string }
  'payment.refund_requested': { payment: any; userId: string }
  'equipment.created': { equipment: any; userId: string }
  'equipment.updated': { equipment: any; userId: string }
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
    userId: string
    timestamp: Date
  }
  'payment.failed': {
    paymentId: string
    bookingId: string
    reason?: string
    userId: string
    timestamp: Date
  }
  'payment.refunded': {
    paymentId: string
    bookingId: string
    refundAmount: string
    userId: string
    timestamp: Date
  }
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
}

export class EventBus {
  /**
   * Emit an event
   */
  static async emit<T extends EventName>(event: T, payload: EventPayload[T]): Promise<void> {
    // 1. Store event in database
    const eventRecord = await prisma.event.create({
      data: {
        eventName: event,
        payload: payload as any,
        userId: 'userId' in payload ? (payload as any).userId : undefined,
        resourceType: this.getResourceType(event),
        resourceId: this.getResourceId(payload),
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
      console.error('[EventBus] notification error:', e)
    )

    // 6. Messaging automation: rules + templates + multi-channel (fire-and-forget)
    processEventForMessaging(event, payload as Record<string, unknown>).catch((e) =>
      console.error('[EventBus] messaging automation error:', e)
    )
  }

  private static async createNotification(event: EventName, payload: any): Promise<void> {
    const p = payload as any
    const userId = p.booking?.customerId ?? p.userId
    if (!userId) return

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
      'payment.success': {
        title: 'تم الدفع بنجاح',
        message: (d) => `تم استلام دفعتك بمبلغ ${d.amount ?? ''} ر.س.`,
      },
      'payment.failed': {
        title: 'فشل الدفع',
        message: () => 'فشلت عملية الدفع. يرجى المحاولة مرة أخرى.',
      },
      'contract.signed': {
        title: 'تم توقيع العقد',
        message: () => 'تم توقيع العقد بنجاح.',
      },
    }

    const template = NOTIFICATION_MAP[event]
    if (!template) return

    const bookingId = p.booking?.id ?? p.bookingId ?? null

    await NotificationService.send({
      userId,
      channel: NotificationChannel.IN_APP,
      type: event,
      title: template.title,
      message: template.message(p),
      data: bookingId ? { bookingId } : undefined,
    })
  }

  private static getResourceType(event: EventName): string | null {
    if (event.startsWith('booking.')) return 'booking'
    if (event.startsWith('payment.')) return 'payment'
    if (event.startsWith('contract.')) return 'contract'
    if (event.startsWith('equipment.')) return 'equipment'
    return null
  }

  private static getResourceId(payload: any): string | null {
    if (payload.booking?.id) return payload.booking.id
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
