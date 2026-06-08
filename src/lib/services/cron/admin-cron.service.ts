/**
 * Admin & operations cron jobs.
 */

import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { EmailService } from '@/lib/services/email.service'
import { scanAndQueue } from '@/lib/services/catalog-scanner.service'
import { wrapCronJob } from './cron-utils'

export const runTeamNotifications = wrapCronJob('team-notifications', async () => {
  const now = new Date()
  const dayStart = new Date(now)
  dayStart.setHours(0, 0, 0, 0)

  const [pendingOrders, overdueRentals, lowStock, failedPayments] = await Promise.all([
    prisma.booking.count({
      where: {
        deletedAt: null,
        status: { in: ['PAYMENT_PENDING', 'DRAFT'] },
        createdAt: { gte: dayStart },
      },
    }),
    prisma.booking.count({
      where: { deletedAt: null, status: 'ACTIVE', endDate: { lt: now } },
    }),
    prisma.equipment.count({
      where: {
        deletedAt: null,
        isActive: true,
        quantityAvailable: { lte: 1 },
      },
    }),
    prisma.payment.count({
      where: { deletedAt: null, status: 'FAILED', updatedAt: { gte: dayStart } },
    }),
  ])

  const admins = (
    await prisma.user.findMany({
      where: { role: 'ADMIN', deletedAt: null },
      select: { email: true, id: true },
    })
  ).filter((a) => a.email)

  const subject = 'FlixCam Ops Alert — Daily Summary'
  const body = [
    'Operations summary:',
    `- Pending orders today: ${pendingOrders}`,
    `- Overdue active rentals: ${overdueRentals}`,
    `- Low stock items (≤1): ${lowStock}`,
    `- Failed payments today: ${failedPayments}`,
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
      logger.warn('team-notifications: send failed', {
        adminId: admin.id,
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  return { pendingOrders, overdueRentals, lowStock, failedPayments, adminsNotified: sent }
})

export const runEquipmentSpecsValidation = wrapCronJob('equipment-specs-validation', async () => {
  const { jobId, report } = await scanAndQueue({
    types: ['text', 'photo', 'spec'],
    trigger: 'scheduled',
  })

  const incomplete = await prisma.equipment.count({
    where: {
      deletedAt: null,
      isActive: true,
      media: { none: {} },
    },
  })

  return {
    jobId,
    catalogQualityScore: report.catalogQualityScore,
    totalProducts: report.totalProducts,
    incompleteEquipment: incomplete,
    byGapType: report.byGapType,
  }
})

export const runTicketEscalation = wrapCronJob('ticket-escalation', async () => {
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60_000)

  const staleRequests = await prisma.bookingRequest.findMany({
    where: {
      status: 'PENDING',
      createdAt: { lt: threeDaysAgo },
      deletedAt: null,
    },
    include: {
      booking: { select: { bookingNumber: true } },
    },
    take: 50,
  })

  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN', deletedAt: null },
    select: { id: true },
  })

  let escalated = 0
  for (const req of staleRequests) {
    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.id,
          channel: 'IN_APP',
          type: 'support.escalation',
          title: 'Stale booking request',
          message: `Booking request for ${req.booking?.bookingNumber ?? req.bookingId} pending >3 days`,
          data: { requestId: req.id, bookingId: req.bookingId },
        },
      })
    }
    escalated++
  }

  return { staleRequests: staleRequests.length, escalated }
})

export const runSeasonalPromos = wrapCronJob('seasonal-promos', async () => {
  const now = new Date()

  const activated = await prisma.coupon.updateMany({
    where: {
      deletedAt: null,
      status: 'INACTIVE',
      validFrom: { lte: now },
      validUntil: { gte: now },
    },
    data: { status: 'ACTIVE' },
  })

  const deactivated = await prisma.coupon.updateMany({
    where: {
      deletedAt: null,
      status: 'ACTIVE',
      validUntil: { lt: now },
    },
    data: { status: 'EXPIRED' },
  })

  return {
    activated: activated.count,
    deactivated: deactivated.count,
  }
})
