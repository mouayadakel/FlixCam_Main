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
  const brandIdsRaw = searchParams.get('brandIds')
  const brandIds = brandIdsRaw
    ? brandIdsRaw.split(',').map((s) => s.trim()).filter(Boolean)
    : undefined
  const q = searchParams.get('q')?.trim() ?? undefined
  const sort = searchParams.get('sort') ?? 'recommended'
  const priceMin = searchParams.get('priceMin')
  const priceMax = searchParams.get('priceMax')
  const priceMinNum = priceMin != null ? parseInt(priceMin, 10) : undefined
  const priceMaxNum = priceMax != null ? parseInt(priceMax, 10) : undefined
  const featured = searchParams.get('featured') === 'true'
  const skip = Math.min(parseInt(searchParams.get('skip') ?? '0', 10), 500)
  const take = Math.min(parseInt(searchParams.get('take') ?? '24', 10), 100)
  const cacheKey = `cat=${categoryId ?? ''}&brand=${brandId ?? ''}&bids=${brandIds?.join(',') ?? ''}&q=${q ?? ''}&sort=${sort}&pmin=${priceMinNum ?? ''}&pmax=${priceMaxNum ?? ''}&feat=${featured}&s=${skip}&t=${take}`

  const cached = await cacheGet<{ data: unknown[]; total: number }>(
    'equipmentList',
    cacheKey
  )
  if (cached) {
    return NextResponse.json(cached)
  }

  const dailyPriceRange: { gte?: number; lte?: number } = {}
  if (priceMinNum != null && !Number.isNaN(priceMinNum)) dailyPriceRange.gte = priceMinNum
  if (priceMaxNum != null && !Number.isNaN(priceMaxNum)) dailyPriceRange.lte = priceMaxNum

  const where = {
    deletedAt: null,
    isActive: true,
    ...(featured && { featured: true }),
    ...(categoryId && { categoryId }),
    ...(brandIds?.length ? { brandId: { in: brandIds } } : brandId ? { brandId } : {}),
    ...(Object.keys(dailyPriceRange).length > 0 && { dailyPrice: dailyPriceRange }),
    ...(q && {
      OR: [
        { model: { contains: q, mode: 'insensitive' as const } },
        { sku: { contains: q, mode: 'insensitive' as const } },
        { category: { name: { contains: q, mode: 'insensitive' as const } } },
        { brand: { name: { contains: q, mode: 'insensitive' as const } } },
      ],
    }),
  }

  const orderBy: { dailyPrice?: 'asc' | 'desc'; createdAt?: 'desc'; featured?: 'desc' }[] =
    sort === 'price_asc'
      ? [{ dailyPrice: 'asc' }]
      : sort === 'price_desc'
        ? [{ dailyPrice: 'desc' }]
        : sort === 'newest'
          ? [{ createdAt: 'desc' }]
          : [{ featured: 'desc' }, { createdAt: 'desc' }]

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
        vendor: { select: { companyName: true, isNameVisible: true } },
      },
      orderBy,
    }),
    prisma.equipment.count({ where }),
  ])

  const result = {
    data: data.map((e) => {
      const v = e.vendor as { companyName: string; isNameVisible: boolean } | null
      const vendor = v?.isNameVisible ? { companyName: v.companyName } : null
      const { vendor: _v, ...rest } = e
      return {
        ...rest,
        vendor,
        dailyPrice: e.dailyPrice ? Number(e.dailyPrice) : 0,
        weeklyPrice: e.weeklyPrice ? Number(e.weeklyPrice) : null,
        monthlyPrice: e.monthlyPrice ? Number(e.monthlyPrice) : null,
      }
    }),
    total,
  }
  await cacheSet('equipmentList', cacheKey, result)
  return NextResponse.json(result)
}
