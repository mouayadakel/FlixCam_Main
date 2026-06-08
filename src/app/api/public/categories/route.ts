/**
 * GET /api/public/categories - Public categories list (no auth). Cached.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { rateLimitByTier } from '@/lib/utils/rate-limit'
import { cacheGet, cacheSet } from '@/lib/cache'
import { LOCALE_COOKIE_NAME } from '@/lib/i18n/cookie'
import { parseLocale } from '@/lib/i18n/locales'

export async function GET(request: NextRequest) {
  const rate = rateLimitByTier(request, 'public')
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const locale = parseLocale(request.cookies.get(LOCALE_COOKIE_NAME)?.value)

  const skipCache = process.env.NODE_ENV === 'development'
  const cacheKey = `categories:v3:${locale}`
  if (!skipCache) {
    const cached = await cacheGet<unknown>('websiteContent', cacheKey)
    if (cached) return NextResponse.json(cached)
  }

  const categories = await prisma.category.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      nameAr: true,
      nameEn: true,
      nameZh: true,
      nameFr: true,
      slug: true,
      description: true,
      parentId: true,
      sortOrder: true,
      _count: { select: { equipment: true } },
    },
    orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }, { name: 'asc' }],
  })

  const shaped = categories.map((c) => ({
    id: c.id,
    name:
      locale === 'ar'
        ? c.nameAr ?? c.name
        : locale === 'en'
          ? c.nameEn ?? c.name
          : locale === 'zh'
            ? c.nameZh ?? c.name
            : locale === 'fr'
              ? c.nameFr ?? c.name
              : c.name,
    slug: c.slug,
    description: c.description ?? null,
    parentId: c.parentId ?? null,
    sortOrder: c.sortOrder ?? 0,
    equipmentCount: c._count.equipment,
  }))

  // If sortOrder ties (common when not configured), fall back to popularity signal (equipmentCount desc).
  // Keep parents before children to preserve hierarchy UX.
  const data = shaped.sort((a, b) => {
    const parentA = a.parentId ?? ''
    const parentB = b.parentId ?? ''
    if (parentA !== parentB) return parentA.localeCompare(parentB)
    if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder
    if (a.equipmentCount !== b.equipmentCount) return b.equipmentCount - a.equipmentCount
    return a.name.localeCompare(b.name, 'ar')
  })

  const result = { data }
  await cacheSet('websiteContent', cacheKey, result)
  return NextResponse.json(result)
}
