/**
 * @file route.ts
 * @description API endpoint for AI provider comparison (Gemini vs OpenAI stats).
 * @module app/api/admin/ai/analytics/providers
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { rateLimitAPI } from '@/lib/utils/rate-limit'
import { getProviderStats } from '@/lib/services/ai-analytics.service'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/ai/analytics/providers
 * Return provider comparison stats (jobs, cost, approval rate, avg time, errors).
 */
export async function GET(request: NextRequest) {
  const rateLimit = rateLimitAPI(request)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!(await hasPermission(session.user.id, PERMISSIONS.DASHBOARD_ANALYTICS))) {
    return NextResponse.json({ error: 'Forbidden - dashboard.analytics required' }, { status: 403 })
  }

  try {
    const stats = await getProviderStats()
    return NextResponse.json({ providers: stats })
  } catch (error: any) {
    console.error('Failed to get provider stats:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get provider stats' },
      { status: 500 }
    )
  }
}
