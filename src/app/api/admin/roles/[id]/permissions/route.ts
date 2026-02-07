/**
 * @file route.ts
 * @description Replace role permissions
 * @module app/api/admin/roles/[id]/permissions
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { RoleService } from '@/lib/auth/role-service'
import { rateLimitAPI } from '@/lib/utils/rate-limit'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  permissionIds: z.array(z.string().cuid()),
})

/**
 * POST /api/admin/roles/[id]/permissions - Replace all permissions for role
 */
export async function POST(
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
    const canManage = await hasPermission(session.user.id, PERMISSIONS.SETTINGS_MANAGE_ROLES)
    if (!canManage) {
      return NextResponse.json({ error: 'Forbidden - Missing settings.manage_roles permission' }, { status: 403 })
    }

    const p = await Promise.resolve(params)
    const roleId = p.id
    const body = await request.json()
    const { permissionIds } = bodySchema.parse(body)

    await RoleService.setPermissions(roleId, permissionIds, session.user.id)
    await RoleService.invalidateUsersWithRole(roleId)

    const role = await RoleService.getById(roleId)
    return NextResponse.json({ success: true, data: role })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('Error updating role permissions:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    )
  }
}
