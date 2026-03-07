/**
 * GET /api/public/studios - Public studios list (no auth). Cached.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { rateLimitByTier } from '@/lib/utils/rate-limit'
import { cacheGet, cacheSet } from '@/lib/cache'
import { handleApiError } from '@/lib/utils/api-helpers'

export async function GET(request: NextRequest) {
  try {
    const rate = rateLimitByTier(request, 'public')
    if (!rate.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const cached = await cacheGet<unknown>('equipmentList', 'studios')
    if (cached) return NextResponse.json(cached)

    const studios = await prisma.studio.findMany({
      where: { deletedAt: null, isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        capacity: true,
        hourlyRate: true,
        media: { take: 1, select: { id: true, url: true, type: true } },
      },
      orderBy: { name: 'asc' },
    })

    const data = studios.map((s) => ({
      ...s,
      hourlyRate: s.hourlyRate ? Number(s.hourlyRate) : 0,
    }))

    const result = { data }
    await cacheSet('equipmentList', 'studios', result)
    return NextResponse.json(result)
  } catch (error) {
    return handleApiError(error)
  }
}
