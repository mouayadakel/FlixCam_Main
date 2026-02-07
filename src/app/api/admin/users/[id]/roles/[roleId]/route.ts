/**
 * @file route.ts
 * @description Remove role from user
 * @module app/api/admin/users/[id]/roles/[roleId]
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { invalidatePermissionCache } from '@/lib/auth/permission-service'
import { prisma } from '@/lib/db/prisma'
import { rateLimitAPI } from '@/lib/utils/rate-limit'

export const dynamic = 'force-dynamic'

/**
 * DELETE /api/admin/users/[id]/roles/[roleId] - Remove role from user
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; roleId: string } | Promise<{ id: string; roleId: string }> }
) {
  try {
    if (!rateLimitAPI(request).allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const canAssign = await hasPermission(session.user.id, PERMISSIONS.USER_ASSIGN_ROLE)
    if (!canAssign) {
      return NextResponse.json({ error: 'Forbidden - Missing user.assign_role permission' }, { status: 403 })
    }

    const p = await Promise.resolve(params)
    const { id: userId, roleId } = p

    const deleted = await prisma.assignedUserRole.deleteMany({
      where: { userId, roleId },
    })

    if (deleted.count === 0) {
      return NextResponse.json({ error: 'User role not found' }, { status: 404 })
    }

    await invalidatePermissionCache(userId)

    return NextResponse.json({ success: true, message: 'Role removed' })
  } catch (error: unknown) {
    console.error('Error removing user role:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    )
  }
}
