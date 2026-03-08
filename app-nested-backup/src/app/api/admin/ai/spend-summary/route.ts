/**
 * @file route.ts
 * @description GET AI spend summary (daily/monthly spent vs budget) for cost guardrails UI
 * @module app/api/admin/ai/spend-summary
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasAIPermission } from '@/lib/auth/permissions'
import { aiRateLimitResponse } from '@/lib/utils/rate-limit-upstash'
import { getSpendSummary } from '@/lib/utils/cost-tracker'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/ai/spend-summary
 */
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!(await hasAIPermission(session.user.id, 'view'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const rateLimitRes = await aiRateLimitResponse(request, session.user.id)
  if (rateLimitRes) return rateLimitRes

  try {
    const summary = await getSpendSummary()
    return NextResponse.json(summary)
  } catch (error) {
    console.error('Spend summary failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load spend summary' },
      { status: 500 }
    )
  }
}
