/**
 * @file whatsapp-reminder.service.ts
 * @description Service for scheduling and triggering automated WhatsApp notifications for booking pickups, returns, and overdue alerts
 * @module lib/services/whatsapp-reminder
 */

import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { customerAllowsWhatsApp } from '@/lib/checkout/notification-opt-in'
import { WhatsAppService } from './whatsapp.service'

export class WhatsAppReminderService {
  /**
   * Send pickup reminders to customers starting in 24 to 28 hours (CONFIRMED status)
   */
  static async sendPickupReminders(): Promise<{ sent: number; skipped: number }> {
    let sentCount = 0
    let skippedCount = 0

    try {
      const now = new Date()
      const minStart = new Date(now.getTime() + 24 * 60 * 60 * 1000)
      const maxStart = new Date(now.getTime() + 28 * 60 * 60 * 1000)

      const bookings = await prisma.booking.findMany({
        where: {
          status: 'CONFIRMED',
          startDate: {
            gte: minStart,
            lte: maxStart,
          },
          deletedAt: null,
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              whatsappOptIn: true,
            },
          },
        },
      })

      for (const booking of bookings) {
        if (!booking.customer?.phone) {
          skippedCount++
          continue
        }

        if (
          !customerAllowsWhatsApp({
            checkoutFormData: booking.checkoutFormData,
            whatsappOptIn: booking.customer.whatsappOptIn,
          })
        ) {
          skippedCount++
          continue
        }

        const phone = booking.customer.phone.trim()
        const customerName = booking.customer.name || 'عميل فليكس كام'
        const bookingNum = booking.bookingNumber

        // Check if we already sent a pickup reminder to prevent duplicates
        const alreadySent = await prisma.messageLog.findFirst({
          where: {
            channel: 'WHATSAPP',
            recipientUserId: booking.customer.id,
            body: {
              contains: `تذكير استلام الحجز #${bookingNum}`,
            },
          },
        })

        if (alreadySent) {
          skippedCount++
          continue
        }

        const pickupDateStr = booking.startDate.toLocaleDateString('ar-SA')
        const pickupTimeStr = booking.startDate.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })

        // Gorgeous Bilingual Message Template
        const messageText = 
`🔔 *تذكير استلام الحجز / Rental Pickup Reminder* 🔔

مرحباً ${customerName}،
نود تذكيرك بموعد استلام معدات الحجز الخاص بك غداً:
🎥 *رقم الحجز:* #${bookingNum}
📅 *تاريخ الاستلام:* ${pickupDateStr}
⏰ *الوقت:* ${pickupTimeStr}
📍 *الموقع:* الرياض، المملكة العربية السعودية

---

Dear ${booking.customer.name || 'Valued Client'},
This is a friendly reminder for your upcoming rental pickup tomorrow:
🎥 *Booking Number:* #${bookingNum}
📅 *Pickup Date:* ${booking.startDate.toLocaleDateString('en-US')}
⏰ *Time:* ${booking.startDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}

يرجى إحضار الهوية الوطنية أو الإقامة عند الاستلام للتوقيع الرقمي على العقد.
Please bring your ID/Iqama for electronic contract signature.

*فريق فليكس كام | FlixCam Team*`

        const result = await WhatsAppService.sendWhatsAppText(phone, messageText, {
          logToMessageLog: true,
          recipientUserId: booking.customer.id,
          templateId: 'pickup_reminder_v1',
        })

        if (result.ok) {
          sentCount++
        } else {
          logger.error('[WhatsAppReminderService] Failed to send pickup reminder', { bookingId: booking.id, error: result.error })
        }
      }
    } catch (error: any) {
      logger.error('[WhatsAppReminderService] sendPickupReminders error', { error: error.message })
    }

    return { sent: sentCount, skipped: skippedCount }
  }

  /**
   * Send return reminders to active rentals ending in 2 to 4 hours (ACTIVE status)
   */
  static async sendReturnReminders(): Promise<{ sent: number; skipped: number }> {
    let sentCount = 0
    let skippedCount = 0

    try {
      const now = new Date()
      const minEnd = new Date(now.getTime() + 2 * 60 * 60 * 1000)
      const maxEnd = new Date(now.getTime() + 4 * 60 * 60 * 1000)

      const bookings = await prisma.booking.findMany({
        where: {
          status: 'ACTIVE',
          endDate: {
            gte: minEnd,
            lte: maxEnd,
          },
          deletedAt: null,
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              whatsappOptIn: true,
            },
          },
        },
      })

      for (const booking of bookings) {
        if (!booking.customer?.phone) {
          skippedCount++
          continue
        }

        if (
          !customerAllowsWhatsApp({
            checkoutFormData: booking.checkoutFormData,
            whatsappOptIn: booking.customer.whatsappOptIn,
          })
        ) {
          skippedCount++
          continue
        }

        const phone = booking.customer.phone.trim()
        const customerName = booking.customer.name || 'عميل فليكس كام'
        const bookingNum = booking.bookingNumber

        // Prevent duplicate checks
        const alreadySent = await prisma.messageLog.findFirst({
          where: {
            channel: 'WHATSAPP',
            recipientUserId: booking.customer.id,
            body: {
              contains: `تذكير موعد إرجاع الحجز #${bookingNum}`,
            },
          },
        })

        if (alreadySent) {
          skippedCount++
          continue
        }

        const returnTimeStr = booking.endDate.toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' })

        // Bilingual Return Checklist Message
        const messageText = 
`📦 *تذكير إرجاع المعدات / Rental Return Reminder* 📦

مرحباً ${customerName}،
نود تذكيرك باقتراب موعد إرجاع معدات الحجز الخاص بك اليوم:
🎥 *رقم الحجز:* #${bookingNum}
⏰ *وقت الإرجاع:* ${returnTimeStr}

⚠️ *قائمة التحقق الهامة قبل الإرجاع / Return Checklist:*
1. التأكد من إرجاع جميع الكوابل والشواحن الأصلية.
2. التحقق من وجود البطاقات الذاكرة (Memory Cards) وحقائب الحماية.
3. تنظيف العدسات ووضع الأغطية الواقية عليها.

---

Dear ${booking.customer.name || 'Valued Client'},
Your equipment rental is due for return today:
🎥 *Booking Number:* #${bookingNum}
⏰ *Return Time:* ${booking.endDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}

Please make sure all cables, batteries, memory cards, and protective bags are returned safely to prevent late fee charges.

*فريق فليكس كام | FlixCam Team*`

        const result = await WhatsAppService.sendWhatsAppText(phone, messageText, {
          logToMessageLog: true,
          recipientUserId: booking.customer.id,
          templateId: 'return_reminder_v1',
        })

        if (result.ok) {
          sentCount++
        } else {
          logger.error('[WhatsAppReminderService] Failed to send return reminder', { bookingId: booking.id, error: result.error })
        }
      }
    } catch (error: any) {
      logger.error('[WhatsAppReminderService] sendReturnReminders error', { error: error.message })
    }

    return { sent: sentCount, skipped: skippedCount }
  }

  /**
   * Send overdue alerts to active rentals past their return time (ACTIVE status)
   */
  static async sendOverdueAlerts(): Promise<{ sent: number; skipped: number }> {
    let sentCount = 0
    let skippedCount = 0

    try {
      const now = new Date()
      // Overdue if ending in past (at least 1 hour ago)
      const maxEnd = new Date(now.getTime() - 1 * 60 * 60 * 1000)

      const bookings = await prisma.booking.findMany({
        where: {
          status: 'ACTIVE',
          endDate: {
            lt: maxEnd,
          },
          deletedAt: null,
        },
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              whatsappOptIn: true,
            },
          },
        },
      })

      for (const booking of bookings) {
        if (!booking.customer?.phone) {
          skippedCount++
          continue
        }

        if (
          !customerAllowsWhatsApp({
            checkoutFormData: booking.checkoutFormData,
            whatsappOptIn: booking.customer.whatsappOptIn,
          })
        ) {
          skippedCount++
          continue
        }

        const phone = booking.customer.phone.trim()
        const customerName = booking.customer.name || 'عميل فليكس كام'
        const bookingNum = booking.bookingNumber

        // Check if we sent an overdue alert in the last 24 hours to avoid spamming the customer
        const lastAlert = await prisma.messageLog.findFirst({
          where: {
            channel: 'WHATSAPP',
            recipientUserId: booking.customer.id,
            body: {
              contains: `تنبيه عاجل: تأخر إرجاع حجزك #${bookingNum}`,
            },
            createdAt: {
              gte: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Within last 24h
            },
          },
        })

        if (lastAlert) {
          skippedCount++
          continue
        }

        // Bilingual Urgent Alert
        const messageText = 
`🚨 *تنبيه عاجل: تأخر إرجاع المعدات / URGENT OVERDUE ALERT* 🚨

مرحباً ${customerName}،
نود إبلاغك بأن فترة إيجار المعدات للحجز رقم *#${bookingNum}* قد انتهت وتجاوزت الوقت المحدد للإرجاع.

يرجى التنسيق فوراً لإرجاع المعدات لتجنب احتساب رسوم تأخير إضافية أو تعليق الحساب.

---

Dear ${booking.customer.name || 'Valued Client'},
This is an urgent notification that your rental equipment for Booking *#${bookingNum}* is currently overdue.

Please return all items immediately to avoid additional daily rental fees or account suspension.

*إدارة فليكس كام | FlixCam Management*`

        const result = await WhatsAppService.sendWhatsAppText(phone, messageText, {
          logToMessageLog: true,
          recipientUserId: booking.customer.id,
          templateId: 'overdue_alert_v1',
        })

        if (result.ok) {
          sentCount++
        } else {
          logger.error('[WhatsAppReminderService] Failed to send overdue alert', { bookingId: booking.id, error: result.error })
        }
      }
    } catch (error: any) {
      logger.error('[WhatsAppReminderService] sendOverdueAlerts error', { error: error.message })
    }

    return { sent: sentCount, skipped: skippedCount }
  }
}
