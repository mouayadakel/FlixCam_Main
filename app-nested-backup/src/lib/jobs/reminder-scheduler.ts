/**
 * @file reminder-scheduler.ts
 * @description Scheduled reminder jobs: pickup, return, late return.
 * Run via cron or BullMQ worker (e.g. every 15 min).
 * @module lib/jobs/reminder-scheduler
 */

import { prisma } from '@/lib/db/prisma'
import { processEventForMessaging } from '@/lib/services/messaging-automation.service'
import { addHours, subHours, isBefore, isAfter } from 'date-fns'

export async function runScheduledReminders(): Promise<{ sent: number; errors: number }> {
  const now = new Date()
  let sent = 0
  let errors = 0

  const in24h = addHours(now, 24)
  const in3h = addHours(now, 3)
  const in24hEnd = addHours(now, 24)
  const in6hEnd = addHours(now, 6)

  const confirmedBookings = await prisma.booking.findMany({
    where: {
      status: { in: ['CONFIRMED', 'ACTIVE'] },
      deletedAt: null,
    },
    include: {
      customer: { select: { id: true, name: true, email: true, phone: true } },
    },
  })

  for (const booking of confirmedBookings) {
    const start = booking.startDate
    const end = booking.endDate

    try {
      const payload = {
        booking: {
          id: booking.id,
          bookingNumber: booking.bookingNumber ?? booking.id.slice(-6),
          startDate: start,
          endDate: end,
          totalPrice: booking.totalAmount,
          customerId: booking.customerId,
        },
        userId: booking.customerId,
      }

      if (start && isWithinWindow(start, in24h, 30)) {
        await processEventForMessaging('reminder.pickup_24h', payload)
        sent++
      }
      if (start && isWithinWindow(start, in3h, 15)) {
        await processEventForMessaging('reminder.pickup_3h', payload)
        sent++
      }
      if (end && isWithinWindow(end, in24hEnd, 30)) {
        await processEventForMessaging('reminder.return_24h', payload)
        sent++
      }
      if (end && isWithinWindow(end, in6hEnd, 15)) {
        await processEventForMessaging('reminder.return_6h', payload)
        sent++
      }
      if (end && isBefore(end, now)) {
        await processEventForMessaging('reminder.late_return', payload)
        sent++
      }
    } catch {
      errors++
    }
  }

  return { sent, errors }
}

function isWithinWindow(date: Date, target: Date, minutesWindow: number): boolean {
  const low = subHours(target, minutesWindow / 60)
  const high = addHours(target, minutesWindow / 60)
  return !isBefore(date, low) && !isAfter(date, high)
}
