/**
 * GET /api/public/branches - Public active branches list (no auth). Cached.
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

  const cached = await cacheGet<unknown>('websiteContent', 'public-branches')
  if (cached) return NextResponse.json(cached)

  const branches = await prisma.branch.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      nameAr: true,
      city: true,
      address: true,
    },
    orderBy: { name: 'asc' },
  })

  const result = { data: branches }
  await cacheSet('websiteContent', 'public-branches', result)
  return NextResponse.json(result)
}
