/**
 * @file route.ts
 * @description Cron: Alert admins when bookings are overdue (endDate passed, still ACTIVE)
 * @module app/api/cron/overdue-alerts
 */

import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { NotificationChannel } from '@prisma/client'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function verifyCronSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = request.headers.get('authorization')
  return auth === `Bearer ${secret}` || auth === secret
}

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
        overdueAlerted: false,
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
          await tx.booking.update({
            where: { id: booking.id },
            data: { overdueAlerted: true },
          })
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
