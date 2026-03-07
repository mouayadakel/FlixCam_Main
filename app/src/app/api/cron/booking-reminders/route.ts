/**
 * @file route.ts
 * @description Cron: Send booking reminders 48h before pickup (Vercel Cron compatible)
 * @module app/api/cron/booking-reminders
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
 * GET /api/cron/booking-reminders
 * Finds bookings starting in 47–49h, sends reminder, sets reminderSent = true.
 */
export async function GET(request: NextRequest) {
  try {
    if (!verifyCronSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const windowStart = addHours(now, 47)
    const windowEnd = addHours(now, 49)

    const bookings = await prisma.booking.findMany({
      where: {
        startDate: { gte: windowStart, lte: windowEnd },
        status: 'CONFIRMED',
        reminderSent: false,
        deletedAt: null,
      },
      include: { customer: { select: { id: true, name: true } } },
    })

    let processed = 0
    for (const booking of bookings) {
      try {
        await prisma.$transaction([
          prisma.notification.create({
            data: {
              userId: booking.customerId,
              channel: NotificationChannel.IN_APP,
              type: 'booking.reminder',
              title: 'Booking Reminder',
              message: `Your booking #${booking.bookingNumber} starts in ~48 hours. Get ready for pickup!`,
              data: { bookingId: booking.id, bookingNumber: booking.bookingNumber },
            },
          }),
          prisma.booking.update({
            where: { id: booking.id },
            data: { reminderSent: true },
          }),
        ])
        processed++
      } catch (err) {
        logger.error('booking-reminders: failed for booking', {
          bookingId: booking.id,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    logger.info('booking-reminders: processed', { count: processed })
    return NextResponse.json({ processed })
  } catch (error) {
    logger.error('booking-reminders: error', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
