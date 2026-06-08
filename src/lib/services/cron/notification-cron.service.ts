/**
 * Notifications & communications cron jobs.
 */

import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import {
  processNotificationQueueBatch,
  getQueueStats,
} from '@/lib/services/notification-queue.service'
import { getNotificationQueue, isBullMqNotificationsEnabled } from '@/lib/queue/notification.queue'
import { EmailService } from '@/lib/services/email.service'
import { OrderNotificationService } from '@/lib/services/order-notification.service'
import { subDays, startOfDay, endOfDay } from 'date-fns'
import { wrapCronJob } from './cron-utils'

const SMS_OTP_RETENTION_DAYS = Number(process.env.SMS_OTP_RETENTION_DAYS || 60)
const SESSION_RETENTION_DAYS = Number(process.env.SESSION_RETENTION_DAYS || 7)

export const runSmsOtpCleanup = wrapCronJob('sms-otp-cleanup', async () => {
  const cutoff = subDays(new Date(), SMS_OTP_RETENTION_DAYS)

  const [deletedMessages, deletedOtps] = await Promise.all([
    prisma.messageLog.deleteMany({
      where: {
        channel: { in: ['SMS', 'WHATSAPP'] },
        createdAt: { lt: cutoff },
      },
    }),
    prisma.phoneVerification.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: new Date() } }, { createdAt: { lt: cutoff } }],
        verified: true,
      },
    }),
  ])

  return {
    deletedMessageLogs: deletedMessages.count,
    deletedPhoneVerifications: deletedOtps.count,
    retentionDays: SMS_OTP_RETENTION_DAYS,
  }
})

export const runNotificationQueue = wrapCronJob('notification-queue', async () => {
  const before = getQueueStats()

  if (isBullMqNotificationsEnabled()) {
    const counts = await getNotificationQueue().getJobCounts(
      'waiting',
      'active',
      'delayed',
      'failed'
    )
    return {
      mode: 'bullmq',
      before,
      bullmq: counts,
      note: 'Processed by flixcam-workers notification worker',
    }
  }

  const processed = await processNotificationQueueBatch(50)
  const after = getQueueStats()
  return { mode: 'memory', processed, before, after }
})

export const runEmailDigest = wrapCronJob('email-digest', async () => {
  const yesterday = subDays(new Date(), 1)
  const from = startOfDay(yesterday)
  const to = endOfDay(yesterday)

  const [bookings, revenue, failedPayments] = await Promise.all([
    prisma.booking.count({
      where: { createdAt: { gte: from, lte: to }, deletedAt: null },
    }),
    prisma.booking.aggregate({
      where: {
        createdAt: { gte: from, lte: to },
        deletedAt: null,
        status: { not: 'CANCELLED' },
      },
      _sum: { totalAmount: true },
    }),
    prisma.payment.count({
      where: {
        status: 'FAILED',
        updatedAt: { gte: from, lte: to },
        deletedAt: null,
      },
    }),
  ])

  const admins = (
    await prisma.user.findMany({
      where: { role: 'ADMIN', deletedAt: null },
      select: { email: true, id: true },
    })
  ).filter((a) => a.email)

  const subject = `FlixCam Daily Digest — ${from.toISOString().slice(0, 10)}`
  const body = [
    `Daily summary for ${from.toISOString().slice(0, 10)}`,
    ``,
    `New bookings: ${bookings}`,
    `Revenue (bookings created): ${Number(revenue._sum.totalAmount ?? 0).toFixed(2)} SAR`,
    `Failed payments: ${failedPayments}`,
  ].join('\n')

  let sent = 0
  for (const admin of admins) {
    if (!admin.email) continue
    try {
      await EmailService.send({
        to: admin.email,
        subject,
        html: body.replace(/\n/g, '<br>'),
        recipientUserId: admin.id,
      })
      sent++
    } catch (err) {
      logger.warn('email-digest: admin send failed', {
        adminId: admin.id,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return { bookings, failedPayments, adminsNotified: sent }
})

export const runOrderNotifications = wrapCronJob('order-notifications', async () => {
  const since = new Date(Date.now() - 60 * 60_000)

  const pendingBookings = await prisma.booking.findMany({
    where: {
      deletedAt: null,
      updatedAt: { gte: since },
      status: { in: ['CONFIRMED', 'ACTIVE', 'RETURNED', 'CLOSED', 'CANCELLED'] },
    },
    select: { id: true, status: true },
    take: 50,
  })

  let processed = 0
  for (const booking of pendingBookings) {
    try {
      if (booking.status === 'ACTIVE' || booking.status === 'RETURNED') {
        await OrderNotificationService.notifyStatusChanged(
          booking.id,
          booking.status as 'ACTIVE' | 'RETURNED'
        )
      } else if (booking.status === 'CANCELLED') {
        await OrderNotificationService.notifyCancelled(booking.id)
      }
      processed++
    } catch {
      // Idempotent — skip duplicates
    }
  }

  return { scanned: pendingBookings.length, processed }
})

export const runSessionCleanup = wrapCronJob('session-cleanup', async () => {
  const cutoff = subDays(new Date(), SESSION_RETENTION_DAYS)

  const [expiredCarts, staleCarts] = await Promise.all([
    prisma.cart.updateMany({
      where: {
        deletedAt: null,
        expiresAt: { lt: new Date() },
      },
      data: { deletedAt: new Date() },
    }),
    prisma.cart.updateMany({
      where: {
        deletedAt: null,
        booking: null,
        updatedAt: { lt: cutoff },
        items: { none: {} },
      },
      data: { deletedAt: new Date() },
    }),
  ])

  const expiredLocks = await prisma.priceLock.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  })

  return {
    expiredCarts: expiredCarts.count,
    staleEmptyCarts: staleCarts.count,
    expiredPriceLocks: expiredLocks.count,
    retentionDays: SESSION_RETENTION_DAYS,
  }
})
