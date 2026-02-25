/**
 * @file content-health.service.ts
 * @description Content health scanner: find products with gaps (translations, SEO, images, specs) and calculate quality scores
 * @module lib/services
 */

import { prisma } from '@/lib/db/prisma'
import {
  type StructuredSpecifications,
  isStructuredSpecifications,
} from '@/lib/types/specifications.types'
import { Prisma, TranslationLocale } from '@prisma/client'

const REQUIRED_LOCALES: TranslationLocale[] = ['ar', 'en', 'zh']
const MIN_IMAGES = 4
const SPECS_COMPLETENESS_THRESHOLD = 0.5

export type GapType = 'translations' | 'seo' | 'description' | 'photos' | 'specs'

export interface ContentGapReport {
  total: number
  byGapType: {
    translations: number
    seo: number
    description: number
    photos: number
    specs: number
  }
  products: Array<{
    id: string
    name: string
    qualityScore: number
    missingFields: GapType[]
  }>
}

export interface ProductWithGaps {
  id: string
  name: string
  qualityScore: number
  missingFields: GapType[]
}

/**
 * Check if a value is considered filled (non-null, non-empty string, or valid content)
 */
function isFilled(value: unknown): boolean {
  if (value == null) return false
  if (typeof value === 'string') return value.trim().length > 0
  if (Array.isArray(value)) return value.length > 0
  if (typeof value === 'object') return Object.keys(value).length > 0
  return true
}

/**
 * Get image count from product (featuredImage + galleryImages array)
 */
function getImageCount(galleryImages: unknown, hasFeaturedImage: boolean): number {
  let count = hasFeaturedImage ? 1 : 0
  if (Array.isArray(galleryImages)) {
    count += galleryImages.length
  }
  return count
}

/**
 * Calculate specs completeness from specifications JSON (0-1)
 * Handles both Structured (groups[].specs) and Flat formats.
 */
function getSpecsCompleteness(specifications: unknown): number {
  if (specifications == null || typeof specifications !== 'object') return 0

  if (isStructuredSpecifications(specifications as StructuredSpecifications)) {
    const allSpecs = (specifications as StructuredSpecifications).groups.flatMap((g) => g.specs)
    if (allSpecs.length === 0) return 0
    const filled = allSpecs.filter(
      (s) =>
        s.value != null &&
        String(s.value).trim() !== '' &&
        String(s.value).toLowerCase() !== 'unknown' &&
        String(s.value).toLowerCase() !== 'n/a'
    )
    return filled.length / allSpecs.length
  }

  const obj = specifications as Record<string, unknown>
  const keys = Object.keys(obj).filter(
    (k) => !['highlights', 'quickSpecs', 'groups'].includes(k)
  )
  if (keys.length === 0) return 0
  const filled = keys.filter((k) => isFilled(obj[k]))
  return filled.length / keys.length
}

/**
 * Calculate quality score for a single product (0-100)
 * Formula: translations(25) + seo(20) + shortDesc(10) + longDesc(15) + images>=4(20) + specs>=50%(10)
 */
export async function calculateQualityScore(productId: string): Promise<number> {
  const product = await prisma.product.findUnique({
    where: { id: productId, deletedAt: null },
    include: { translations: { where: { deletedAt: null } } },
  })
  if (!product) return 0

  let score = 0

  const translations = product.translations
  const byLocale = new Map(translations.map((t) => [t.locale, t]))

  // Translations: 25 pts if all ar, en, zh present with name and description content
  const translationsOk = REQUIRED_LOCALES.every((locale) => {
    const t = byLocale.get(locale)
    return t && isFilled(t.name) && (isFilled(t.shortDescription) || isFilled(t.longDescription))
  })
  if (translationsOk) score += 25

  // SEO: 20 pts if at least one translation has full SEO
  const seoOk = translations.some(
    (t) => isFilled(t.seoTitle) && isFilled(t.seoDescription) && isFilled(t.seoKeywords)
  )
  if (seoOk) score += 20

  // Short description: 10 pts
  const shortDescOk = translations.some((t) => isFilled(t.shortDescription))
  if (shortDescOk) score += 10

  // Long description: 15 pts
  const longDescOk = translations.some((t) => isFilled(t.longDescription))
  if (longDescOk) score += 15

  // Images >= 4: 20 pts
  const imageCount = getImageCount(product.galleryImages, isFilled(product.featuredImage))
  if (imageCount >= MIN_IMAGES) score += 20

  // Specs >= 50%: 10 pts (use first translation's specifications)
  const firstSpecs = translations[0]?.specifications
  const specsCompleteness = getSpecsCompleteness(firstSpecs)
  if (specsCompleteness >= SPECS_COMPLETENESS_THRESHOLD || !firstSpecs) score += 10

  return Math.min(100, score)
}

/**
 * Find all products with content gaps and return report with counts and per-product scores
 */
export async function findProductsWithGaps(options?: {
  page?: number
  limit?: number
  gapType?: GapType
  q?: string
}): Promise<ContentGapReport> {
  const page = options?.page ?? 1
  const limit = options?.limit ?? 100
  const skip = (page - 1) * limit
  const q = options?.q?.trim()

  const where: Prisma.ProductWhereInput = { deletedAt: null }
  if (q) {
    where.translations = {
      some: {
        deletedAt: null,
        name: { contains: q, mode: 'insensitive' },
      },
    }
  }

  const products = await prisma.product.findMany({
    where,
    include: { translations: { where: { deletedAt: null } } },
    skip,
    take: limit,
    orderBy: { updatedAt: 'desc' },
  })

  const byGapType = {
    translations: 0,
    seo: 0,
    description: 0,
    photos: 0,
    specs: 0,
  }

  const productResults: ProductWithGaps[] = []

  for (const product of products) {
    const missingFields: GapType[] = []
    const byLocale = new Map(product.translations.map((t) => [t.locale, t]))

    const translationsOk = REQUIRED_LOCALES.every((locale) => {
      const t = byLocale.get(locale)
      return t && isFilled(t.name) && (isFilled(t.shortDescription) || isFilled(t.longDescription))
    })
    if (!translationsOk) {
      missingFields.push('translations')
      byGapType.translations++
    }

    const seoOk = product.translations.some(
      (t) => isFilled(t.seoTitle) && isFilled(t.seoDescription) && isFilled(t.seoKeywords)
    )
    if (!seoOk) {
      missingFields.push('seo')
      byGapType.seo++
    }

    const shortDescOk = product.translations.some((t) => isFilled(t.shortDescription))
    const longDescOk = product.translations.some((t) => isFilled(t.longDescription))
    if (!shortDescOk || !longDescOk) {
      missingFields.push('description')
      byGapType.description++
    }

    const imageCount = getImageCount(product.galleryImages, isFilled(product.featuredImage))
    if (imageCount < MIN_IMAGES) {
      missingFields.push('photos')
      byGapType.photos++
    }

    const firstSpecs = product.translations[0]?.specifications
    const specsCompleteness = getSpecsCompleteness(firstSpecs)
    if (firstSpecs && specsCompleteness < SPECS_COMPLETENESS_THRESHOLD) {
      missingFields.push('specs')
      byGapType.specs++
    }

    const qualityScore =
      (translationsOk ? 25 : 0) +
      (seoOk ? 20 : 0) +
      (shortDescOk ? 10 : 0) +
      (longDescOk ? 15 : 0) +
      (imageCount >= MIN_IMAGES ? 20 : 0) +
      (specsCompleteness >= SPECS_COMPLETENESS_THRESHOLD || !firstSpecs ? 10 : 0)
    const name =
      product.translations.find((t) => t.locale === 'en')?.name ??
      product.translations[0]?.name ??
      product.sku ??
      product.id

    productResults.push({
      id: product.id,
      name,
      qualityScore,
      missingFields,
    })
  }

  const total = await prisma.product.count({ where })

  return {
    total,
    byGapType,
    products: productResults,
  }
}

const GAP_SELECT = {
  id: true,
  featuredImage: true,
  galleryImages: true,
  priceDaily: true,
  contentScore: true,
  translations: {
    where: { deletedAt: null },
    select: {
      locale: true,
      name: true,
      shortDescription: true,
      longDescription: true,
      seoTitle: true,
      seoDescription: true,
      seoKeywords: true,
      specifications: true,
    },
  },
} as const

type GapProduct = Prisma.ProductGetPayload<{ select: typeof GAP_SELECT }>

function hasContentGap(product: GapProduct): boolean {
  const byLocale = new Map(product.translations.map((t) => [t.locale, t]))
  const translationsOk = REQUIRED_LOCALES.every((locale) => {
    const t = byLocale.get(locale)
    return t && isFilled(t.name) && (isFilled(t.shortDescription) || isFilled(t.longDescription))
  })
  if (!translationsOk) return true

  const seoOk = product.translations.some(
    (t) => isFilled(t.seoTitle) && isFilled(t.seoDescription) && isFilled(t.seoKeywords)
  )
  if (!seoOk) return true

  const shortDescOk = product.translations.some((t) => isFilled(t.shortDescription))
  const longDescOk = product.translations.some((t) => isFilled(t.longDescription))
  if (!shortDescOk || !longDescOk) return true

  const imageCount = getImageCount(product.galleryImages, isFilled(product.featuredImage))
  if (imageCount < MIN_IMAGES) return true

  const firstSpecs = product.translations[0]?.specifications
  const specsCompleteness = getSpecsCompleteness(firstSpecs)
  if (firstSpecs && specsCompleteness < SPECS_COMPLETENESS_THRESHOLD) return true

  return false
}

const GAP_BATCH_SIZE = 100

/**
 * Get product IDs that have at least one content gap (for batch backfill).
 * Uses cursor-based pagination to avoid loading all products into memory.
 * @param options.revenueWeighted - when true, order by priceDaily desc so high-revenue products are filled first
 * @param options.minQualityScore - when set, only include products with contentScore < this (fill worst first)
 */
export async function getProductIdsWithGaps(options?: {
  revenueWeighted?: boolean
  minQualityScore?: number
}): Promise<string[]> {
  const ids: string[] = []
  let cursor: string | undefined
  const revenueWeighted = options?.revenueWeighted ?? false
  const minQualityScore = options?.minQualityScore

  while (true) {
    const products = await prisma.product.findMany({
      where: { deletedAt: null },
      select: GAP_SELECT,
      take: GAP_BATCH_SIZE,
      ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
      orderBy: { id: 'asc' },
    })

    if (products.length === 0) break

    let withGaps = products.filter((p) => hasContentGap(p))
    if (minQualityScore != null) {
      withGaps = withGaps.filter((p) => (p.contentScore ?? 0) < minQualityScore)
    }
    if (revenueWeighted && withGaps.length > 0) {
      const sorted = [...withGaps].sort((a, b) => {
        const aPrice = Number(a.priceDaily ?? 0)
        const bPrice = Number(b.priceDaily ?? 0)
        return bPrice - aPrice
      })
      sorted.forEach((p) => ids.push(p.id))
    } else {
      withGaps.forEach((p) => ids.push(p.id))
    }

    cursor = products[products.length - 1].id
    if (products.length < GAP_BATCH_SIZE) break
  }

  return ids
}
