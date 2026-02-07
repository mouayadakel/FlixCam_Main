/**
 * @file route.ts
 * @description Role detail API - get, update, delete
 * @module app/api/admin/roles/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { RoleService } from '@/lib/auth/role-service'
import { rateLimitAPI } from '@/lib/utils/rate-limit'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const updateRoleSchema = z.object({
  displayName: z.string().min(1).max(100).optional(),
  displayNameAr: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  color: z.string().max(20).optional(),
  permissionIds: z.array(z.string().cuid()).optional(),
})

async function requireAuthAndRolesPermission() {
  const session = await auth()
  if (!session?.user) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  const canManage = await hasPermission(session.user.id, PERMISSIONS.SETTINGS_MANAGE_ROLES)
  if (!canManage) {
    return { error: NextResponse.json({ error: 'Forbidden - Missing settings.manage_roles permission' }, { status: 403 }) }
  }
  return { session }
}

async function resolveRoleId(params: { id: string } | Promise<{ id: string }>): Promise<string> {
  const p = await Promise.resolve(params)
  return p.id
}

/**
 * GET /api/admin/roles/[id] - Get role with permissions
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    if (!rateLimitAPI(request).allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    const authResult = await requireAuthAndRolesPermission()
    if (authResult.error) return authResult.error

    const roleId = await resolveRoleId(params)
    const role = await RoleService.getById(roleId)
    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: role })
  } catch (error: unknown) {
    console.error('Error fetching role:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/admin/roles/[id] - Update role (custom only)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    if (!rateLimitAPI(request).allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    const authResult = await requireAuthAndRolesPermission()
    if (authResult.error) return authResult.error
    const { session } = authResult

    const roleId = await resolveRoleId(params)
    const body = await request.json()
    const validated = updateRoleSchema.parse(body)

    const role = await RoleService.update(
      roleId,
      {
        displayName: validated.displayName,
        displayNameAr: validated.displayNameAr,
        description: validated.description,
        color: validated.color,
        permissionIds: validated.permissionIds,
      },
      session!.user.id
    )
    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: role })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    if ((error as Error).message?.includes('Cannot edit system')) {
      return NextResponse.json({ error: (error as Error).message }, { status: 400 })
    }
    console.error('Error updating role:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/admin/roles/[id] - Soft delete role (custom only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } | Promise<{ id: string }> }
) {
  try {
    if (!rateLimitAPI(request).allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    const authResult = await requireAuthAndRolesPermission()
    if (authResult.error) return authResult.error

    const roleId = await resolveRoleId(params)
    const result = await RoleService.delete(roleId)
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }
    return NextResponse.json({ success: true, message: 'Role deleted' })
  } catch (error: unknown) {
    console.error('Error deleting role:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    )
  }
}
