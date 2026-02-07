/**
 * @file route.ts
 * @description List all permissions grouped by category
 * @module app/api/admin/permissions
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'
import { rateLimitAPI } from '@/lib/utils/rate-limit'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/permissions - All permissions grouped by category
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
      where: {},
      include: {
        permissions: {
          where: { deletedAt: null },
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            name: true,
            description: true,
            descriptionAr: true,
            isSystem: true,
            sortOrder: true,
          },
        },
      },
      orderBy: { sortOrder: 'asc' },
    })

    return NextResponse.json({ success: true, data: categories })
  } catch (error: unknown) {
    console.error('Error fetching permissions:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    )
  }
}
