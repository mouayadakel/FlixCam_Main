/**
 * GET /api/public/equipment - Public equipment list (no auth). Rate limited, cached.
 */

import { NextRequest, NextResponse } from 'next/server'
import type { BudgetTier } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { rateLimitByTier } from '@/lib/utils/rate-limit'
import { cacheGet, cacheSet, cacheKeys } from '@/lib/cache'
import { LOCALE_COOKIE_NAME } from '@/lib/i18n/cookie'
import { parseLocale } from '@/lib/i18n/locales'
import { expandSearchQuery } from '@/lib/utils/semantic-search.utils'

const BUDGET_TIERS: BudgetTier[] = ['ESSENTIAL', 'PROFESSIONAL', 'PREMIUM']

export async function GET(request: NextRequest) {
  const rate = rateLimitByTier(request, 'public')
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const locale = parseLocale(request.cookies.get(LOCALE_COOKIE_NAME)?.value)

  const searchParams = request.nextUrl.searchParams
  const categoryId = searchParams.get('categoryId') ?? undefined
  const brandId = searchParams.get('brandId') ?? undefined
  const brandIdsRaw = searchParams.get('brandIds')
  const brandIds = brandIdsRaw
    ? brandIdsRaw
        .split(',')
        .map((s: string) => s.trim())
        .filter(Boolean)
    : undefined
  const q = searchParams.get('q')?.trim() ?? undefined
  const sort = searchParams.get('sort') ?? 'recommended'
  const priceMin = searchParams.get('priceMin')
  const priceMax = searchParams.get('priceMax')
  const priceMinNum = priceMin != null ? parseInt(priceMin, 10) : undefined
  const priceMaxNum = priceMax != null ? parseInt(priceMax, 10) : undefined
  const featured = searchParams.get('featured') === 'true'
  const budgetTier = searchParams.get('budgetTier') ?? undefined
  const shootTypeSlug = searchParams.get('shootTypeSlug') ?? undefined
  const skip = Math.min(parseInt(searchParams.get('skip') ?? '0', 10), 500)
  const take = Math.min(parseInt(searchParams.get('take') ?? '24', 10), 100)

  /** Listing API filters by DB category id; accept slug (e.g. cameras) for backwards compatibility. */
  let resolvedCategoryId: string | undefined
  if (categoryId) {
    const byId = await prisma.category.findFirst({
      where: { id: categoryId, deletedAt: null },
      select: { id: true },
    })
    if (byId) {
      resolvedCategoryId = byId.id
    } else {
      const bySlug = await prisma.category.findFirst({
        where: { slug: categoryId, deletedAt: null },
        select: { id: true },
      })
      if (bySlug) resolvedCategoryId = bySlug.id
    }
  }

  const catCacheKey =
    resolvedCategoryId != null
      ? resolvedCategoryId
      : categoryId
        ? categoryId
        : ''

  const cacheKey = `cat=${catCacheKey}&brand=${brandId ?? ''}&bids=${brandIds?.join(',') ?? ''}&q=${q ?? ''}&sort=${sort}&pmin=${priceMinNum ?? ''}&pmax=${priceMaxNum ?? ''}&feat=${featured}&bt=${budgetTier ?? ''}&st=${shootTypeSlug ?? ''}&s=${skip}&t=${take}`

  const cached = await cacheGet<{ data: unknown[]; total: number }>('equipmentList', cacheKey)
  if (cached) {
    return NextResponse.json(cached)
  }

  const dailyPriceRange: { gte?: number; lte?: number } = {}
  if (priceMinNum != null && !Number.isNaN(priceMinNum)) dailyPriceRange.gte = priceMinNum
  if (priceMaxNum != null && !Number.isNaN(priceMaxNum)) dailyPriceRange.lte = priceMaxNum

  if (categoryId && resolvedCategoryId == null) {
    const empty = { data: [], total: 0 }
    await cacheSet('equipmentList', cacheKey, empty)
    return NextResponse.json(empty)
  }

  // Resolve subcategories so filtering by a parent also returns children's equipment
  let categoryIds: string[] | undefined
  if (resolvedCategoryId) {
    const children = await prisma.category.findMany({
      where: { parentId: resolvedCategoryId, deletedAt: null },
      select: { id: true },
    })
    categoryIds = [resolvedCategoryId, ...children.map((c: { id: string }) => c.id)]
  }


  let searchConditions: any[] = []
  if (q) {
    const expandedTerms = expandSearchQuery(q)
    searchConditions = expandedTerms.map((term) => ({
      OR: [
        { model: { contains: term, mode: 'insensitive' as const } },
        { sku: { contains: term, mode: 'insensitive' as const } },
        {
          category: {
            OR: [
              { name: { contains: term, mode: 'insensitive' as const } },
              { nameAr: { contains: term, mode: 'insensitive' as const } },
              { nameEn: { contains: term, mode: 'insensitive' as const } },
              { nameZh: { contains: term, mode: 'insensitive' as const } },
              { nameFr: { contains: term, mode: 'insensitive' as const } },
            ],
          },
        },
        { brand: { name: { contains: term, mode: 'insensitive' as const } } },
      ],
    }))
  }

  const where = {
    deletedAt: null,
    isActive: true,
    ...(featured && { featured: true }),
    ...(categoryIds ? { categoryId: { in: categoryIds } } : {}),
    ...(budgetTier &&
      BUDGET_TIERS.includes(budgetTier as BudgetTier) && { budgetTier: budgetTier as BudgetTier }),
    ...(brandIds?.length ? { brandId: { in: brandIds } } : brandId ? { brandId } : {}),
    ...(Object.keys(dailyPriceRange).length > 0 && { dailyPrice: dailyPriceRange }),
    ...(searchConditions.length > 0 && {
      OR: searchConditions,
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
        category: {
          select: {
            id: true,
            name: true,
            nameAr: true,
            nameEn: true,
            nameZh: true,
            nameFr: true,
            slug: true,
          },
        },
        brand: { select: { id: true, name: true, slug: true } },
        media: {
          where: { deletedAt: null, type: 'image' },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
          take: 1,
          select: { id: true, url: true, type: true },
        },
        vendor: { select: { companyName: true, isNameVisible: true } },
      },
      orderBy,
    }),
    prisma.equipment.count({ where }),
  ])

  const result = {
    data: data.map((e: any) => {
      const v = e.vendor as { companyName: string; isNameVisible: boolean } | null
      const vendor = v?.isNameVisible ? { companyName: v.companyName } : null
      const { vendor: _v, ...rest } = e
      const localizedCategoryName =
        locale === 'ar'
          ? e.category.nameAr ?? e.category.name
          : locale === 'en'
          ? e.category.nameEn ?? e.category.name
          : locale === 'zh'
            ? e.category.nameZh ?? e.category.name
            : locale === 'fr'
              ? e.category.nameFr ?? e.category.name
              : e.category.name
      return {
        ...rest,
        category: { ...e.category, name: localizedCategoryName },
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
