/**
 * PATCH /api/admin/equipment/[id]/budget-tier - Set budget tier on equipment
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { rateLimitAPI } from '@/lib/utils/rate-limit'
import { prisma } from '@/lib/db/prisma'
import { setBudgetTierSchema } from '@/lib/validators/shoot-type.validator'
import { NotFoundError } from '@/lib/errors'
import type { BudgetTier } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rateLimit = rateLimitAPI(request)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!(await hasPermission(session.user.id, PERMISSIONS.EQUIPMENT_UPDATE))) {
    return NextResponse.json({ error: 'Forbidden - equipment.update required' }, { status: 403 })
  }

  try {
    const { id } = await params
    const body = await request.json()
    const { budgetTier } = setBudgetTierSchema.parse(body)

    const equipment = await prisma.equipment.findFirst({
      where: { id, deletedAt: null },
    })
    if (!equipment) {
      throw new NotFoundError('Equipment', id)
    }

    await prisma.equipment.update({
      where: { id },
      data: { budgetTier: budgetTier as BudgetTier | null },
    })

    return NextResponse.json({ success: true, budgetTier: budgetTier ?? null })
  } catch (error) {
    if (error instanceof NotFoundError) {
      return NextResponse.json({ error: error.message }, { status: 404 })
    }
    if (error instanceof Error && 'issues' in error) {
      return NextResponse.json(
        { error: 'Validation failed', details: (error as { issues: unknown }).issues },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
