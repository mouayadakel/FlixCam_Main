/**
 * @file api/reports/dashboard/route.ts
 * @description API route for dashboard statistics
 * @module api/reports
 * @author Engineering Team
 * @created 2026-01-28
 */

import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { ReportsService } from '@/lib/services/reports.service'
import { ReportsPolicy } from '@/lib/policies/reports.policy'
import { ForbiddenError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Check policy
    const policy = await ReportsPolicy.canView(userId)
    if (!policy.allowed) {
      return NextResponse.json({ error: policy.reason || 'Forbidden' }, { status: 403 })
    }

    const stats = await ReportsService.getDashboardStats(userId)

    return NextResponse.json({
      success: true,
      data: stats,
    })
  } catch (error: any) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    console.error('Get dashboard stats error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
