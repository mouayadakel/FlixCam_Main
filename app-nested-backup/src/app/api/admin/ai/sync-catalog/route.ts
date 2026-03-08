/**
 * POST /api/admin/ai/sync-catalog
 * Syncs all Equipment to Product so the AI dashboard has catalog data.
 * Use when the dashboard shows "no products" but you have Equipment (e.g. after seed without Product sync).
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasAIPermission } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'
import { syncEquipmentToProduct } from '@/lib/services/product-equipment-sync.service'
import { getRedisClient } from '@/lib/queue/redis.client'

const QUALITY_SCAN_CACHE_KEY = 'content-health-scan'

export const dynamic = 'force-dynamic'

export async function POST() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!(await hasAIPermission(session.user.id, 'view'))) {
    return NextResponse.json({ error: 'Forbidden - ai.use required' }, { status: 403 })
  }

  try {
    const equipment = await prisma.equipment.findMany({
      where: { deletedAt: null, brandId: { not: null } },
      select: { id: true },
    })
    let synced = 0
    const errors: string[] = []
    for (const eq of equipment) {
      try {
        await syncEquipmentToProduct(eq.id)
        synced++
      } catch (e) {
        errors.push(`${eq.id}: ${e instanceof Error ? e.message : 'Unknown error'}`)
      }
    }
    try {
      const redis = getRedisClient()
      await redis.del(QUALITY_SCAN_CACHE_KEY)
    } catch {
      // ignore cache invalidation failure
    }
    return NextResponse.json({
      synced,
      total: equipment.length,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
    })
  } catch (error) {
    console.error('Sync catalog failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Sync catalog failed' },
      { status: 500 }
    )
  }
}
