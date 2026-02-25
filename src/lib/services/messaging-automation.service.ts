/**
 * @file messaging-automation.service.ts
 * @description Event-to-notification automation: finds rules by trigger and sends via configured channels.
 * @module lib/services/messaging-automation
 */

import { prisma } from '@/lib/db/prisma'
import { NotificationChannel } from '@prisma/client'
import { NotificationService } from '@/lib/services/notification.service'
import { renderTemplate } from '@/lib/services/template-renderer.service'
import { enqueueNotification } from '@/lib/services/notification-queue.service'

const EVENT_TO_TRIGGER: Record<string, string> = {
  'booking.created': 'BOOKING_CREATED',
  'booking.confirmed': 'BOOKING_CONFIRMED',
  'booking.cancelled': 'BOOKING_CANCELLED',
  'booking.updated': 'BOOKING_UPDATED',
  'booking.risk_check': 'BOOKING_REMINDER',
  'payment.success': 'PAYMENT_RECEIVED',
  'payment.failed': 'PAYMENT_FAILED',
  'payment.refunded': 'REFUND_PROCESSED',
  'contract.signed': 'REVIEW_REQUEST',
  'reminder.pickup_24h': 'PICKUP_REMINDER_24H',
  'reminder.pickup_3h': 'PICKUP_REMINDER_3H',
  'reminder.return_24h': 'RETURN_REMINDER_24H',
  'reminder.return_6h': 'RETURN_REMINDER_6H',
  'reminder.late_return': 'LATE_RETURN_WARNING',
}

function buildTemplateData(payload: Record<string, unknown>): Record<string, unknown> {
  const booking = payload.booking as Record<string, unknown> | undefined
  const data: Record<string, unknown> = {
    ...payload,
    customerName: booking?.customerId ?? payload.userId ?? 'Customer',
    bookingNumber: booking?.bookingNumber ?? payload.bookingNumber ?? '',
    bookingId: booking?.id ?? payload.bookingId ?? '',
    totalAmount: booking?.totalPrice ?? payload.amount ?? 0,
    amount: payload.amount ?? 0,
    dueDate: booking?.endDate ?? null,
    startDate: booking?.startDate ?? null,
    endDate: booking?.endDate ?? null,
  }
  return data
}

/**
 * Process an event: find matching automation rules and send notifications.
 */
export async function processEventForMessaging(
  eventName: string,
  payload: Record<string, unknown>
): Promise<void> {
  const trigger = EVENT_TO_TRIGGER[eventName]
  if (!trigger) return

  const rules = await prisma.automationRule.findMany({
    where: { trigger: trigger as never, isActive: true },
  })

  const templateData = buildTemplateData(payload)
  const userId = (payload.booking as { customerId?: string } | undefined)?.customerId ?? (payload.userId as string | undefined)

  for (const rule of rules) {
    const channels = (rule.channels as string[]) ?? []
    const templateId = rule.templateId
    const recipientType = rule.recipientType

    let subject: string | null = null
    let bodyText = ''
    let bodyHtml: string | null = null

    if (templateId) {
      const template = await prisma.notificationTemplate.findUnique({
        where: { id: templateId, isActive: true },
      })
      if (template) {
        const rendered = await renderTemplate(
          template.slug,
          template.language,
          templateData as Record<string, unknown>
        )
        if (rendered) {
          subject = rendered.subject
          bodyText = rendered.bodyText
          bodyHtml = rendered.bodyHtml
        }
      }
    }

    if (!bodyText && !subject) {
      const fallback = getFallbackMessage(eventName, payload)
      bodyText = fallback.message
      subject = fallback.title
    }

    if (recipientType === 'CUSTOMER' && userId) {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { email: true, phone: true },
      })
      for (const ch of channels) {
        if (ch === 'IN_APP') {
          await NotificationService.send({
            userId,
            channel: NotificationChannel.IN_APP,
            type: eventName,
            title: subject ?? 'Notification',
            message: bodyText,
            data: templateData,
          })
        } else if (ch === 'EMAIL' && user?.email) {
          enqueueNotification({
            channel: 'email',
            recipient: user.email,
            subject: subject ?? 'Notification',
            body: bodyHtml ?? bodyText,
            templateId: templateId ?? undefined,
            recipientUserId: userId,
          })
        } else if (ch === 'WHATSAPP' && user?.phone) {
          enqueueNotification({
            channel: 'whatsapp',
            recipient: user.phone,
            body: bodyText,
            templateId: templateId ?? undefined,
            recipientUserId: userId,
          })
        } else if (ch === 'SMS' && user?.phone) {
          enqueueNotification({
            channel: 'sms',
            recipient: user.phone,
            body: bodyText,
            templateId: templateId ?? undefined,
            recipientUserId: userId,
          })
        }
      }
    }

    if (recipientType === 'BUSINESS' || recipientType === 'WAREHOUSE') {
      const role = recipientType === 'WAREHOUSE' ? 'WAREHOUSE_MANAGER' : 'OWNER'
      const recipients = await prisma.businessRecipient.findMany({
        where: { role: role as never, isActive: true },
      })
      for (const rec of recipients) {
        const triggers = (rec.receiveTriggers as string[]) ?? []
        if (triggers.length && !triggers.includes(trigger)) continue
        const email = rec.email ?? undefined
        const phone = rec.whatsappNumber ?? rec.phone ?? undefined
        for (const ch of channels) {
          if (ch === 'EMAIL' && email) {
            enqueueNotification({
              channel: 'email',
              recipient: email,
              subject: subject ?? `[${trigger}] New event`,
              body: bodyHtml ?? bodyText,
            })
          } else if ((ch === 'WHATSAPP' || ch === 'SMS') && phone) {
            enqueueNotification({
              channel: ch === 'WHATSAPP' ? 'whatsapp' : 'sms',
              recipient: phone,
              body: bodyText,
            })
          }
        }
      }
    }
  }
}

function getFallbackMessage(
  eventName: string,
  payload: Record<string, unknown>
): { title: string; message: string } {
  const booking = payload.booking as { bookingNumber?: string } | undefined
  const num = booking?.bookingNumber ?? ''
  switch (eventName) {
    case 'booking.created':
      return { title: 'تم استلام طلبك', message: `تم استلام طلبك رقم ${num}. سنتواصل معك قريباً.` }
    case 'booking.confirmed':
      return { title: 'تم تأكيد الحجز', message: `تم تأكيد حجزك رقم ${num}.` }
    case 'booking.cancelled':
      return { title: 'تم إلغاء الحجز', message: `تم إلغاء حجزك رقم ${num}.` }
    case 'payment.success':
      return {
        title: 'تم استلام الدفع',
        message: `تم استلام دفعتك بنجاح. شكراً لتعاملك معنا.`,
      }
    case 'payment.failed':
      return { title: 'فشل الدفع', message: 'فشلت عملية الدفع. يرجى المحاولة مرة أخرى.' }
    default:
      return { title: 'إشعار', message: 'لديك إشعار جديد.' }
  }
}
