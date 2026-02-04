/**
 * @file route.ts
 * @description Damage claims API – list and create
 * @module app/api/damage-claims
 */

import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { createDamageClaimSchema } from '@/lib/validators/damage-claim.validator'
import { handleApiError } from '@/lib/utils/api-helpers'
import { UnauthorizedError, NotFoundError } from '@/lib/errors'
import { Decimal } from '@prisma/client/runtime/library'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) throw new UnauthorizedError()

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const bookingId = searchParams.get('bookingId')
    const equipmentId = searchParams.get('equipmentId')
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const pageSize = Math.min(50, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20', 10)))

    const where: Record<string, unknown> = {}
    if (status) where.status = status
    if (bookingId) where.bookingId = bookingId
    if (equipmentId) where.equipmentId = equipmentId

    const [claims, total] = await Promise.all([
      prisma.damageClaim.findMany({
        where,
        include: {
          booking: { select: { id: true, bookingNumber: true, status: true } },
          equipment: { select: { id: true, sku: true, model: true } },
          studio: { select: { id: true, name: true, slug: true } },
          reporter: { select: { id: true, name: true, email: true } },
          resolver: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.damageClaim.count({ where }),
    ])

    const shape = claims.map((c) => ({
      id: c.id,
      bookingId: c.bookingId,
      equipmentId: c.equipmentId,
      studioId: c.studioId,
      reportedBy: c.reportedBy,
      damageType: c.damageType,
      severity: c.severity,
      description: c.description,
      photos: c.photos as string[] | null,
      estimatedCost: c.estimatedCost.toString(),
      actualCost: c.actualCost?.toString() ?? null,
      status: c.status,
      resolution: c.resolution,
      resolvedBy: c.resolvedBy,
      resolvedAt: c.resolvedAt?.toISOString() ?? null,
      customerNotified: c.customerNotified,
      insuranceClaim: c.insuranceClaim,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
      booking: c.booking,
      equipment: c.equipment,
      studio: c.studio,
      reporter: c.reporter,
      resolver: c.resolver,
    }))

    return NextResponse.json({ claims: shape, total, page, pageSize })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) throw new UnauthorizedError()

    const body = await request.json()
    const parsed = createDamageClaimSchema.parse(body)

    const booking = await prisma.booking.findFirst({
      where: { id: parsed.bookingId, deletedAt: null },
    })
    if (!booking) throw new NotFoundError('Booking', parsed.bookingId)

    if (parsed.equipmentId) {
      const eq = await prisma.equipment.findFirst({
        where: { id: parsed.equipmentId, deletedAt: null },
      })
      if (!eq) throw new NotFoundError('Equipment', parsed.equipmentId)
    }
    if (parsed.studioId) {
      const studio = await prisma.studio.findFirst({
        where: { id: parsed.studioId, deletedAt: null },
      })
      if (!studio) throw new NotFoundError('Studio', parsed.studioId)
    }

    const claim = await prisma.damageClaim.create({
      data: {
        bookingId: parsed.bookingId,
        equipmentId: parsed.equipmentId ?? null,
        studioId: parsed.studioId ?? null,
        reportedBy: session.user.id,
        damageType: parsed.damageType,
        severity: parsed.severity,
        description: parsed.description,
        photos: parsed.photos == null ? Prisma.JsonNull : parsed.photos,
        estimatedCost: new Decimal(parsed.estimatedCost),
        insuranceClaim: parsed.insuranceClaim ?? false,
      },
      include: {
        booking: { select: { id: true, bookingNumber: true } },
        equipment: { select: { id: true, sku: true, model: true } },
        studio: { select: { id: true, name: true } },
        reporter: { select: { id: true, name: true, email: true } },
      },
    })

    return NextResponse.json({
      claim: {
        ...claim,
        estimatedCost: claim.estimatedCost.toString(),
        actualCost: claim.actualCost?.toString() ?? null,
        resolvedAt: claim.resolvedAt?.toISOString() ?? null,
        createdAt: claim.createdAt.toISOString(),
        updatedAt: claim.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
