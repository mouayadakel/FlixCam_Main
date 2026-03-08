/**
 * @file route.ts
 * @description Clone role
 * @module app/api/admin/roles/[id]/clone
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { RoleService } from '@/lib/auth/role-service'
import { rateLimitAPI } from '@/lib/utils/rate-limit'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  newName: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9_]+$/, 'Use lowercase letters, numbers, underscore only'),
})

/**
 * POST /api/admin/roles/[id]/clone - Clone role with new name
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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
      return NextResponse.json(
        { error: 'Forbidden - Missing settings.manage_roles permission' },
        { status: 403 }
      )
    }

    const { id: roleId } = await params
    const body = await request.json()
    const { newName } = bodySchema.parse(body)

    const role = await RoleService.clone(roleId, newName, session.user.id)
    if (!role) {
      return NextResponse.json({ error: 'Role not found' }, { status: 404 })
    }
    return NextResponse.json({ success: true, data: role })
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation error', details: error.errors },
        { status: 400 }
      )
    }
    console.error('Error cloning role:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    )
  }
}
