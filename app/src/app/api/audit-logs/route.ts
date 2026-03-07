/**
 * @file route.ts
 * @description Audit logs API endpoint
 * @module app/api/audit-logs
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { AuditService } from '@/lib/services/audit.service'
import { rateLimitAPI } from '@/lib/utils/rate-limit'

export async function GET(request: Request) {
  const rateLimit = rateLimitAPI(request)

  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const canView = await hasPermission(session.user.id, PERMISSIONS.AUDIT_READ)
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
    const userId = searchParams.get('userId')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 200)
    const offset = parseInt(searchParams.get('offset') || '0', 10)

    const logs = await AuditService.getLogs({
      resourceType: resourceType || undefined,
      resourceId: resourceId || undefined,
      action: action || undefined,
      userId: userId || undefined,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(dateTo) : undefined,
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
