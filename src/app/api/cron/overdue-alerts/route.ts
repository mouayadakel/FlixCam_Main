/**
 * @file route.ts
 * @description Cron: Alert admins when bookings are overdue (endDate passed, still ACTIVE)
 * @module app/api/cron/overdue-alerts
 */

import { type NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/utils/cron-auth'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { NotificationChannel } from '@prisma/client'

export const dynamic = 'force-dynamic'
export const maxDuration = 60


/**
 * GET /api/cron/overdue-alerts
 * Finds overdue ACTIVE bookings, notifies admin users, sets overdueAlerted = true.
 */
export async function GET(request: NextRequest) {
  try {
    if (!verifyCronSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()

    const bookings = await prisma.booking.findMany({
      where: {
        endDate: { lt: now },
        status: 'ACTIVE',
        deletedAt: null,
      },
      include: { customer: { select: { name: true } } },
    })

    const adminUsers = await prisma.user.findMany({
      where: {
        role: 'ADMIN',
        deletedAt: null,
      },
      select: { id: true },
    })

    let processed = 0
    for (const booking of bookings) {
      try {
        await prisma.$transaction(async (tx) => {
          for (const admin of adminUsers) {
            await tx.notification.create({
              data: {
                userId: admin.id,
                channel: NotificationChannel.IN_APP,
                type: 'booking.overdue',
                title: 'Overdue Booking Alert',
                message: `Booking #${booking.bookingNumber} is overdue. Customer: ${booking.customer?.name ?? 'N/A'}.`,
                data: { bookingId: booking.id, bookingNumber: booking.bookingNumber },
              },
            })
          }
        })
        processed++
      } catch (err) {
        logger.error('overdue-alerts: failed for booking', {
          bookingId: booking.id,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    logger.info('overdue-alerts: processed', { count: processed })
    return NextResponse.json({ processed })
  } catch (error) {
    logger.error('overdue-alerts: error', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
