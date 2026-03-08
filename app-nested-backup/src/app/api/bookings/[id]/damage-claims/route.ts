/**
 * @file route.ts
 * @description List damage claims for a booking
 * @module app/api/bookings/[id]/damage-claims
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { handleApiError } from '@/lib/utils/api-helpers'
import { UnauthorizedError, NotFoundError } from '@/lib/errors'

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) throw new UnauthorizedError()

    const { id: bookingId } = await params
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, deletedAt: null },
    })
    if (!booking) throw new NotFoundError('Booking', bookingId)

    const claims = await prisma.damageClaim.findMany({
      where: { bookingId },
      include: {
        equipment: { select: { id: true, sku: true, model: true } },
        studio: { select: { id: true, name: true } },
        reporter: { select: { id: true, name: true, email: true } },
        resolver: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    const shape = claims.map((c) => ({
      id: c.id,
      bookingId: c.bookingId,
      equipmentId: c.equipmentId,
      studioId: c.studioId,
      damageType: c.damageType,
      severity: c.severity,
      description: c.description,
      photos: c.photos,
      estimatedCost: c.estimatedCost.toString(),
      actualCost: c.actualCost?.toString() ?? null,
      status: c.status,
      resolution: c.resolution,
      resolvedAt: c.resolvedAt?.toISOString() ?? null,
      createdAt: c.createdAt.toISOString(),
      equipment: c.equipment,
      studio: c.studio,
      reporter: c.reporter,
    }))

    return NextResponse.json({ claims: shape })
  } catch (error) {
    return handleApiError(error)
  }
}
