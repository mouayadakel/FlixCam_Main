/**
 * GET /api/public/brands - Public brands list (no auth). Cached.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { rateLimitByTier } from '@/lib/utils/rate-limit'
import { cacheGet, cacheSet } from '@/lib/cache'

export async function GET(request: NextRequest) {
  const rate = rateLimitByTier(request, 'public')
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const cached = await cacheGet<unknown>('websiteContent', 'brands')
  if (cached) return NextResponse.json(cached)

  const brands = await prisma.brand.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      logo: true,
      _count: { select: { equipment: true } },
    },
    orderBy: { name: 'asc' },
  })

  const data = brands.map((b) => ({
    id: b.id,
    name: b.name,
    slug: b.slug,
    description: b.description ?? null,
    logo: b.logo ?? null,
    equipmentCount: b._count.equipment,
  }))

  const result = { data }
  await cacheSet('websiteContent', 'brands', result)
  return NextResponse.json(result)
}
