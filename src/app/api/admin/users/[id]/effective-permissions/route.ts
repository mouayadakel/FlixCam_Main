/**
 * @file route.ts
 * @description User effective permissions (computed from roles + overrides)
 * @module app/api/admin/users/[id]/effective-permissions
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { getEffectivePermissions } from '@/lib/auth/permission-service'
import { rateLimitAPI } from '@/lib/utils/rate-limit'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/users/[id]/effective-permissions - Computed permissions for user
 */
export async function GET(
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
    const canView = await hasPermission(session.user.id, PERMISSIONS.USER_READ)
    if (!canView) {
      return NextResponse.json(
        { error: 'Forbidden - Missing user.read permission' },
        { status: 403 }
      )
    }

    const { id: userId } = await params

    const permissions = await getEffectivePermissions(userId)

    return NextResponse.json({ success: true, data: { permissions } })
  } catch (error: unknown) {
    console.error('Error fetching effective permissions:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: (error as Error).message },
      { status: 500 }
    )
  }
}
