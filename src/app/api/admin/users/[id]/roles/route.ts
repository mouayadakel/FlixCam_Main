/**
 * @file route.ts
 * @description User role assignment API
 * @module app/api/admin/users/[id]/roles
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { RoleService } from '@/lib/auth/role-service'
import { invalidatePermissionCache } from '@/lib/auth/permission-service'
import { prisma } from '@/lib/db/prisma'
import { rateLimitAPI } from '@/lib/utils/rate-limit'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const assignRoleSchema = z.object({
  roleId: z.string().cuid(),
  isPrimary: z.boolean().optional().default(false),
  expiresAt: z.string().datetime().optional().nullable(),
})

async function requireAuthAndAssignRole() {
  const session = await auth()
  if (!session?.user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  const canAssign = await hasPermission(session.user.id, PERMISSIONS.USER_ASSIGN_ROLE)
  if (!canAssign) {
    return {
      error: NextResponse.json(
        { error: 'Forbidden - Missing user.assign_role permission' },
        { status: 403 }
      ),
    }
  }
  return { session }
}

/**
 * GET /api/admin/users/[id]/roles - List user's assigned roles
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!rateLimitAPI(request).allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    const authResult = await requireAuthAndAssignRole()
    if (authResult.error) return authResult.error

    const { id: userId } = await params

    const userRoles = await prisma.assignedUserRole.findMany({
      where: {
        userId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            displayName: true,
            displayNameAr: true,
            color: true,
          },
        },
      },
    })

    return NextResponse.json({
      success: true,
      data: userRoles.map((ur) => ({
        id: ur.id,
        roleId: ur.roleId,
        role: ur.role,
        isPrimary: ur.isPrimary,
        assignedAt: ur.assignedAt,
        expiresAt: ur.expiresAt,
      })),
    })
  } catch (error: unknown) {
    console.error('Error fetching user roles:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/users/[id]/roles - Assign role to user
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    if (!rateLimitAPI(request).allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    const authResult = await requireAuthAndAssignRole()
    if (authResult.error) return authResult.error
    const { session } = authResult

    const { id: userId } = await params
    const body = await request.json()
    const { roleId, isPrimary, expiresAt } = assignRoleSchema.parse(body)

    const conflict = await RoleService.checkRoleConflicts(userId, roleId)
    if (conflict.hasStaticConflict) {
      return NextResponse.json(
        { error: 'Role conflict', details: conflict.staticConflictReason },
        { status: 400 }
      )
    }

    const existing = await prisma.assignedUserRole.findUnique({
      where: {
        userId_roleId: { userId, roleId },
      },
    })
    if (existing) {
      return NextResponse.json({ error: 'User already has this role' }, { status: 400 })
    }

    const userRole = await prisma.assignedUserRole.create({
      data: {
        userId,
        roleId,
        isPrimary: isPrimary ?? false,
        assignedBy: session!.user.id,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            displayName: true,
            displayNameAr: true,
            color: true,
          },
        },
      },
    })

    await invalidatePermissionCache(userId)

    return NextResponse.json({
      success: true,
      data: userRole,
      warning: conflict.hasDynamicWarning
        ? {
            message: 'Permission overlap with existing roles',
            permissions: conflict.dynamicWarningPermissions,
          }
        : undefined,
    })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error assigning role:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    )
  }
}
