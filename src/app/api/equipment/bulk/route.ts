/**
 * @file route.ts
 * @description Bulk equipment operations API (activate, deactivate, delete)
 * @module app/api/equipment/bulk
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'
import { Prisma } from '@prisma/client'

export const dynamic = 'force-dynamic'

/**
 * POST /api/equipment/bulk
 * Body: { ids: string[], action: 'activate' | 'deactivate' | 'delete' }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { ids, action } = body as { ids: string[]; action: string }

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'No equipment IDs provided' }, { status: 400 })
    }

    if (!['activate', 'deactivate', 'delete'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Check permissions based on action
    if (action === 'delete') {
      if (!(await hasPermission(session.user.id, PERMISSIONS.EQUIPMENT_DELETE))) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    } else {
      if (!(await hasPermission(session.user.id, PERMISSIONS.EQUIPMENT_UPDATE))) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    let updated = 0

    if (action === 'activate') {
      const result = await prisma.equipment.updateMany({
        where: { id: { in: ids }, deletedAt: null },
        data: { isActive: true, updatedAt: new Date() },
      })
      updated = result.count
    } else if (action === 'deactivate') {
      const result = await prisma.equipment.updateMany({
        where: { id: { in: ids }, deletedAt: null },
        data: { isActive: false, updatedAt: new Date() },
      })
      updated = result.count
    } else if (action === 'delete') {
      await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // Soft-delete equipment
        const result = await tx.equipment.updateMany({
          where: { id: { in: ids }, deletedAt: null },
          data: { deletedAt: new Date(), isActive: false },
        })
        updated = result.count

        // Soft-delete associated products
        // We find products that are linked to these equipment IDs
        const equipment = await tx.equipment.findMany({
          where: { id: { in: ids } },
          select: { productId: true },
        })
        const productIds = equipment
          .map((e: { productId: string | null }) => e.productId)
          .filter((id: string | null): id is string => id !== null)

        if (productIds.length > 0) {
          await tx.product.updateMany({
            where: { id: { in: productIds }, deletedAt: null },
            data: { deletedAt: new Date(), deletedBy: session.user.id },
          })
        }

        // Also handle cases where equipment ID matches product ID
        await tx.product.updateMany({
          where: { id: { in: ids }, deletedAt: null },
          data: { deletedAt: new Date(), deletedBy: session.user.id },
        })
      })
    }

    // Invalidate cache
    try {
      const { cacheDelete } = await import('@/lib/cache')
      const { getRedisClient } = await import('@/lib/queue/redis.client')
      const redis = getRedisClient()
      if (redis.status === 'ready') {
        const keys = await redis.keys('cache:equipmentList:*')
        if (keys.length > 0) {
          await redis.del(...keys)
        }
      }
    } catch (cacheErr) {
      console.warn('Failed to clear cache in bulk operation', cacheErr)
    }

    return NextResponse.json({ success: true, updated })
  } catch (error) {
    console.error('Bulk equipment operation failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Bulk operation failed' },
      { status: 500 }
    )
  }
}
