/**
 * @file import-recommendations.service.ts
 * @description Analyzes the product catalog and surfaces intelligent recommendations
 * for improving content quality, fixing gaps, and optimizing SEO.
 * @module lib/services
 */

import { prisma } from '@/lib/db/prisma'

export interface Recommendation {
  id: string
  type: 'missing_fields' | 'photo_quality' | 'seo_opportunity' | 'translation_gap' | 'duplicate_brand' | 'post_import'
  severity: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  affectedCount: number
  actionLabel: string
  actionType: 'bulk_fill' | 'bulk_photo' | 'bulk_seo' | 'bulk_translate' | 'merge_brands' | 'view'
  estimatedCost?: string
  estimatedTime?: string
  metadata?: Record<string, unknown>
}

/**
 * Generate all recommendations for the catalog.
 */
export async function getRecommendations(): Promise<Recommendation[]> {
  const recommendations: Recommendation[] = []

  const [
    missingArabic,
    missingPhotos,
    shortSeoTitles,
    missingSpecs,
    duplicateBrands,
    totalProducts,
    recentImport,
  ] = await Promise.all([
    countMissingArabic(),
    countMissingPhotos(),
    countShortSeoTitles(),
    countMissingSpecs(),
    findDuplicateBrands(),
    prisma.product.count({ where: { deletedAt: null } }),
    getLastImportSummary(),
  ])

  if (missingArabic > 0) {
    const cost = (missingArabic * 0.008).toFixed(2)
    recommendations.push({
      id: 'translation_gap_ar',
      type: 'translation_gap',
      severity: missingArabic > totalProducts * 0.3 ? 'critical' : 'high',
      title: 'Arabic catalog is incomplete',
      description: `${missingArabic} items have no Arabic description. Your Arabic catalog is ${Math.round(((totalProducts - missingArabic) / Math.max(totalProducts, 1)) * 100)}% complete.`,
      affectedCount: missingArabic,
      actionLabel: `Translate all to Arabic`,
      actionType: 'bulk_translate',
      estimatedCost: `~$${cost}`,
      estimatedTime: `~${Math.ceil(missingArabic / 10)} min`,
    })
  }

  if (missingPhotos > 0) {
    recommendations.push({
      id: 'missing_photos',
      type: 'photo_quality',
      severity: missingPhotos > totalProducts * 0.2 ? 'high' : 'medium',
      title: `${missingPhotos} items using placeholder images`,
      description: `These items have no real product photos. Real photos significantly improve conversion rates and customer trust.`,
      affectedCount: missingPhotos,
      actionLabel: 'Search for real photos',
      actionType: 'bulk_photo',
      estimatedCost: 'Free (stock photo APIs)',
      estimatedTime: `~${Math.ceil(missingPhotos / 5)} min`,
    })
  }

  if (shortSeoTitles > 0) {
    recommendations.push({
      id: 'seo_titles_short',
      type: 'seo_opportunity',
      severity: 'medium',
      title: `${shortSeoTitles} items have short SEO titles`,
      description: `SEO titles under 45 characters rank worse in Google. Optimizing titles to 55-60 chars can improve search visibility.`,
      affectedCount: shortSeoTitles,
      actionLabel: 'Improve all SEO titles',
      actionType: 'bulk_seo',
      estimatedCost: `~$${(shortSeoTitles * 0.003).toFixed(2)}`,
    })
  }

  if (missingSpecs.total > 0) {
    const topCategory = missingSpecs.byCategory[0]
    recommendations.push({
      id: 'missing_specs',
      type: 'missing_fields',
      severity: 'high',
      title: `${missingSpecs.total} items missing specifications`,
      description: topCategory
        ? `${Math.round((topCategory.count / missingSpecs.total) * 100)}% of missing specs are in the "${topCategory.name}" category. This may indicate a missing column in your import spreadsheet.`
        : `Items without specs have lower content quality scores and provide less value to renters.`,
      affectedCount: missingSpecs.total,
      actionLabel: 'Run AI Specs Fill',
      actionType: 'bulk_fill',
      estimatedCost: `~$${(missingSpecs.total * 0.005).toFixed(2)}`,
      estimatedTime: `~${Math.ceil(missingSpecs.total / 10)} min`,
    })
  }

  if (duplicateBrands.length > 0) {
    recommendations.push({
      id: 'duplicate_brands',
      type: 'duplicate_brand',
      severity: 'low',
      title: `${duplicateBrands.length} potential duplicate brands detected`,
      description: `Found case-insensitive duplicates: ${duplicateBrands.slice(0, 3).map((d) => `"${d.names.join('" and "')}" (${d.count} products)`).join('; ')}`,
      affectedCount: duplicateBrands.reduce((s, d) => s + d.count, 0),
      actionLabel: 'Review & merge duplicates',
      actionType: 'merge_brands',
      metadata: { duplicates: duplicateBrands },
    })
  }

  if (recentImport) {
    const pct = recentImport.totalRows > 0
      ? Math.round((recentImport.aiCompleted / recentImport.totalRows) * 100)
      : 0

    recommendations.push({
      id: 'post_import',
      type: 'post_import',
      severity: pct < 100 ? 'high' : 'low',
      title: `Last import: ${recentImport.filename}`,
      description: `Created ${recentImport.successRows} items. AI fill: ${recentImport.aiCompleted}/${recentImport.totalRows} complete (${pct}%).${recentImport.pending > 0 ? ` ${recentImport.pending} items still processing...` : ''}`,
      affectedCount: recentImport.totalRows,
      actionLabel: 'View all imported items',
      actionType: 'view',
      metadata: { importJobId: recentImport.id },
    })
  }

  recommendations.sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 }
    return severityOrder[a.severity] - severityOrder[b.severity]
  })

  return recommendations
}

async function countMissingArabic(): Promise<number> {
  const total = await prisma.product.count({ where: { deletedAt: null } })

  const withArabic = await prisma.product.count({
    where: {
      deletedAt: null,
      translations: {
        some: {
          locale: 'ar',
          longDescription: { not: '' },
        },
      },
    },
  })

  return total - withArabic
}

async function countMissingPhotos(): Promise<number> {
  return prisma.product.count({
    where: {
      deletedAt: null,
      OR: [
        { featuredImage: '/images/placeholder.jpg' },
        { featuredImage: '' },
        { featuredImage: null as any },
      ],
    },
  })
}

async function countShortSeoTitles(): Promise<number> {
  const translations = await prisma.productTranslation.findMany({
    where: {
      locale: 'en',
      deletedAt: null,
      product: { deletedAt: null },
    },
    select: { seoTitle: true },
  })

  return translations.filter(
    (t) => !t.seoTitle || t.seoTitle.length < 45
  ).length
}

async function countMissingSpecs(): Promise<{
  total: number
  byCategory: Array<{ name: string; count: number }>
}> {
  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      categoryId: true,
      category: { select: { name: true } },
      translations: {
        where: { locale: 'en' },
        select: { specifications: true },
      },
    },
  })

  const missingByCategory = new Map<string, number>()
  let total = 0

  for (const p of products) {
    const specs = (p.translations[0]?.specifications as Record<string, unknown>) ?? {}
    if (Object.keys(specs).length < 3) {
      total++
      const catName = p.category?.name ?? 'Uncategorized'
      missingByCategory.set(catName, (missingByCategory.get(catName) ?? 0) + 1)
    }
  }

  const byCategory = Array.from(missingByCategory.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)

  return { total, byCategory }
}

async function findDuplicateBrands(): Promise<
  Array<{ names: string[]; count: number }>
> {
  const brands = await prisma.brand.findMany({
    where: { deletedAt: null },
    select: { name: true, _count: { select: { products: true } } },
  })

  const grouped = new Map<string, { names: string[]; count: number }>()

  for (const b of brands) {
    const key = b.name.toLowerCase().trim()
    const existing = grouped.get(key)
    if (existing) {
      existing.names.push(b.name)
      existing.count += b._count.products
    } else {
      grouped.set(key, { names: [b.name], count: b._count.products })
    }
  }

  return Array.from(grouped.values()).filter((g) => g.names.length > 1)
}

async function getLastImportSummary(): Promise<{
  id: string
  filename: string
  totalRows: number
  successRows: number
  aiCompleted: number
  pending: number
} | null> {
  const job = await prisma.importJob.findFirst({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      filename: true,
      totalRows: true,
      successRows: true,
      aiProcessingStatus: true,
      rows: {
        where: { status: 'SUCCESS', productId: { not: null } },
        select: { productId: true },
      },
    },
  })

  if (!job) return null

  const productIds = job.rows.map((r) => r.productId!).filter(Boolean)

  const aiCompleted = productIds.length > 0
    ? await prisma.product.count({
        where: {
          id: { in: productIds },
          lastAiRunAt: { not: null },
        },
      })
    : 0

  return {
    id: job.id,
    filename: job.filename,
    totalRows: job.totalRows,
    successRows: job.successRows,
    aiCompleted,
    pending: productIds.length - aiCompleted,
  }
}
