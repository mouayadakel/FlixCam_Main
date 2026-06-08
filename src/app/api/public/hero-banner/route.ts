/**
 * GET /api/public/hero-banner - Active hero banner and slides for a page (no auth).
 * Caching is handled inside HeroBannerService (Redis); do not duplicate keys here.
 */

import { NextRequest, NextResponse } from 'next/server'
import { rateLimitByTier } from '@/lib/utils/rate-limit'
import { HeroBannerService } from '@/lib/services/hero-banner.service'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const rate = rateLimitByTier(request, 'public')
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { searchParams } = new URL(request.url)
  const page = searchParams.get('page') ?? 'home'

  const banner = await HeroBannerService.getActiveBannerByPage(page)
  return NextResponse.json({ data: banner })
}
