/**
 * GET /api/public/policies - Active policy items for policies page (no auth). Cached in service.
 */

import { NextRequest, NextResponse } from 'next/server'
import { rateLimitByTier } from '@/lib/utils/rate-limit'
import { PolicyService } from '@/lib/services/policy.service'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const rate = rateLimitByTier(request, 'public')
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const items = await PolicyService.getPublicPolicies()
    return NextResponse.json({ data: items })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
