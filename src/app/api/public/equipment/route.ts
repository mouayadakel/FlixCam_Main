/**
 * GET /api/public/equipment - Public equipment list (no auth). Rate limited, cached.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { rateLimitByTier } from '@/lib/utils/rate-limit'
import { cacheGet, cacheSet, cacheKeys } from '@/lib/cache'

export async function GET(request: NextRequest) {
  const rate = rateLimitByTier(request, 'public')
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const searchParams = request.nextUrl.searchParams
  const categoryId = searchParams.get('categoryId') ?? undefined
  const brandId = searchParams.get('brandId') ?? undefined
  const featured = searchParams.get('featured') === 'true'
  const skip = Math.min(parseInt(searchParams.get('skip') ?? '0', 10), 500)
  const take = Math.min(parseInt(searchParams.get('take') ?? '24', 10), 100)
  const cacheKey = `cat=${categoryId ?? ''}&brand=${brandId ?? ''}&feat=${featured}&s=${skip}&t=${take}`

  const cached = await cacheGet<{ data: unknown[]; total: number }>(
    'equipmentList',
    cacheKey
  )
  if (cached) {
    return NextResponse.json(cached)
  }

  const where: { deletedAt: null; isActive?: boolean; featured?: boolean; categoryId?: string; brandId?: string } = {
    deletedAt: null,
    isActive: true,
  }
  if (featured) where.featured = true
  if (categoryId) where.categoryId = categoryId
  if (brandId) where.brandId = brandId

  const [data, total] = await Promise.all([
    prisma.equipment.findMany({
      where,
      skip,
      take,
      select: {
        id: true,
        sku: true,
        model: true,
        categoryId: true,
        brandId: true,
        dailyPrice: true,
        weeklyPrice: true,
        monthlyPrice: true,
        featured: true,
        quantityAvailable: true,
        category: { select: { id: true, name: true, slug: true } },
        brand: { select: { id: true, name: true, slug: true } },
        media: { take: 1, select: { id: true, url: true, type: true } },
      },
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.equipment.count({ where }),
  ])

  const result = {
    data: data.map((e) => ({
      ...e,
      dailyPrice: e.dailyPrice ? Number(e.dailyPrice) : 0,
      weeklyPrice: e.weeklyPrice ? Number(e.weeklyPrice) : null,
      monthlyPrice: e.monthlyPrice ? Number(e.monthlyPrice) : null,
    })),
    total,
  }
  await cacheSet('equipmentList', cacheKey, result)
  return NextResponse.json(result)
}
