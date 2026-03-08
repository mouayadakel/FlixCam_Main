/**
 * POST /api/public/studios/[slug]/availability - Available time slots for a date.
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
  let body: { date?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const dateStr = body.date
  if (!dateStr) {
    return NextResponse.json({ error: 'date required' }, { status: 400 })
  }

  const date = new Date(dateStr)
  if (Number.isNaN(date.getTime())) {
    return NextResponse.json({ error: 'Invalid date' }, { status: 400 })
  }

  const studio = await prisma.studio.findFirst({
    where: { slug, deletedAt: null, isActive: true },
  })
  if (!studio) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const slotDurationMin = (studio as any).slotDurationMinutes === 30 ? 30 : 60

  // Get studio-specific schedule for this day of week
  const dayOfWeek = date.getDay()
  const sched = await StudioScheduleService.getForDay(studio.id, dayOfWeek)

  if (sched.isClosed) {
    return NextResponse.json({ data: [] })
  }

  const openH = parseInt(sched.openTime.split(':')[0], 10)
  const openM = parseInt(sched.openTime.split(':')[1], 10)
  const closeH = parseInt(sched.closeTime.split(':')[0], 10)
  const closeM = parseInt(sched.closeTime.split(':')[1], 10)

  const dayStart = new Date(date)
  dayStart.setHours(openH, openM, 0, 0)
  const dayEnd = new Date(date)
  dayEnd.setHours(closeH, closeM, 0, 0)

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
            { studioStartTime: { lt: dayEnd } },
            { studioEndTime: { gt: dayStart } },
          ],
        },
        {
          AND: [
            { studioStartTime: null },
            { studioEndTime: null },
            { startDate: { lt: dayEnd } },
            { endDate: { gt: dayStart } },
          ],
        },
      ],
    },
    select: { startDate: true, endDate: true, studioStartTime: true, studioEndTime: true },
  })

  const blackouts = await prisma.studioBlackoutDate.findMany({
    where: {
      studioId: studio.id,
      startDate: { lt: dayEnd },
      endDate: { gt: dayStart },
      deletedAt: null,
    },
    select: { startDate: true, endDate: true },
  })

  const blockedRanges = [
    ...bookings.map((b) => {
      const start = b.studioStartTime ?? b.startDate
      const end = b.studioEndTime ?? b.endDate
      return { start: start.getTime(), end: end.getTime() }
    }),
    ...blackouts.map((b) => ({ start: b.startDate.getTime(), end: b.endDate.getTime() })),
  ]

  const slots: { start: string; end: string }[] = []
  const totalMinutes = (dayEnd.getTime() - dayStart.getTime()) / 60000
  const totalSlots = Math.floor(totalMinutes / slotDurationMin)
  for (let i = 0; i < totalSlots; i++) {
    const start = new Date(dayStart.getTime() + i * slotDurationMin * 60000)
    const end = new Date(start.getTime() + slotDurationMin * 60 * 1000)
    if (end > dayEnd) break
    const startMs = start.getTime()
    const endMs = end.getTime()
    const isBlocked = blockedRanges.some(
      (r) =>
        (startMs >= r.start && startMs < r.end) ||
        (endMs > r.start && endMs <= r.end) ||
        (startMs <= r.start && endMs >= r.end)
    )
    if (!isBlocked) {
      slots.push({
        start: start.toISOString(),
        end: end.toISOString(),
      })
    }
  }

  return NextResponse.json({ data: slots })
}
