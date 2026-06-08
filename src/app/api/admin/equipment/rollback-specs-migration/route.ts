/**
 * POST /api/admin/equipment/rollback-specs-migration
 * Restores specifications from customFields.specificationsPreMigrationBackup.
 * Requires equipment.update permission.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

type RollbackRequest = {
  equipmentId?: string
  equipmentIds?: string[]
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!(await hasPermission(session.user.id, PERMISSIONS.EQUIPMENT_UPDATE))) {
    return NextResponse.json({ error: 'Forbidden - equipment.update required' }, { status: 403 })
  }

  const body = ((await request.json().catch(() => ({}))) ?? {}) as RollbackRequest
  const ids = new Set<string>()
  if (body.equipmentId) ids.add(body.equipmentId)
  for (const id of body.equipmentIds ?? []) ids.add(id)

  const where = {
    deletedAt: null,
    ...(ids.size > 0 ? { id: { in: Array.from(ids) } } : {}),
  }

  const equipment = await prisma.equipment.findMany({
    where,
    select: {
      id: true,
      sku: true,
      customFields: true,
    },
  })

  let restored = 0
  let skippedNoBackup = 0
  const failed: Array<{ sku: string; error: string }> = []

  for (const item of equipment) {
    const customFields =
      item.customFields && typeof item.customFields === 'object'
        ? (item.customFields as Record<string, unknown>)
        : null
    const backup = customFields?.specificationsPreMigrationBackup
    if (!backup || typeof backup !== 'object') {
      skippedNoBackup++
      continue
    }

    try {
      const nextCustomFields = { ...customFields }
      delete nextCustomFields.specificationsPreMigrationBackup
      await prisma.equipment.update({
        where: { id: item.id },
        data: {
          specifications: backup as object,
          customFields: nextCustomFields as object,
          specSource: 'migration',
        },
      })
      restored++
    } catch (error) {
      failed.push({
        sku: item.sku,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return NextResponse.json({
    ok: true,
    summary: {
      totalMatched: equipment.length,
      restored,
      skippedNoBackup,
      failed: failed.length,
    },
    failed: failed.length > 0 ? failed : undefined,
  })
}

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed. Use POST to rollback specs migration.' },
    { status: 405 }
  )
}

