/**
 * GET /api/public/categories - Public categories list (no auth). Cached.
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

    const skipCache = process.env.NODE_ENV === 'development'
    if (!skipCache) {
      const cached = await cacheGet<unknown>('websiteContent', 'categories')
      if (cached) return NextResponse.json(cached)
    }

    const categories = await prisma.category.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        parentId: true,
        _count: { select: { equipment: true } },
      },
      orderBy: [{ parentId: 'asc' }, { name: 'asc' }],
    })

    const data = categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      description: c.description ?? null,
      parentId: c.parentId ?? null,
      equipmentCount: c._count.equipment,
    }))

    const result = { data }
    await cacheSet('websiteContent', 'categories', result)
    return NextResponse.json(result)
  } catch (error) {
    return handleApiError(error)
  }
}
