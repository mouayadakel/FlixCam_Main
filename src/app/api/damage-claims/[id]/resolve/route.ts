/**
 * @file route.ts
 * @description Resolve damage claim (approve/reject/resolve)
 * @module app/api/damage-claims/[id]/resolve
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { resolveDamageClaimSchema } from '@/lib/validators/damage-claim.validator'
import { handleApiError } from '@/lib/utils/api-helpers'
import { UnauthorizedError, NotFoundError } from '@/lib/errors'
import { Decimal } from '@prisma/client/runtime/library'

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user) throw new UnauthorizedError()

    const { id } = await params
    const existing = await prisma.damageClaim.findUnique({ where: { id } })
    if (!existing) throw new NotFoundError('Damage claim', id)

    const body = await request.json()
    const parsed = resolveDamageClaimSchema.parse(body)

    const claim = await prisma.damageClaim.update({
      where: { id },
      data: {
        status: parsed.status,
        resolution: parsed.resolution,
        actualCost: parsed.actualCost != null ? new Decimal(parsed.actualCost) : null,
        customerNotified: parsed.customerNotified ?? false,
        resolvedBy: session.user.id,
        resolvedAt: new Date(),
      },
      include: {
        booking: { select: { id: true, bookingNumber: true } },
        equipment: { select: { id: true, sku: true, model: true } },
        studio: { select: { id: true, name: true } },
        reporter: { select: { id: true, name: true, email: true } },
        resolver: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({
      claim: {
        id: claim.id,
        status: claim.status,
        resolution: claim.resolution,
        actualCost: claim.actualCost?.toString() ?? null,
        resolvedBy: claim.resolvedBy,
        resolvedAt: claim.resolvedAt?.toISOString() ?? null,
        customerNotified: claim.customerNotified,
        booking: claim.booking,
        equipment: claim.equipment,
        studio: claim.studio,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
