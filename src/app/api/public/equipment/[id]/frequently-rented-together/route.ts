/**
 * GET /api/public/equipment/[id]/frequently-rented-together
 * Returns equipment frequently rented with the given item.
 */

import { NextRequest, NextResponse } from 'next/server'
import { bundleRecommendationsService } from '@/lib/services/bundle-recommendations.service'
import { rateLimitByTier } from '@/lib/utils/rate-limit'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const rate = rateLimitByTier(request, 'public')
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { id } = await params
  if (!id) {
    return NextResponse.json({ error: 'Missing equipment ID' }, { status: 400 })
  }

  const result = await bundleRecommendationsService.getFrequentlyRentedTogether(id)
  return NextResponse.json(result)
}
