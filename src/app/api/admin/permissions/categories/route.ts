/**
 * @file route.ts
 * @description List permission categories
 * @module app/api/admin/permissions/categories
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'
import { rateLimitAPI } from '@/lib/utils/rate-limit'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/permissions/categories - Category list
 */
export async function GET(request: NextRequest) {
  try {
    if (!rateLimitAPI(request).allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const canManage = await hasPermission(session.user.id, PERMISSIONS.SETTINGS_MANAGE_ROLES)
    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden - Missing settings.manage_roles permission' }, { status: 403 })
    }

    const categories = await prisma.permissionCategory.findMany({
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, nameAr: true, sortOrder: true },
    })

    return NextResponse.json({ success: true, data: categories })
  } catch (error: unknown) {
    console.error('Error fetching permission categories:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    )
  }
}
