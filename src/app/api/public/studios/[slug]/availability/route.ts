/**
 * POST /api/public/studios/[slug]/availability - Available time slots for a date.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { rateLimitByTier } from '@/lib/utils/rate-limit'

const SLOT_DURATION_MIN = 60
const DAY_START = 9
const DAY_END = 22

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

  const dayStart = new Date(date)
  dayStart.setHours(DAY_START, 0, 0, 0)
  const dayEnd = new Date(date)
  dayEnd.setHours(DAY_END, 0, 0, 0)

  const bookings = await prisma.booking.findMany({
    where: {
      studioId: studio.id,
      status: { in: ['CONFIRMED', 'ACTIVE'] },
      startDate: { lt: dayEnd },
      endDate: { gt: dayStart },
      deletedAt: null,
    },
    select: { startDate: true, endDate: true },
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
    ...bookings.map((b) => ({ start: b.startDate.getTime(), end: b.endDate.getTime() })),
    ...blackouts.map((b) => ({ start: b.startDate.getTime(), end: b.endDate.getTime() })),
  ]

  const slots: { start: string; end: string }[] = []
  for (let hour = DAY_START; hour < DAY_END; hour++) {
    const start = new Date(date)
    start.setHours(hour, 0, 0, 0)
    const end = new Date(start.getTime() + SLOT_DURATION_MIN * 60 * 1000)
    if (end > dayEnd) break
    const startMs = start.getTime()
    const endMs = end.getTime()
    const isBlocked = blockedRanges.some(
      (r) => (startMs >= r.start && startMs < r.end) || (endMs > r.start && endMs <= r.end) || (startMs <= r.start && endMs >= r.end)
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
