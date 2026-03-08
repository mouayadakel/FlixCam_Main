/**
 * @file route.ts
 * @description Bulk equipment operations API (activate, deactivate, delete)
 * @module app/api/equipment/bulk
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'

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
      const result = await prisma.equipment.updateMany({
        where: { id: { in: ids }, deletedAt: null },
        data: { deletedAt: new Date(), isActive: false },
      })
      updated = result.count
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
