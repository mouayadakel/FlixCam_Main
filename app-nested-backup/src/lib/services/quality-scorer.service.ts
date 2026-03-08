/**
 * Quality scorer for products: 0-100 score (translations 25 + SEO 20 + shortDesc 10 + longDesc 15 + photos 30).
 * Captures daily snapshots for trend and supports Redis cache for scan results.
 */

import { prisma } from '@/lib/db/prisma'
import { getRedisClient } from '@/lib/queue/redis.client'
import type { GapType } from '@/lib/types/backfill.types'
import { TranslationLocale } from '@prisma/client'

const REQUIRED_LOCALES: TranslationLocale[] = ['ar', 'en', 'zh']
const MIN_IMAGES = 4
const CACHE_KEY = 'content-health-scan'
const CACHE_TTL_SEC = 300

function isFilled(value: unknown): boolean {
  if (value == null) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(value).length > 0
  return true
}

function getImageCount(product: {
  productImages?: Array<{ id?: string; isDeleted?: boolean }>
  galleryImages?: unknown
  featuredImage?: string | null
}): number {
  if (product.productImages && product.productImages.length > 0) {
    const nonDeleted = product.productImages.filter(
      (i) => !(i as { isDeleted?: boolean }).isDeleted
    )
    return nonDeleted.length
  }
  let count = isFilled(product.featuredImage) ? 1 : 0
  if (Array.isArray(product.galleryImages)) count += product.galleryImages.length
  return count
}

/**
 * Score a single product 0-100 and optionally persist to DB.
 * Formula: translations 25 + SEO 20 + shortDesc 10 + longDesc 15 + photos 30.
 */
export async function scoreProduct(
  productId: string,
  options?: { persist?: boolean }
): Promise<number> {
  const product = await prisma.product.findUnique({
    where: { id: productId, deletedAt: null },
    include: {
      translations: { where: { deletedAt: null } },
      productImages: { where: { isDeleted: false }, select: { id: true } },
    },
  })
  if (!product) return 0

  const translations = product.translations
  const byLocale = new Map(translations.map((t) => [t.locale, t]))

  let score = 0
  const translationsOk = REQUIRED_LOCALES.every((locale) => {
    const t = byLocale.get(locale)
    return t && (t.name?.length ?? 0) > 5
  })
  if (translationsOk) score += 25

  const seoOk = product.translations.some(
    (t) => isFilled(t.seoTitle) && isFilled(t.seoDescription) && isFilled(t.seoKeywords)
  )
  if (seoOk) score += 20

  const shortDescOk = product.translations.some((t) => (t.shortDescription?.length ?? 0) >= 20)
  if (shortDescOk) score += 10

  const longDescOk = product.translations.some((t) => (t.longDescription?.length ?? 0) >= 100)
  if (longDescOk) score += 15

  const imageCount = getImageCount(product)
  if (imageCount >= MIN_IMAGES) score += 30
  else score += Math.round((imageCount / MIN_IMAGES) * 30)

  const total = Math.min(100, score)
  if (options?.persist !== false) {
    await prisma.product.update({
      where: { id: productId },
      data: { contentScore: total, contentScoreAt: new Date() },
    })
  }
  return total
}

/**
 * Score a loaded product in-memory (no DB query). Used by batch operations.
 */
function scoreProductInMemory(product: {
  translations: Array<{
    locale: string
    name?: string | null
    shortDescription?: string | null
    longDescription?: string | null
    seoTitle?: string | null
    seoDescription?: string | null
    seoKeywords?: string | null
  }>
  productImages?: Array<{ id?: string; isDeleted?: boolean }>
  galleryImages?: unknown
  featuredImage?: string | null
}): number {
  const translations = product.translations
  const byLocale = new Map(translations.map((t) => [t.locale, t]))

  let score = 0
  const translationsOk = REQUIRED_LOCALES.every((locale) => {
    const t = byLocale.get(locale)
    return t && (t.name?.length ?? 0) > 5
  })
  if (translationsOk) score += 25

  const seoOk = translations.some(
    (t) => isFilled(t.seoTitle) && isFilled(t.seoDescription) && isFilled(t.seoKeywords)
  )
  if (seoOk) score += 20

  const shortDescOk = translations.some((t) => (t.shortDescription?.length ?? 0) >= 20)
  if (shortDescOk) score += 10

  const longDescOk = translations.some((t) => (t.longDescription?.length ?? 0) >= 100)
  if (longDescOk) score += 15

  const imageCount = getImageCount(product)
  if (imageCount >= MIN_IMAGES) score += 30
  else score += Math.round((imageCount / MIN_IMAGES) * 30)

  return Math.min(100, score)
}

/**
 * Score all products and update DB. Returns aggregate stats.
 * Loads all products with translations + images in a single query to avoid N+1.
 */
export async function scoreAllProducts(): Promise<{
  total: number
  avgScore: number
  distribution: { excellent: number; good: number; fair: number; poor: number }
}> {
  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    include: {
      translations: { where: { deletedAt: null } },
      productImages: { where: { isDeleted: false }, select: { id: true } },
    },
  })
  let sum = 0
  const distribution = { excellent: 0, good: 0, fair: 0, poor: 0 }
  const updates: Array<{ id: string; score: number }> = []

  for (const p of products) {
    const s = scoreProductInMemory(p)
    sum += s
    updates.push({ id: p.id, score: s })
    if (s >= 80) distribution.excellent++
    else if (s >= 60) distribution.good++
    else if (s >= 40) distribution.fair++
    else distribution.poor++
  }

  const BATCH_SIZE = 50
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = updates.slice(i, i + BATCH_SIZE)
    await prisma.$transaction(
      batch.map((u) =>
        prisma.product.update({
          where: { id: u.id },
          data: { contentScore: u.score, contentScoreAt: new Date() },
        })
      )
    )
  }

  return {
    total: products.length,
    avgScore: products.length ? Math.round(sum / products.length) : 0,
    distribution,
  }
}

/**
 * Get products that have a specific gap type. Optionally use cached scan.
 */
export async function getProductsWithGaps(
  gapType: GapType,
  options?: { limit?: number; offset?: number }
): Promise<Array<{ id: string; name: string; score: number; gap: string }>> {
  const limit = options?.limit ?? 100
  const offset = options?.offset ?? 0
  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    include: {
      translations: { where: { deletedAt: null } },
      productImages: { where: { isDeleted: false }, select: { id: true } },
    },
    skip: offset,
    take: limit * 2,
    orderBy: { contentScore: 'asc' },
  })
  const byLocale = <T extends { locale: string; name?: string | null }>(t: T[]) =>
    new Map(t.map((x) => [x.locale, x]))
  const results: Array<{ id: string; name: string; score: number; gap: string }> = []
  for (const product of products) {
    const trans = product.translations
    const map = byLocale(trans)
    let hasGap = false
    if (gapType === 'translations') {
      hasGap = !REQUIRED_LOCALES.every((l) => {
        const t = map.get(l)
        return t && (t.name?.length ?? 0) > 5
      })
    } else if (gapType === 'seo') {
      hasGap = !trans.some(
        (t) => isFilled(t.seoTitle) && isFilled(t.seoDescription) && isFilled(t.seoKeywords)
      )
    } else if (gapType === 'description') {
      hasGap = !trans.some((t) => (t.shortDescription?.length ?? 0) >= 20)
    } else if (gapType === 'photos') {
      hasGap = getImageCount(product) < MIN_IMAGES
    } else if (gapType === 'specs') {
      const first = trans[0]?.specifications
      if (first && typeof first === 'object') {
        const keys = Object.keys(first)
        hasGap =
          keys.length > 0 &&
          keys.filter((k) => isFilled((first as Record<string, unknown>)[k])).length / keys.length <
            0.5
      }
    }
    if (hasGap) {
      const name =
        trans.find((t) => t.locale === 'en')?.name ?? trans[0]?.name ?? product.sku ?? product.id
      const score = scoreProductInMemory(product)
      results.push({ id: product.id, name, score, gap: gapType })
      if (results.length >= limit) break
    }
  }
  return results
}

/**
 * Capture today's quality snapshot for trend chart. Call after nightly backfill.
 */
export async function captureQualitySnapshot(): Promise<void> {
  const report = await runFullScan()
  const today = new Date()
  today.setUTCHours(0, 0, 0, 0)
  await prisma.catalogQualitySnapshot.upsert({
    where: { date: today },
    update: {
      avgScore: report.catalogQualityScore,
      totalProducts: report.totalProducts,
      gapCounts: report.byGapType as object,
    },
    create: {
      date: today,
      avgScore: report.catalogQualityScore,
      totalProducts: report.totalProducts,
      gapCounts: report.byGapType as object,
    },
  })
}

/**
 * Get quality trend for charting (e.g. last N days).
 */
export async function getQualityTrend(
  days = 30
): Promise<Array<{ date: string; avgScore: number; totalProducts: number; gapCounts: unknown }>> {
  const start = new Date()
  start.setDate(start.getDate() - days)
  start.setUTCHours(0, 0, 0, 0)
  const snapshots = await prisma.catalogQualitySnapshot.findMany({
    where: { date: { gte: start } },
    orderBy: { date: 'asc' },
  })
  return snapshots.map((s) => ({
    date: s.date.toISOString().slice(0, 10),
    avgScore: s.avgScore,
    totalProducts: s.totalProducts,
    gapCounts: s.gapCounts,
  }))
}

/**
 * Full scan used by snapshot and by cache. Returns ContentGapReport-like structure.
 */
async function runFullScan(): Promise<{
  totalProducts: number
  catalogQualityScore: number
  byGapType: {
    missingTranslations: number
    missingSeo: number
    missingDescription: number
    missingPhotos: number
    missingSpecs: number
  }
  products: Array<{
    id: string
    name: string
    sku: string
    contentScore: number
    gaps: GapType[]
    imageCount: number
    lastAiRunAt: Date | null
    priceDaily: number
  }>
}> {
  const products = await prisma.product.findMany({
    where: { deletedAt: null },
    include: {
      translations: { where: { deletedAt: null } },
      productImages: { where: { isDeleted: false }, select: { id: true } },
    },
  })
  const byGapType = {
    missingTranslations: 0,
    missingSeo: 0,
    missingDescription: 0,
    missingPhotos: 0,
    missingSpecs: 0,
  }
  const summaries: Array<{
    id: string
    name: string
    sku: string
    contentScore: number
    gaps: GapType[]
    imageCount: number
    lastAiRunAt: Date | null
    priceDaily: number
  }> = []
  for (const p of products) {
    const gaps: GapType[] = []
    const map = new Map(p.translations.map((t) => [t.locale, t]))
    if (!REQUIRED_LOCALES.every((l) => map.get(l) && (map.get(l)!.name?.length ?? 0) > 5)) {
      gaps.push('translations')
      byGapType.missingTranslations++
    }
    if (
      !p.translations.some(
        (t) => isFilled(t.seoTitle) && isFilled(t.seoDescription) && isFilled(t.seoKeywords)
      )
    ) {
      gaps.push('seo')
      byGapType.missingSeo++
    }
    if (!p.translations.some((t) => (t.shortDescription?.length ?? 0) >= 20)) {
      gaps.push('description')
      byGapType.missingDescription++
    }
    const imageCount = getImageCount(p)
    if (imageCount < MIN_IMAGES) {
      gaps.push('photos')
      byGapType.missingPhotos++
    }
    const firstSpecs = p.translations[0]?.specifications
    if (firstSpecs && typeof firstSpecs === 'object') {
      const keys = Object.keys(firstSpecs)
      if (keys.length > 0) {
        const filled = keys.filter((k) => isFilled((firstSpecs as Record<string, unknown>)[k]))
        if (filled.length / keys.length < 0.5) {
          gaps.push('specs')
          byGapType.missingSpecs++
        }
      }
    }
    const contentScore = scoreProductInMemory(p)
    const name =
      p.translations.find((t) => t.locale === 'en')?.name ??
      p.translations[0]?.name ??
      p.sku ??
      p.id
    const priceDaily = Number(p.priceDaily ?? 0)
    summaries.push({
      id: p.id,
      name,
      sku: p.sku ?? '-',
      contentScore,
      gaps,
      imageCount,
      lastAiRunAt: p.lastAiRunAt,
      priceDaily,
    })
  }
  const avgScore = summaries.length
    ? Math.round(summaries.reduce((a, b) => a + b.contentScore, 0) / summaries.length)
    : 0
  return {
    totalProducts: products.length,
    catalogQualityScore: avgScore,
    byGapType,
    products: summaries,
  }
}

/**
 * Scan with optional Redis cache (5 min TTL). Returns ContentGapReport shape.
 */
export async function getCachedScan(): Promise<{
  scannedAt: Date
  totalProducts: number
  catalogQualityScore: number
  byGapType: {
    missingTranslations: number
    missingSeo: number
    missingDescription: number
    missingPhotos: number
    missingSpecs: number
  }
  products: Array<{
    id: string
    name: string
    sku: string
    contentScore: number
    gaps: GapType[]
    imageCount: number
    lastAiRunAt: Date | null
    priceDaily: number
  }>
  cached: boolean
}> {
  try {
    const redis = getRedisClient()
    const cached = await redis.get(CACHE_KEY)
    if (cached) {
      const parsed = JSON.parse(cached) as {
        scannedAt: string
        totalProducts: number
        catalogQualityScore: number
        byGapType: Record<string, number>
        products: Array<{
          id: string
          name: string
          sku: string
          contentScore: number
          gaps: GapType[]
          imageCount: number
          lastAiRunAt: string | null
          priceDaily: number
        }>
      }
      const byGap = parsed.byGapType ?? {}
      return {
        scannedAt: new Date(parsed.scannedAt),
        totalProducts: parsed.totalProducts,
        catalogQualityScore: parsed.catalogQualityScore,
        byGapType: {
          missingTranslations: byGap.missingTranslations ?? 0,
          missingSeo: byGap.missingSeo ?? 0,
          missingDescription: byGap.missingDescription ?? 0,
          missingPhotos: byGap.missingPhotos ?? 0,
          missingSpecs: byGap.missingSpecs ?? 0,
        },
        products: parsed.products.map((p) => ({
          ...p,
          lastAiRunAt: p.lastAiRunAt ? new Date(p.lastAiRunAt) : null,
          priceDaily: (p as { priceDaily?: number }).priceDaily ?? 0,
        })),
        cached: true,
      }
    }
  } catch (_) {
    // no redis or parse error: run scan
  }
  const report = await runFullScan()
  const scannedAt = new Date()
  const out = {
    scannedAt,
    totalProducts: report.totalProducts,
    catalogQualityScore: report.catalogQualityScore,
    byGapType: report.byGapType,
    products: report.products,
    cached: false,
  }
  try {
    const redis = getRedisClient()
    await redis.setex(
      CACHE_KEY,
      CACHE_TTL_SEC,
      JSON.stringify({
        scannedAt: scannedAt.toISOString(),
        totalProducts: report.totalProducts,
        catalogQualityScore: report.catalogQualityScore,
        byGapType: report.byGapType,
        products: report.products.map((p) => ({
          ...p,
          lastAiRunAt: p.lastAiRunAt?.toISOString() ?? null,
        })),
      })
    )
  } catch (_) {
    // ignore
  }
  return out
}
