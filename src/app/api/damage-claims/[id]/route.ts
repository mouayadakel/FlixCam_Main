/**
 * @file route.ts
 * @description Single damage claim – get, update
 * @module app/api/damage-claims/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { updateDamageClaimSchema } from '@/lib/validators/damage-claim.validator'
import { handleApiError } from '@/lib/utils/api-helpers'
import { UnauthorizedError, NotFoundError } from '@/lib/errors'
import { Decimal } from '@prisma/client/runtime/library'

function shapeClaim(c: {
  id: string
  bookingId: string
  equipmentId: string | null
  studioId: string | null
  reportedBy: string
  damageType: string
  severity: string
  description: string
  photos: unknown
  estimatedCost: Decimal
  actualCost: Decimal | null
  status: string
  resolution: string | null
  resolvedBy: string | null
  resolvedAt: Date | null
  customerNotified: boolean
  insuranceClaim: boolean
  createdAt: Date
  updatedAt: Date
  booking?: { id: string; bookingNumber: string; status: string }
  equipment?: { id: string; sku: string; model: string | null } | null
  studio?: { id: string; name: string; slug: string } | null
  reporter?: { id: string; name: string | null; email: string }
  resolver?: { id: string; name: string | null } | null
}) {
  return {
    id: c.id,
    bookingId: c.bookingId,
    equipmentId: c.equipmentId,
    studioId: c.studioId,
    reportedBy: c.reportedBy,
    damageType: c.damageType,
    severity: c.severity,
    description: c.description,
    photos: c.photos,
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
  }
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) throw new UnauthorizedError()

    const { id } = await params
    const claim = await prisma.damageClaim.findUnique({
      where: { id },
      include: {
        booking: { select: { id: true, bookingNumber: true, status: true, customerId: true } },
        equipment: { select: { id: true, sku: true, model: true } },
        studio: { select: { id: true, name: true, slug: true } },
        reporter: { select: { id: true, name: true, email: true } },
        resolver: { select: { id: true, name: true } },
      },
    })

    if (!claim) throw new NotFoundError('Damage claim', id)
    return NextResponse.json(shapeClaim(claim))
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) throw new UnauthorizedError()

    const { id } = await params
    const existing = await prisma.damageClaim.findUnique({ where: { id } })
    if (!existing) throw new NotFoundError('Damage claim', id)

    const body = await request.json()
    const parsed = updateDamageClaimSchema.parse(body)

    const updateData: Record<string, unknown> = {}
    if (parsed.damageType !== undefined) updateData.damageType = parsed.damageType
    if (parsed.severity !== undefined) updateData.severity = parsed.severity
    if (parsed.description !== undefined) updateData.description = parsed.description
    if (parsed.photos !== undefined) updateData.photos = parsed.photos
    if (parsed.estimatedCost !== undefined)
      updateData.estimatedCost = new Decimal(parsed.estimatedCost)
    if (parsed.actualCost !== undefined)
      updateData.actualCost = parsed.actualCost == null ? null : new Decimal(parsed.actualCost)
    if (parsed.status !== undefined) updateData.status = parsed.status
    if (parsed.resolution !== undefined) updateData.resolution = parsed.resolution
    if (parsed.customerNotified !== undefined) updateData.customerNotified = parsed.customerNotified
    if (parsed.insuranceClaim !== undefined) updateData.insuranceClaim = parsed.insuranceClaim

    const claim = await prisma.damageClaim.update({
      where: { id },
      data: updateData,
      include: {
        booking: { select: { id: true, bookingNumber: true, status: true } },
        equipment: { select: { id: true, sku: true, model: true } },
        studio: { select: { id: true, name: true, slug: true } },
        reporter: { select: { id: true, name: true, email: true } },
        resolver: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json(shapeClaim(claim))
  } catch (error) {
    return handleApiError(error)
  }
}
