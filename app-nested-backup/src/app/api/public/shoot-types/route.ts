/**
 * GET /api/public/shoot-types - List active shoot types (no auth). Cached.
 */

import { NextRequest, NextResponse } from 'next/server'
import { rateLimitByTier } from '@/lib/utils/rate-limit'
import { cacheGet, cacheSet } from '@/lib/cache'
import { ShootTypeService } from '@/lib/services/shoot-type.service'
import { handleApiError } from '@/lib/utils/api-helpers'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const rate = rateLimitByTier(request, 'public')
    if (!rate.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const cached = await cacheGet<{ data: Awaited<ReturnType<typeof ShootTypeService.getAll>> }>(
      'websiteContent',
      'shoot-types-list'
    )
    if (cached) return NextResponse.json(cached)

    const list = await ShootTypeService.getAll(false)
    const result = { data: list }
    await cacheSet('websiteContent', 'shoot-types-list', result)
    return NextResponse.json(result)
  } catch (error) {
    return handleApiError(error)
  }
}
