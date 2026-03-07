/**
 * GET /api/public/packages - Public kits/packages list (no auth).
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

    const cached = await cacheGet<unknown>('websiteContent', 'packages')
    if (cached) return NextResponse.json(cached)

    const kits = await prisma.kit.findMany({
      where: { deletedAt: null, isActive: true },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        discountPercent: true,
        _count: { select: { items: true } },
      },
      orderBy: { name: 'asc' },
    })

    const data = kits.map((k) => ({
      id: k.id,
      name: k.name,
      slug: k.slug,
      description: k.description ?? null,
      discountPercent: k.discountPercent ? Number(k.discountPercent) : null,
      itemCount: k._count.items,
    }))

    const result = { data }
    await cacheSet('websiteContent', 'packages', result)
    return NextResponse.json(result)
  } catch (error) {
    return handleApiError(error)
  }
}
