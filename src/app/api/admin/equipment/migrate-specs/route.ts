/**
 * POST /api/admin/equipment/migrate-specs
 * Convert all equipment with flat specifications to structured format (by category template).
 * Requires equipment.update permission.
 */

import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'
import { resolveTemplateName } from '@/lib/ai/spec-templates'
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
    return NextResponse.json({ error: 'Forbidden - equipment.update required' }, { status: 403 })
  }

  const equipment = await prisma.equipment.findMany({
    where: {
      deletedAt: null,
      specifications: { not: Prisma.JsonNull },
    },
    select: {
      id: true,
      sku: true,
      model: true,
      specifications: true,
      specBlacklist: true,
      category: { select: { name: true, slug: true } },
    },
  })

  let updated = 0
  let skippedStructured = 0
  let skippedEmpty = 0
  const failed: { sku: string; error: string }[] = []

  for (const eq of equipment) {
    const rawSpecs = eq.specifications as Record<string, unknown> | null
    if (!rawSpecs || typeof rawSpecs !== 'object' || Object.keys(rawSpecs).length === 0) {
      skippedEmpty++
      continue
    }
    if (isStructuredSpecifications(rawSpecs)) {
      skippedStructured++
      continue
    }

    const blacklist = (eq.specBlacklist as string[] | null) ?? []
    const filteredSpecs = Object.fromEntries(
      Object.entries(rawSpecs).filter(([k]) => !blacklist.includes(k))
    )
    if (Object.keys(filteredSpecs).length === 0) {
      skippedEmpty++
      continue
    }

    const categoryHint = resolveTemplateName(
      eq.category?.name ?? eq.category?.slug ?? 'Equipment'
    ).toLowerCase()
    try {
      const structured = convertFlatToStructured(
        filteredSpecs as Record<string, unknown>,
        categoryHint
      )
      await prisma.equipment.update({
        where: { id: eq.id },
        data: {
          specifications: structured as object,
          specSource: 'migration',
        },
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
