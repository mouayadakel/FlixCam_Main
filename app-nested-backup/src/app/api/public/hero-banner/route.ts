/**
 * GET /api/public/hero-banner - Active hero banner and slides for a page (no auth). Cached.
 */

import { NextRequest, NextResponse } from 'next/server'
import { rateLimitByTier } from '@/lib/utils/rate-limit'
import { cacheGet, cacheSet } from '@/lib/cache'
import { HeroBannerService } from '@/lib/services/hero-banner.service'
import { handleApiError } from '@/lib/utils/api-helpers'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const rate = rateLimitByTier(request, 'public')
    if (!rate.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const { searchParams } = new URL(request.url)
    const page = searchParams.get('page') ?? 'home'

    const cacheKey = `hero-banner:${page}`
    const cached = await cacheGet<{
    data: Awaited<ReturnType<typeof HeroBannerService.getActiveBannerByPage>>
    }>('websiteContent', cacheKey)
    if (cached) return NextResponse.json(cached)

    const banner = await HeroBannerService.getActiveBannerByPage(page)
    const result = { data: banner }
    await cacheSet('websiteContent', cacheKey, result)
    return NextResponse.json(result)
  } catch (error) {
    return handleApiError(error)
  }
}
