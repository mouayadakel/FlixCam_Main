/**
 * Phase 7 — Commerce & growth automation crons.
 */

import { promises as fs } from 'fs'
import path from 'path'
import { prisma } from '@/lib/db/prisma'
import { NotificationChannel } from '@prisma/client'
import { EmailService } from '@/lib/services/email.service'
import { WhatsAppService } from '@/lib/services/whatsapp.service'
import { customerAllowsWhatsApp } from '@/lib/checkout/notification-opt-in'
import { alertAdmins } from '@/lib/services/cron-alert.service'
import { CheckoutRecoveryService } from '@/lib/services/checkout-recovery.service'
import { wrapCronJob } from './cron-utils'

const FEEDS_DIR = path.join(process.cwd(), 'public', 'feeds')
const BASE = process.env.NEXTAUTH_URL || process.env.APP_URL || 'https://flixcam.rent'

export const runFeedValidation = wrapCronJob('feed-validation', async () => {
  const errors: string[] = []
  const googlePath = path.join(FEEDS_DIR, 'google-shopping.xml')
  const facebookPath = path.join(FEEDS_DIR, 'facebook-catalog.csv')

  try {
    const xml = await fs.readFile(googlePath, 'utf8')
    if (!xml.includes('<rss') || !xml.includes('</rss>')) errors.push('Google feed invalid XML structure')
    if (!xml.includes('<g:id>')) errors.push('Google feed missing product ids')
    const itemCount = (xml.match(/<item>/g) || []).length
    if (itemCount === 0) errors.push('Google feed has zero items')
  } catch {
    errors.push('Google feed file missing')
  }

  try {
    const csv = await fs.readFile(facebookPath, 'utf8')
    const lines = csv.trim().split('\n')
    if (lines.length < 2) errors.push('Facebook feed empty')
  } catch {
    errors.push('Facebook feed file missing')
  }

  if (errors.length > 0) {
    await alertAdmins('FlixCam feed validation failed', errors.join('\n'))
  }

  return {
    valid: errors.length === 0,
    errors,
    googleFeed: '/feeds/google-shopping.xml',
    facebookFeed: '/feeds/facebook-catalog.csv',
    merchantCenterUrl: `${BASE}/feeds/google-shopping.xml`,
  }
})

export const runWaitlistAvailability = wrapCronJob('waitlist-availability', async () => {
  const now = new Date()
  let notified = 0

  const waiting = await prisma.waitlistEntry.findMany({
    where: { status: 'WAITING' },
    include: {
      equipment: { select: { id: true, model: true, quantityAvailable: true, isActive: true } },
      user: { select: { id: true, email: true, phone: true, whatsappOptIn: true } },
    },
    take: 50,
  })

  for (const entry of waiting) {
    if (!entry.equipment?.isActive || (entry.equipment.quantityAvailable ?? 0) <= 0) continue

    await prisma.$transaction(async (tx) => {
      await tx.waitlistEntry.update({
        where: { id: entry.id },
        data: { status: 'NOTIFIED', notifiedAt: now },
      })
      if (entry.userId) {
        await tx.notification.create({
          data: {
            userId: entry.userId,
            channel: NotificationChannel.IN_APP,
            type: 'waitlist.available',
            title: 'Equipment available',
            message: `${entry.equipment?.model ?? 'Equipment'} is now available for your dates.`,
            data: { waitlistEntryId: entry.id, equipmentId: entry.equipmentId },
          },
        })
      }
    })

    const user = entry.user
    if (
      user?.phone &&
      customerAllowsWhatsApp({ whatsappOptIn: user.whatsappOptIn }) &&
      WhatsAppService.isWhatsAppConfigured()
    ) {
      const phone = WhatsAppService.normalizePhoneForWhatsApp(user.phone)
      const link = `${BASE}/equipment/${entry.equipmentId}`
      await WhatsAppService.sendWhatsAppText(
        phone,
        `Good news! ${entry.equipment?.model ?? 'Equipment'} is available on FlixCam.\n${link}`,
        { recipientUserId: user.id, templateId: 'waitlist_available' }
      )
    }
    notified++
  }

  return { scanned: waiting.length, notified }
})

export const runReviewRequests = wrapCronJob('review-request', async () => {
  const since = new Date(Date.now() - 48 * 60 * 60_000)
  const bookings = await prisma.booking.findMany({
    where: {
      deletedAt: null,
      status: 'RETURNED',
      updatedAt: { gte: since },
    },
    include: {
      customer: { select: { id: true, email: true, name: true, whatsappOptIn: true, phone: true } },
    },
    take: 30,
  })

  let sent = 0
  for (const booking of bookings) {
    const already = await prisma.auditLog.findFirst({
      where: { action: 'cron.review_request.sent', resourceId: booking.id },
    })
    if (already) continue

    const customer = booking.customer
    const reviewUrl = `${BASE}/booking/confirmation/${booking.id}?review=1`
    const name = customer.name || 'there'

    if (customer.email) {
      await EmailService.send({
        to: customer.email,
        subject: 'How was your FlixCam rental?',
        html: `<p>Hi ${name},</p><p>Thanks for renting with FlixCam! We'd love your feedback.</p><p><a href="${reviewUrl}">Leave a quick review</a></p>`,
      })
    }

    await prisma.auditLog.create({
      data: {
        action: 'cron.review_request.sent',
        resourceType: 'Booking',
        resourceId: booking.id,
        userId: customer.id,
        metadata: { reviewUrl },
      },
    })
    sent++
  }

  return { eligible: bookings.length, sent }
})

export const runLowStockAlerts = wrapCronJob('low-stock-alerts', async () => {
  const threshold = Number(process.env.LOW_STOCK_THRESHOLD || 2)
  const low = await prisma.equipment.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      quantityAvailable: { lte: threshold },
    },
    select: { id: true, sku: true, model: true, quantityAvailable: true },
    take: 100,
  })

  if (low.length === 0) return { count: 0, alerted: false }

  const lines = low.map(
    (e) => `- ${e.sku} ${e.model}: ${e.quantityAvailable} available`
  )
  await alertAdmins(
    `FlixCam low stock (${low.length} items)`,
    `Equipment at or below ${threshold} units:\n\n${lines.join('\n')}`
  )

  return { count: low.length, alerted: true, threshold }
})

export const runAbandonedCartTiered = wrapCronJob('abandoned-cart-tiered', async () => {
  const result = await CheckoutRecoveryService.recoverAbandonedCheckoutsTiered()
  return result
})
