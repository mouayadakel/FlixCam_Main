/**
 * POST /api/admin/equipment/migrate-specs
 * Convert all equipment with flat specifications to structured format (by category template).
 * Requires equipment.update permission.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'
import { convertFlatToStructured } from '@/lib/utils/specifications.utils'
import { isStructuredSpecifications } from '@/lib/types/specifications.types'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!(await hasPermission(session.user.id, PERMISSIONS.EQUIPMENT_UPDATE))) {
    return NextResponse.json(
      { error: 'Forbidden - equipment.update required' },
      { status: 403 }
    )
  }

  const equipment = await prisma.equipment.findMany({
    where: {
      deletedAt: null,
      specifications: { not: null },
    },
    select: {
      id: true,
      sku: true,
      model: true,
      specifications: true,
      category: { select: { name: true, slug: true } },
    },
  })

  let updated = 0
  let skippedStructured = 0
  let skippedEmpty = 0
  const failed: { sku: string; error: string }[] = []

  for (const eq of equipment) {
    const specs = eq.specifications as Record<string, unknown> | null
    if (!specs || typeof specs !== 'object' || Object.keys(specs).length === 0) {
      skippedEmpty++
      continue
    }
    if (isStructuredSpecifications(specs)) {
      skippedStructured++
      continue
    }

    const categoryHint = eq.category?.slug ?? eq.category?.name ?? undefined
    try {
      const structured = convertFlatToStructured(
        specs as Record<string, unknown>,
        categoryHint
      )
      await prisma.equipment.update({
        where: { id: eq.id },
        data: { specifications: structured as object },
      })
      updated++
    } catch (e) {
      failed.push({
        sku: eq.sku,
        error: e instanceof Error ? e.message : 'Unknown error',
      })
    }
  }

  return NextResponse.json({
    ok: true,
    summary: {
      totalWithSpecs: equipment.length,
      updated,
      skippedStructured,
      skippedEmpty,
      failed: failed.length,
    },
    failed: failed.length > 0 ? failed : undefined,
  })
}
