/**
 * @file route.ts
 * @description List users assigned to a role
 * @module app/api/admin/roles/[id]/users
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'
import { rateLimitAPI } from '@/lib/utils/rate-limit'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/roles/[id]/users
 * Returns users assigned to this role
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    if (!rateLimitAPI(request).allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const canView = await hasPermission(session.user.id, PERMISSIONS.USER_READ)
    if (!canView) {
      return NextResponse.json(
        { error: 'Forbidden - Missing user.read permission' },
        { status: 403 }
      )
    }

    const p = await Promise.resolve(params)
    const roleId = p.id

    const role = await prisma.role.findFirst({
      where: { id: roleId, deletedAt: null },
      select: { id: true, displayName: true, displayNameAr: true },
    })

    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }

    const assigned = await prisma.assignedUserRole.findMany({
      where: {
        roleId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            createdAt: true,
          },
        },
      },
    })

    const users = assigned.map((ur) => ({
      id: ur.user.id,
      email: ur.user.email,
      name: ur.user.name,
      role: ur.user.role,
      createdAt: ur.user.createdAt,
      assignedAt: ur.assignedAt,
      isPrimary: ur.isPrimary,
      assignedUserRoleId: ur.id,
    }))

    return NextResponse.json({
      success: true,
      data: {
        role,
        users,
      },
    })
  } catch (error: unknown) {
    console.error('Error fetching role users:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    )
  }
}
