/**
 * @file route.ts
 * @description Role management API - list and create roles from DB
 * @module app/api/admin/roles
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { RoleService } from '@/lib/auth/role-service'
import { rateLimitAPI } from '@/lib/utils/rate-limit'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const createRoleSchema = z.object({
  name: z.string().min(1).max(100).regex(/^[a-z0-9_]+$/, 'Use lowercase letters, numbers, underscore only'),
  displayName: z.string().min(1).max(100),
  displayNameAr: z.string().max(100).optional(),
  description: z.string().max(500).optional(),
  color: z.string().max(20).optional(),
  permissionIds: z.array(z.string().cuid()).default([]),
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

/**
 * GET /api/admin/roles - List roles from DB
 */
export async function GET(request: NextRequest) {
  try {
    if (!rateLimitAPI(request).allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    const authResult = await requireAuthAndRolesPermission()
    if (authResult.error) return authResult.error

    const { searchParams } = new URL(request.url)
    const isSystem = searchParams.get('isSystem')
    const filters = isSystem !== null && isSystem !== undefined
      ? { isSystem: isSystem === 'true' }
      : undefined

    const roles = await RoleService.list(filters)
    return NextResponse.json({ success: true, data: roles })
  } catch (error: unknown) {
    console.error('Error fetching roles:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    )
  }
}

/**
 * POST /api/admin/roles - Create custom role
 */
export async function POST(request: NextRequest) {
  try {
    if (!rateLimitAPI(request).allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    const authResult = await requireAuthAndRolesPermission()
    if (authResult.error) return authResult.error
    const { session } = authResult

    const body = await request.json()
    const validated = createRoleSchema.parse(body)

    const role = await RoleService.create(
      {
        name: validated.name,
        displayName: validated.displayName,
        displayNameAr: validated.displayNameAr,
        description: validated.description,
        color: validated.color,
        permissionIds: validated.permissionIds,
      },
      session!.user.id
    )
    return NextResponse.json({ success: true, data: role })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.errors }, { status: 400 })
    }
    console.error('Error creating role:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    )
  }
}
