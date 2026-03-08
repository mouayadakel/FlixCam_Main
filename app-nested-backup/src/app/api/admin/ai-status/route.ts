/**
 * @file route.ts
 * @description API endpoint for AI content status dashboard.
 * Returns paginated product list with AI fill completeness scores.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100)
    const filter = searchParams.get('filter') || 'all'
    const search = searchParams.get('search') || ''
    const skip = (page - 1) * limit

    const products = await prisma.product.findMany({
      where: {
        deletedAt: null,
        ...(search
          ? {
              OR: [
                { sku: { contains: search, mode: 'insensitive' } },
                {
                  translations: {
                    some: {
                      locale: 'en',
                      name: { contains: search, mode: 'insensitive' },
                    },
                  },
                },
              ],
            }
          : {}),
      },
      include: {
        translations: true,
        brand: { select: { name: true } },
        category: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip,
    })

    const totalCount = await prisma.product.count({
      where: { deletedAt: null },
    })

    const items = products.map((product) => {
      const en = product.translations.find((t) => t.locale === 'en')
      const ar = product.translations.find((t) => t.locale === 'ar')
      const zh = product.translations.find((t) => t.locale === 'zh')

      const hasEnDesc = !!(en?.shortDescription && en?.longDescription)
      const hasEnSeo = !!(en?.seoTitle && en?.seoDescription)
      const hasAr = !!(ar?.name && ar?.shortDescription && ar?.longDescription)
      const hasZh = !!(zh?.name && zh?.shortDescription)
      const specs = (en?.specifications as Record<string, unknown>) ?? {}
      const hasSpecs = Object.keys(specs).length >= 3
      const hasPhotos =
        !!product.featuredImage && product.featuredImage !== '/images/placeholder.jpg'
      const tagCount = product.tags
        ? product.tags.split(',').filter((t) => t.trim()).length
        : 0
      const hasTags = tagCount >= 10

      let passing = 0
      const total = 8
      if (hasEnDesc) passing++
      if (hasEnSeo) passing++
      if (hasAr) passing++
      if (hasZh) passing++
      if (hasSpecs) passing++
      if (hasPhotos) passing++
      if (hasTags) passing++
      if (product.brandId) passing++

      const score = Math.round((passing / total) * 100)

      const photoCount = hasPhotos
        ? 1 + (Array.isArray(product.galleryImages) ? product.galleryImages.length : 0)
        : 0

      return {
        id: product.id,
        name: en?.name || product.sku || product.id,
        sku: product.sku,
        brand: product.brand?.name ?? null,
        category: product.category?.name ?? null,
        score,
        hasEnDesc,
        hasEnSeo,
        hasAr,
        hasZh,
        hasSpecs,
        hasPhotos,
        hasTags,
        photoCount,
        specCount: Object.keys(specs).length,
        tagCount,
        needsReview: product.needsAiReview,
        lastAiRun: product.lastAiRunAt,
        aiRunCount: product.aiRunCount,
      }
    })

    let filteredItems = items
    switch (filter) {
      case 'missing_ar':
        filteredItems = items.filter((i) => !i.hasAr)
        break
      case 'missing_photos':
        filteredItems = items.filter((i) => !i.hasPhotos)
        break
      case 'missing_seo':
        filteredItems = items.filter((i) => !i.hasEnSeo)
        break
      case 'low_score':
        filteredItems = items.filter((i) => i.score < 80)
        break
      case 'failed':
        filteredItems = items.filter((i) => i.score < 50)
        break
      case 'needs_review':
        filteredItems = items.filter((i) => i.needsReview)
        break
    }

    const allScores = items.map((i) => i.score)
    const avgScore =
      allScores.length > 0
        ? Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length)
        : 0

    const aggregates = {
      total: totalCount,
      complete: items.filter((i) => i.score >= 90).length,
      partial: items.filter((i) => i.score >= 50 && i.score < 90).length,
      failed: items.filter((i) => i.score < 50).length,
      needsReview: items.filter((i) => i.needsReview).length,
      missingArabic: items.filter((i) => !i.hasAr).length,
      missingPhotos: items.filter((i) => !i.hasPhotos).length,
      missingSeo: items.filter((i) => !i.hasEnSeo).length,
      averageScore: avgScore,
    }

    return NextResponse.json({
      items: filteredItems,
      aggregates,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    })
  } catch (error) {
    console.error('[AI Status API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch AI status' },
      { status: 500 }
    )
  }
}
