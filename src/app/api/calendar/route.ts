/**
 * @file route.ts
 * @description Calendar API - real bookings for admin calendar view
 * @module app/api/calendar
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { handleApiError } from '@/lib/utils/api-helpers'
import { UnauthorizedError } from '@/lib/errors'

const CALENDAR_VISIBLE_STATUSES = ['CONFIRMED', 'ACTIVE', 'PAYMENT_PENDING', 'DRAFT', 'RISK_CHECK'] as const

/**
 * GET /api/calendar - List bookings as calendar events for a date range
 * Query: from (ISO date), to (ISO date)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      throw new UnauthorizedError()
    }

    const { searchParams } = new URL(request.url)
    const fromParam = searchParams.get('from') ?? searchParams.get('start')
    const toParam = searchParams.get('to') ?? searchParams.get('end')

    const now = new Date()
    const from = fromParam ? new Date(fromParam) : new Date(now.getFullYear(), now.getMonth(), 1)
    const to = toParam ? new Date(toParam) : new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59)

    const bookings = await prisma.booking.findMany({
      where: {
        deletedAt: null,
        status: { in: [...CALENDAR_VISIBLE_STATUSES] },
        OR: [
          {
            startDate: { lte: to },
            endDate: { gte: from },
          },
        ],
      },
      include: {
        customer: { select: { id: true, name: true } },
        studio: { select: { id: true, name: true, setupBuffer: true, cleaningBuffer: true } },
        equipment: {
          include: {
            equipment: { select: { id: true, sku: true, model: true } },
          },
        },
      },
      orderBy: { startDate: 'asc' },
    })

    const resourceTypeFilter = searchParams.get('resourceType') as 'studio' | 'equipment' | null
    const resourceIdFilter = searchParams.get('resourceId')

    const events: Array<{
      id: string
      title: string
      start: string
      end: string
      bookingId: string
      bookingNumber: string
      status: string
      resourceType: 'studio' | 'equipment'
      resourceId: string
      resourceName: string
      customerName: string
      bufferMinutesBefore: number
      bufferMinutesAfter: number
    }> = []

    for (const b of bookings) {
      const customerName = b.customer?.name ?? '—'

      if (b.studioId && b.studio) {
        if (resourceTypeFilter === 'equipment') continue
        if (resourceIdFilter && resourceIdFilter !== b.studio.id) continue
        const start = (b.studioStartTime ?? b.startDate).toISOString()
        const end = (b.studioEndTime ?? b.endDate).toISOString()
        const setupBuffer = b.studio.setupBuffer ?? 30
        const cleaningBuffer = b.studio.cleaningBuffer ?? 30
        events.push({
          id: `studio-${b.id}`,
          title: `${customerName} – ${b.studio.name}`,
          start,
          end,
          bookingId: b.id,
          bookingNumber: b.bookingNumber,
          status: b.status,
          resourceType: 'studio',
          resourceId: b.studio.id,
          resourceName: b.studio.name,
          customerName,
          bufferMinutesBefore: setupBuffer,
          bufferMinutesAfter: cleaningBuffer,
        })
      }

      for (const be of b.equipment) {
        const eq = be.equipment
        if (!eq) continue
        if (resourceTypeFilter === 'studio') continue
        if (resourceIdFilter && resourceIdFilter !== eq.id) continue
        const eqLabel = eq.model || eq.sku || eq.id
        events.push({
          id: `equipment-${b.id}-${eq.id}`,
          title: `${customerName} – ${eqLabel}`,
          start: b.startDate.toISOString(),
          end: b.endDate.toISOString(),
          bookingId: b.id,
          bookingNumber: b.bookingNumber,
          status: b.status,
          resourceType: 'equipment',
          resourceId: eq.id,
          resourceName: eqLabel,
          customerName,
          bufferMinutesBefore: 0,
          bufferMinutesAfter: 0,
        })
      }

      if (!b.studioId && (!b.equipment || b.equipment.length === 0)) {
        if (resourceTypeFilter === 'studio') continue
        if (resourceIdFilter) continue
        events.push({
          id: `booking-${b.id}`,
          title: `${customerName} – Booking #${b.bookingNumber}`,
          start: b.startDate.toISOString(),
          end: b.endDate.toISOString(),
          bookingId: b.id,
          bookingNumber: b.bookingNumber,
          status: b.status,
          resourceType: 'equipment',
          resourceId: b.id,
          resourceName: 'Booking',
          customerName,
          bufferMinutesBefore: 0,
          bufferMinutesAfter: 0,
        })
      }
    }

    return NextResponse.json({ data: events, view: 'month' })
  } catch (error) {
    return handleApiError(error)
  }
}
