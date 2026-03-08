/**
 * @file route.ts
 * @description Single recurring series – get, update, delete
 * @module app/api/recurring-series/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { updateRecurringSeriesSchema } from '@/lib/validators/recurring.validator'
import { handleApiError } from '@/lib/utils/api-helpers'
import { UnauthorizedError, NotFoundError } from '@/lib/errors'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) throw new UnauthorizedError()
    const { id } = await params

    const series = await prisma.recurringSeries.findUnique({
      where: { id, deletedAt: null },
      include: {
        customer: { select: { id: true, name: true, email: true } },
        bookings: {
          orderBy: { startDate: 'asc' },
          take: 50,
          select: { id: true, bookingNumber: true, startDate: true, endDate: true, status: true },
        },
      },
    })
    if (!series) throw new NotFoundError('Recurring series', id)

    return NextResponse.json({
      id: series.id,
      name: series.name,
      customerId: series.customerId,
      customer: series.customer,
      frequency: series.frequency,
      interval: series.interval,
      endDate: series.endDate?.toISOString() ?? null,
      occurrenceCount: series.occurrenceCount,
      template: series.template,
      isActive: series.isActive,
      bookings: series.bookings.map((b) => ({
        ...b,
        startDate: b.startDate.toISOString(),
        endDate: b.endDate.toISOString(),
      })),
      createdAt: series.createdAt.toISOString(),
      updatedAt: series.updatedAt.toISOString(),
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) throw new UnauthorizedError()
    const { id } = await params
    const existing = await prisma.recurringSeries.findUnique({ where: { id, deletedAt: null } })
    if (!existing) throw new NotFoundError('Recurring series', id)

    const body = await request.json()
    const parsed = updateRecurringSeriesSchema.parse(body)

    const series = await prisma.recurringSeries.update({
      where: { id },
      data: {
        ...(parsed.name !== undefined && { name: parsed.name }),
        ...(parsed.isActive !== undefined && { isActive: parsed.isActive }),
        updatedBy: session.user.id,
      },
      include: { customer: { select: { id: true, name: true, email: true } } },
    })

    return NextResponse.json({
      id: series.id,
      name: series.name,
      customerId: series.customerId,
      customer: series.customer,
      frequency: series.frequency,
      interval: series.interval,
      endDate: series.endDate?.toISOString() ?? null,
      occurrenceCount: series.occurrenceCount,
      template: series.template,
      isActive: series.isActive,
      createdAt: series.createdAt.toISOString(),
      updatedAt: series.updatedAt.toISOString(),
    })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user) throw new UnauthorizedError()
    const { id } = await params
    const existing = await prisma.recurringSeries.findUnique({ where: { id, deletedAt: null } })
    if (!existing) throw new NotFoundError('Recurring series', id)

    await prisma.recurringSeries.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: session.user.id },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
