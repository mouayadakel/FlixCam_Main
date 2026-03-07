/**
 * @file route.ts
 * @description Recurring booking series – list and create
 * @module app/api/recurring-series
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { createRecurringSeriesSchema } from '@/lib/validators/recurring.validator'
import { handleApiError } from '@/lib/utils/api-helpers'
import { UnauthorizedError } from '@/lib/errors'
import { addDays, addWeeks, addMonths } from 'date-fns'
import { Decimal } from '@prisma/client/runtime/library'

function generateBookingNumber() {
  return `BK-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6)}`
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) throw new UnauthorizedError()

    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')
    const isActive = searchParams.get('isActive')

    const where: Record<string, unknown> = { deletedAt: null }
    if (customerId) where.customerId = customerId
    if (isActive !== undefined && isActive !== '') where.isActive = isActive === 'true'

    const series = await prisma.recurringSeries.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        _count: { select: { bookings: true } },
      },
    })

    return NextResponse.json({
      series: series.map((s) => ({
        id: s.id,
        name: s.name,
        customerId: s.customerId,
        customer: s.customer,
        frequency: s.frequency,
        interval: s.interval,
        endDate: s.endDate?.toISOString() ?? null,
        occurrenceCount: s.occurrenceCount,
        template: s.template,
        isActive: s.isActive,
        bookingCount: s._count.bookings,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
      })),
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) throw new UnauthorizedError()

    const body = await request.json()
    const parsed = createRecurringSeriesSchema.parse(body)

    const template = parsed.template as {
      equipmentIds: Array<{ equipmentId: string; quantity: number }>
      studioId?: string
      notes?: string
    }
    const endDate = parsed.endDate ? new Date(parsed.endDate) : null
    const maxOccurrences = parsed.occurrenceCount ?? (endDate ? 365 : 12)

    const series = await prisma.recurringSeries.create({
      data: {
        name: parsed.name,
        customerId: parsed.customerId,
        frequency: parsed.frequency,
        interval: parsed.interval,
        endDate,
        occurrenceCount: parsed.occurrenceCount ?? null,
        template: template as object,
        createdBy: session.user.id,
      },
      include: { customer: { select: { id: true, name: true, email: true } } },
    })

    let start = new Date()
    start.setHours(0, 0, 0, 0)
    const generated: string[] = []
    let count = 0

    while (count < maxOccurrences) {
      if (endDate && start > endDate) break
      const end = new Date(start)
      end.setDate(end.getDate() + 1)

      const totalAmount = new Decimal(0)
      const vatAmount = new Decimal(0)

      const booking = await prisma.booking.create({
        data: {
          bookingNumber: generateBookingNumber(),
          customerId: series.customerId,
          startDate: start,
          endDate: end,
          totalAmount,
          vatAmount,
          status: 'DRAFT',
          createdBy: session.user.id,
          recurringSeriesId: series.id,
          studioId: template.studioId ?? null,
          notes: template.notes ?? null,
        },
      })

      await prisma.bookingEquipment.createMany({
        data: template.equipmentIds.map((item) => ({
          bookingId: booking.id,
          equipmentId: item.equipmentId,
          quantity: item.quantity,
          createdBy: session.user!.id,
        })),
      })

      generated.push(booking.id)
      count++

      if (parsed.frequency === 'DAILY') start = addDays(start, parsed.interval)
      else if (parsed.frequency === 'WEEKLY') start = addWeeks(start, parsed.interval)
      else start = addMonths(start, parsed.interval)
    }

    return NextResponse.json({
      series: {
        id: series.id,
        name: series.name,
        customerId: series.customerId,
        customer: series.customer,
        frequency: series.frequency,
        interval: series.interval,
        endDate: series.endDate?.toISOString() ?? null,
        occurrenceCount: series.occurrenceCount,
        isActive: series.isActive,
        createdAt: series.createdAt.toISOString(),
        updatedAt: series.updatedAt.toISOString(),
      },
      generatedBookingIds: generated,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
