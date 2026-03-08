/**
 * POST /api/public/studios/[slug]/calendar
 * Returns day-level availability for a given month.
 * Body: { month: "2026-03" }
 * Response: { data: [{ date: "2026-03-01", status: "available"|"partial"|"closed"|"blackout" }, ...] }
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { rateLimitByTier } from '@/lib/utils/rate-limit'
import { StudioScheduleService } from '@/lib/services/studio-schedule.service'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const rate = rateLimitByTier(request, 'public')
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { slug } = await params
  let body: { month?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const monthStr = body.month
  if (!monthStr || !/^\d{4}-\d{2}$/.test(monthStr)) {
    return NextResponse.json({ error: 'month required (YYYY-MM)' }, { status: 400 })
  }

  const studio = await prisma.studio.findFirst({
    where: { slug, deletedAt: null, isActive: true },
  })
  if (!studio) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Get schedule for all 7 days
  const schedule = await StudioScheduleService.getSchedule(studio.id)
  const scheduleMap = new Map(schedule.map((s) => [s.dayOfWeek, s]))

  // Calculate month date range
  const [yearStr, monStr] = monthStr.split('-')
  const year = parseInt(yearStr, 10)
  const month = parseInt(monStr, 10) - 1
  const monthStart = new Date(year, month, 1)
  const monthEnd = new Date(year, month + 1, 0, 23, 59, 59, 999)
  const daysInMonth = monthEnd.getDate()

  // Fetch blackout dates for this month
  const blackouts = await prisma.studioBlackoutDate.findMany({
    where: {
      studioId: studio.id,
      deletedAt: null,
      startDate: { lte: monthEnd },
      endDate: { gte: monthStart },
    },
    select: { startDate: true, endDate: true },
  })

  // Fetch confirmed bookings for this month
  const bookings = await prisma.booking.findMany({
    where: {
      studioId: studio.id,
      status: { in: ['CONFIRMED', 'ACTIVE'] },
      deletedAt: null,
      OR: [
        {
          AND: [
            { studioStartTime: { not: null } },
            { studioEndTime: { not: null } },
            { studioStartTime: { lte: monthEnd } },
            { studioEndTime: { gte: monthStart } },
          ],
        },
        {
          AND: [
            { studioStartTime: null },
            { startDate: { lte: monthEnd } },
            { endDate: { gte: monthStart } },
          ],
        },
      ],
    },
    select: { startDate: true, endDate: true, studioStartTime: true, studioEndTime: true },
  })

  const slotDurationMin = (studio as any).slotDurationMinutes === 30 ? 30 : 60
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const days: { date: string; status: string }[] = []

  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d)
    const dateStr = `${yearStr}-${monStr}-${String(d).padStart(2, '0')}`

    // Past dates
    if (date < today) {
      days.push({ date: dateStr, status: 'past' })
      continue
    }

    const dayOfWeek = date.getDay()
    const sched = scheduleMap.get(dayOfWeek)

    // Closed day
    if (sched?.isClosed) {
      days.push({ date: dateStr, status: 'closed' })
      continue
    }

    // Check blackout
    const dayStart = new Date(date)
    const dayEnd = new Date(date)
    dayEnd.setHours(23, 59, 59, 999)

    const isBlackedOut = blackouts.some((b) => b.startDate <= dayEnd && b.endDate >= dayStart)
    if (isBlackedOut) {
      days.push({ date: dateStr, status: 'blackout' })
      continue
    }

    // Count available slots for the day
    const openH = parseInt((sched?.openTime ?? '09:00').split(':')[0], 10)
    const openM = parseInt((sched?.openTime ?? '09:00').split(':')[1], 10)
    const closeH = parseInt((sched?.closeTime ?? '22:00').split(':')[0], 10)
    const closeM = parseInt((sched?.closeTime ?? '22:00').split(':')[1], 10)

    const dayOpenMs = new Date(date).setHours(openH, openM, 0, 0)
    const dayCloseMs = new Date(date).setHours(closeH, closeM, 0, 0)

    const totalMinutes = (dayCloseMs - dayOpenMs) / 60000
    const totalSlots = Math.floor(totalMinutes / slotDurationMin)

    // Get booking ranges for this day
    const dayBookings = bookings.filter((b) => {
      const bStart = (b.studioStartTime ?? b.startDate).getTime()
      const bEnd = (b.studioEndTime ?? b.endDate).getTime()
      return bStart < dayEnd.getTime() && bEnd > dayStart.getTime()
    })

    let bookedSlots = 0
    for (let i = 0; i < totalSlots; i++) {
      const slotStart = dayOpenMs + i * slotDurationMin * 60000
      const slotEnd = slotStart + slotDurationMin * 60000
      const isBooked = dayBookings.some((b) => {
        const bStart = (b.studioStartTime ?? b.startDate).getTime()
        const bEnd = (b.studioEndTime ?? b.endDate).getTime()
        return slotStart < bEnd && slotEnd > bStart
      })
      if (isBooked) bookedSlots++
    }

    if (totalSlots === 0) {
      days.push({ date: dateStr, status: 'closed' })
    } else if (bookedSlots === 0) {
      days.push({ date: dateStr, status: 'available' })
    } else if (bookedSlots >= totalSlots) {
      days.push({ date: dateStr, status: 'full' })
    } else {
      days.push({ date: dateStr, status: 'partial' })
    }
  }

  return NextResponse.json({ data: days, schedule })
}
