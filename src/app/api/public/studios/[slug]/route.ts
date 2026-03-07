/**
 * GET /api/public/studios/[slug] - Single studio by slug (no auth). Cached.
 * Includes all CMS fields, packages, faqs, media (ordered).
 */

import { NextRequest, NextResponse } from 'next/server'
import { StudioService } from '@/lib/services/studio.service'
import { rateLimitByTier } from '@/lib/utils/rate-limit'
import { cacheGet, cacheSet } from '@/lib/cache'

export async function GET(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const rate = rateLimitByTier(request, 'public')
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { slug } = await params
  const cached = await cacheGet<unknown>('equipmentDetail', `studio:${slug}`)
  if (cached) return NextResponse.json(cached)

  const studio = await StudioService.getBySlugPublic(slug)
  if (!studio) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const out = {
    ...studio,
    hourlyRate: studio.hourlyRate ? Number(studio.hourlyRate) : 0,
    dailyRate: studio.dailyRate ? Number(studio.dailyRate) : null,
    addOns: studio.addOns?.map((a) => ({ ...a, price: a.price ? Number(a.price) : 0 })) ?? [],
    packages:
      studio.packages?.map((p) => ({
        ...p,
        price: p.price ? Number(p.price) : 0,
        originalPrice: p.originalPrice ? Number(p.originalPrice) : null,
      })) ?? [],
  }
  await cacheSet('equipmentDetail', `studio:${slug}`, out)
  return NextResponse.json(out)
}
