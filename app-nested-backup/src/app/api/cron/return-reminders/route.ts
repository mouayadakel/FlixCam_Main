/**
 * @file route.ts
 * @description Cron: Send return reminders 24h before end date
 * @module app/api/cron/return-reminders
 */

import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { NotificationChannel } from '@prisma/client'
import { addHours } from 'date-fns'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function verifyCronSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = request.headers.get('authorization')
  return auth === `Bearer ${secret}` || auth === secret
}

/**
 * GET /api/cron/return-reminders
 * Finds bookings ending in 23–25h, sends return reminder, sets returnReminderSent = true.
 */
export async function GET(request: NextRequest) {
  try {
    if (!verifyCronSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const windowStart = addHours(now, 23)
    const windowEnd = addHours(now, 25)

    const bookings = await prisma.booking.findMany({
      where: {
        endDate: { gte: windowStart, lte: windowEnd },
        status: { in: ['ACTIVE', 'CONFIRMED'] },
        returnReminderSent: false,
        deletedAt: null,
      },
      include: { customer: { select: { id: true } } },
    })

    let processed = 0
    for (const booking of bookings) {
      try {
        await prisma.$transaction([
          prisma.notification.create({
            data: {
              userId: booking.customerId,
              channel: NotificationChannel.IN_APP,
              type: 'return.reminder',
              title: 'Return Reminder',
              message: `Your booking #${booking.bookingNumber} is due for return in ~24 hours.`,
              data: { bookingId: booking.id, bookingNumber: booking.bookingNumber },
            },
          }),
          prisma.booking.update({
            where: { id: booking.id },
            data: { returnReminderSent: true },
          }),
        ])
        processed++
      } catch (err) {
        logger.error('return-reminders: failed for booking', {
          bookingId: booking.id,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    logger.info('return-reminders: processed', { count: processed })
    return NextResponse.json({ processed })
  } catch (error) {
    logger.error('return-reminders: error', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
