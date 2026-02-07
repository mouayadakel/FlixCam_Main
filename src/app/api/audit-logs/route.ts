/**
 * @file route.ts
 * @description Audit logs API endpoint
 * @module app/api/audit-logs
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { AuditService } from '@/lib/services/audit.service'
import { rateLimitAPI } from '@/lib/utils/rate-limit'
import { hasPermission } from '@/lib/auth/permissions'

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

    // Check permission
    const canView = await hasPermission(session.user.id, 'audit.read' as any)
    if (!canView) {
      return NextResponse.json(
        { error: 'Forbidden - Missing audit.read permission' },
        { status: 403 }
      )
    }

    const { searchParams } = new URL(request.url)
    const resourceType = searchParams.get('resourceType')
    const resourceId = searchParams.get('resourceId')
    const action = searchParams.get('action')
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const logs = await AuditService.getLogs({
      resourceType: resourceType || undefined,
      resourceId: resourceId || undefined,
      action: action || undefined,
      limit,
      offset,
    })

    return NextResponse.json({ logs })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch audit logs' },
      { status: 500 }
    )
  }
}
