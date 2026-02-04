/**
 * @file route.ts
 * @description Role detail and permissions API
 * @module app/api/admin/roles/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { getRoleDetails } from '@/lib/auth/role-details'
import { rateLimitAPI } from '@/lib/utils/rate-limit'

// Force dynamic rendering
export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/roles/[id]
 * Get role details with permissions
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const rateLimit = rateLimitAPI(request)
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: 'Too many requests' },
        { status: 429 }
      )
    }

    const session = await auth()
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check permission
    const canView = await hasPermission(session.user.id, PERMISSIONS.SETTINGS_MANAGE_ROLES)
    if (!canView) {
      return NextResponse.json(
        { error: 'Forbidden - Missing settings.manage_roles permission' },
        { status: 403 }
      )
    }

    const resolvedParams = typeof (params as any).then === 'function' ? await params : params
    const roleId = resolvedParams.id

    // Get role details
    const roleDetails = getRoleDetails(roleId)
    if (!roleDetails) {
      return NextResponse.json(
        { error: 'Role not found' },
        { status: 404 }
      )
    }

    // Get users with this role
    const users = await prisma.user.findMany({
      where: {
        role: roleId as any,
        deletedAt: null,
      },
      select: {
        id: true,
        email: true,
        name: true,
        createdAt: true,
      },
      take: 100,
    })

    return NextResponse.json({
      success: true,
      data: {
        id: roleId,
        ...roleDetails,
        userCount: users.length,
        users,
      },
    })
  } catch (error: any) {
    console.error('Error fetching role details:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
