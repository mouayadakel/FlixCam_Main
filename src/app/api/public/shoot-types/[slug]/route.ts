/**
 * GET /api/public/shoot-types/[slug] - Full shoot type config (flows + recommendations). Cached.
 */

import { NextRequest, NextResponse } from 'next/server'
import { rateLimitByTier } from '@/lib/utils/rate-limit'
import { ShootTypeService } from '@/lib/services/shoot-type.service'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const rate = rateLimitByTier(request, 'public')
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { slug } = await params
  const config = await ShootTypeService.getBySlug(slug)
  if (!config) {
    return NextResponse.json({ error: 'Shoot type not found' }, { status: 404 })
  }
  return NextResponse.json(config)
}
