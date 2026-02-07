/**
 * @file route.ts
 * @description Read-only mode toggle endpoint
 * @module app/api/admin/read-only
 *
 * Access: ADMIN only (Prisma UserRole). If SUPER_ADMIN is added to the enum,
 * include it in the role check so super-admin can toggle read-only.
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/auth/permissions'
import { PERMISSIONS } from '@/lib/auth/permissions'
import { AuditService } from '@/lib/services/audit.service'
import { rateLimitAPI } from '@/lib/utils/rate-limit'
import { getReadOnlyMode, setReadOnlyMode } from '@/lib/middleware/read-only.middleware'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const rateLimit = rateLimitAPI(request)
  
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    )
  }

  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!(await hasPermission(session.user.id, PERMISSIONS.SYSTEM_READ_ONLY_MODE))) {
      return NextResponse.json(
        { error: 'Forbidden - system.read_only_mode permission required' },
        { status: 403 }
      )
    }

    const enabled = await getReadOnlyMode()
    return NextResponse.json({ enabled })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to get read-only status' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const rateLimit = rateLimitAPI(request)
  
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    )
  }

  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    if (!(await hasPermission(session.user.id, PERMISSIONS.SYSTEM_READ_ONLY_MODE))) {
      return NextResponse.json(
        { error: 'Forbidden - system.read_only_mode permission required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { enabled } = body

    await setReadOnlyMode(enabled === true)
    const currentEnabled = await getReadOnlyMode()

    await AuditService.log({
      action: 'admin.read_only.toggle',
      userId: session.user.id,
      metadata: {
        enabled: currentEnabled,
      },
    })

    return NextResponse.json({
      enabled: currentEnabled,
      message: `Read-only mode ${currentEnabled ? 'enabled' : 'disabled'}`,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to toggle read-only mode' },
      { status: 500 }
    )
  }
}
