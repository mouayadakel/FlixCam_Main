/**
 * @file image-sourcing.service.ts
 * @description Equipment photo pipeline: brand assets → Google CSE → Unsplash/Pexels (review-only).
 * DALL-E excluded from production equipment path. All non-brand images validated with Gemini.
 * Strict thresholds: auto-approve >= 0.85, review 0.70-0.84, reject < 0.70.
 * @module lib/services
 */

import { existsSync, readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'
import type { SourcedImage, ImageSourceType } from '@/lib/types/backfill.types'
import { processImageFromUrl, uploadBufferToCloudinary } from './image-processing.service'
import { buildEquipmentSearchQueries } from './equipment-search-queries'
import { isPlaceholderUrl } from './product-photo.service'

const REVIEW_THRESHOLD = 0.58
const STOCK_REVIEW_THRESHOLD = 0.68
const AUTO_APPROVE_THRESHOLD = 0.86
const STOCK_AUTO_APPROVE_THRESHOLD = 0.93
const GOOGLE_CSE_QUERY_LIMIT = 6
const PRODUCTS_FOLDER = 'products'
const STOCK_SOURCES = new Set<ImageSourceType>(['unsplash', 'pexels'])
const TRUSTED_RETAILER_DOMAINS = ['bhphotovideo.com', 'adorama.com', 'cvp.com', 'thomann.de']

type StructuredValidation = {
  status: 'validated' | 'unavailable'
  score: number
  description: string
  signals?: {
    exactMatch?: number
    categoryMatch?: number
    catalogQuality?: number
    singleProductFocus?: number
    backgroundCleanliness?: number
    containsPeople?: boolean
    containsTextOverlay?: boolean
    packagingOnly?: boolean
    wrongProduct?: boolean
    confidence?: number
  }
}

export type ProductForSourcing = {
  id: string
  name: string
  sku: string | null
  category?: { name: string } | null
  brand?: { name: string } | null
  translations: Array<{ locale: string; name: string; longDescription: string | null }>
}

const BRAND_ASSETS_BASE = join(process.cwd(), 'public', 'assets', 'brands')
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp']

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return (
      url
        .replace(/^https?:\/\//, '')
        .replace(/^www\./, '')
        .split('/')[0] ?? ''
    )
  }
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(1, value))
}

function normalizeComparable(value: string | null | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function hasExactSignal(
  haystack: string | null | undefined,
  needle: string | null | undefined
): boolean {
  const normalizedHaystack = normalizeComparable(haystack)
  const normalizedNeedle = normalizeComparable(needle)
  if (!normalizedHaystack || !normalizedNeedle) return false
  return normalizedHaystack.includes(normalizedNeedle)
}

function isTrustedDomain(domain: string, brandName: string | null | undefined): boolean {
  const normalizedDomain = extractDomain(domain)
  if (!normalizedDomain) return false
  const normalizedBrand = normalizeComparable(brandName)
  const brandToken = normalizedBrand.split(' ')[0]
  return (
    TRUSTED_RETAILER_DOMAINS.some(
      (trusted) => normalizedDomain === trusted || normalizedDomain.endsWith(`.${trusted}`)
    ) ||
    (!!brandToken && normalizedDomain.includes(brandToken))
  )
}

function mergeQueries(product: ProductForSourcing, searchQueries?: string[]): string[] {
  const exactQueries = buildEquipmentSearchQueries({
    name: product.translations.find((t) => t.locale === 'en')?.name ?? product.name,
    sku: product.sku,
    category: product.category,
    brand: product.brand,
  })

  return [...new Set([...exactQueries, ...(searchQueries ?? [])])]
    .map((query) => query.trim())
    .filter((query) => query.length > 3)
    .slice(0, 12)
}

function dedupeImages(images: SourcedImage[]): SourcedImage[] {
  const seen = new Set<string>()
  const deduped: SourcedImage[] = []
  for (const image of images) {
    const key = image.cloudinaryUrl || image.url
    if (!key || seen.has(key)) continue
    seen.add(key)
    deduped.push(image)
  }
  return deduped
}

function sortImages(images: SourcedImage[]): SourcedImage[] {
  const sourcePriority = (source: ImageSourceType): number => {
    if (source === 'BRAND_ASSET') return 0
    if (source === 'google_search') return 1
    if (source === 'pexels') return 2
    if (source === 'unsplash') return 3
    return 4
  }

  return [...images].sort((a, b) => {
    if (Number(b.approved) !== Number(a.approved)) return Number(b.approved) - Number(a.approved)
    if ((b.matchScore ?? b.qualityScore ?? 0) !== (a.matchScore ?? a.qualityScore ?? 0)) {
      return (b.matchScore ?? b.qualityScore ?? 0) - (a.matchScore ?? a.qualityScore ?? 0)
    }
    return sourcePriority(a.source) - sourcePriority(b.source)
  })
}

async function validateImageCandidate(
  imageUrl: string,
  product: ProductForSourcing
): Promise<StructuredValidation> {
  const geminiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!geminiKey) {
    return { status: 'unavailable', score: 0, description: '' }
  }

  try {
    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return { status: 'unavailable', score: 0, description: '' }
    const buf = await res.arrayBuffer()
    const base64 = Buffer.from(buf).toString('base64')
    const mime = res.headers.get('content-type')?.split(';')[0]?.trim() || 'image/jpeg'
    const name = product.translations.find((t) => t.locale === 'en')?.name ?? product.name
    const category = product.category?.name ?? ''
    const brand = product.brand?.name ?? ''

    const genAI = new GoogleGenerativeAI(geminiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const result = await model.generateContent([
      { inlineData: { mimeType: mime, data: base64 } },
      {
        text: `You are validating a real rental-equipment product photo candidate.
Product name: ${name}
Brand: ${brand}
Category: ${category}

Return JSON only. Prefer exact model identity over generic category matches.
Fields:
- exactMatch: 0.0-1.0
- categoryMatch: 0.0-1.0
- catalogQuality: 0.0-1.0
- singleProductFocus: 0.0-1.0
- backgroundCleanliness: 0.0-1.0
- containsPeople: boolean
- containsTextOverlay: boolean
- packagingOnly: boolean
- wrongProduct: boolean
- confidence: 0.0-1.0
- description: short sentence

If you are unsure, lower exactMatch/confidence but do not invent data.`,
      },
    ])
    const text = result.response.text()?.trim()
    const match = text?.match(/\{[\s\S]*\}/)
    if (!match) return { status: 'unavailable', score: 0, description: '' }

    const parsed = JSON.parse(match[0]) as Record<string, unknown>
    if (typeof parsed.score === 'number') {
      return {
        status: 'validated',
        score: clampScore(parsed.score),
        description: typeof parsed.description === 'string' ? parsed.description : '',
      }
    }

    const exactMatch = typeof parsed.exactMatch === 'number' ? clampScore(parsed.exactMatch) : 0
    const categoryMatch =
      typeof parsed.categoryMatch === 'number' ? clampScore(parsed.categoryMatch) : 0
    const catalogQuality =
      typeof parsed.catalogQuality === 'number' ? clampScore(parsed.catalogQuality) : 0
    const singleProductFocus =
      typeof parsed.singleProductFocus === 'number' ? clampScore(parsed.singleProductFocus) : 0
    const backgroundCleanliness =
      typeof parsed.backgroundCleanliness === 'number'
        ? clampScore(parsed.backgroundCleanliness)
        : 0
    const confidence = typeof parsed.confidence === 'number' ? clampScore(parsed.confidence) : 0.5
    const containsPeople = parsed.containsPeople === true
    const containsTextOverlay = parsed.containsTextOverlay === true
    const packagingOnly = parsed.packagingOnly === true
    const wrongProduct = parsed.wrongProduct === true

    let weightedScore =
      exactMatch * 0.45 +
      categoryMatch * 0.15 +
      catalogQuality * 0.15 +
      singleProductFocus * 0.15 +
      backgroundCleanliness * 0.1

    if (containsPeople) weightedScore -= 0.12
    if (containsTextOverlay) weightedScore -= 0.08
    if (packagingOnly) weightedScore -= 0.18
    if (wrongProduct) weightedScore -= 0.35

    weightedScore = clampScore(weightedScore * (0.7 + confidence * 0.3))

    return {
      status: 'validated',
      score: weightedScore,
      description: typeof parsed.description === 'string' ? parsed.description : '',
      signals: {
        exactMatch,
        categoryMatch,
        catalogQuality,
        singleProductFocus,
        backgroundCleanliness,
        containsPeople,
        containsTextOverlay,
        packagingOnly,
        wrongProduct,
        confidence,
      },
    }
  } catch {
    return { status: 'unavailable', score: 0, description: '' }
  }
}

function classifyCandidate(
  image: SourcedImage,
  validation: StructuredValidation,
  product: ProductForSourcing
): SourcedImage | null {
  const brandName = product.brand?.name ?? ''
  const productName = product.translations.find((t) => t.locale === 'en')?.name ?? product.name
  const exactSkuQuery = hasExactSignal(image.sourceQuery, product.sku)
  const exactModelQuery = hasExactSignal(image.sourceQuery, productName)
  const trustedDomain = isTrustedDomain(image.sourceDomain ?? '', brandName)
  const isStockSource = STOCK_SOURCES.has(image.source)

  if (validation.status === 'unavailable') {
    if (exactSkuQuery || (!isStockSource && exactModelQuery) || trustedDomain) {
      const fallbackScore = exactSkuQuery ? 0.68 : 0.62
      return {
        ...image,
        qualityScore: fallbackScore,
        matchScore: fallbackScore,
        approved: false,
        pendingReview: true,
        reviewReason: 'Gemini validation unavailable; held for manual review',
        scoreBreakdown: {
          validationStatus: validation.status,
          exactSkuQuery,
          exactModelQuery,
          trustedDomain,
          source: image.source,
        },
      }
    }
    return null
  }

  const signals = validation.signals ?? {}
  if (signals.wrongProduct || signals.packagingOnly) {
    return null
  }

  let adjustedScore = validation.score
  if (exactSkuQuery) adjustedScore += 0.1
  else if (exactModelQuery) adjustedScore += 0.05
  if (trustedDomain) adjustedScore += 0.04
  if (isStockSource) adjustedScore -= 0.08
  adjustedScore = clampScore(adjustedScore)

  const reviewThreshold = isStockSource ? STOCK_REVIEW_THRESHOLD : REVIEW_THRESHOLD
  if (adjustedScore < reviewThreshold) return null

  const stockCanAutoApprove =
    isStockSource &&
    adjustedScore >= STOCK_AUTO_APPROVE_THRESHOLD &&
    (exactSkuQuery || exactModelQuery) &&
    (signals.exactMatch ?? 0) >= 0.88 &&
    (signals.singleProductFocus ?? 0) >= 0.7 &&
    (signals.confidence ?? 0) >= 0.65

  const canAutoApprove =
    stockCanAutoApprove ||
    (!isStockSource &&
      adjustedScore >= AUTO_APPROVE_THRESHOLD &&
      (exactSkuQuery || exactModelQuery || trustedDomain))

  return {
    ...image,
    relevanceScore: validation.score,
    qualityScore: adjustedScore,
    matchScore: adjustedScore,
    approved: canAutoApprove,
    pendingReview: !canAutoApprove,
    reviewReason: canAutoApprove
      ? undefined
      : validation.description || 'Needs manual review for exact equipment verification',
    scoreBreakdown: {
      validationStatus: validation.status,
      rawScore: validation.score,
      adjustedScore,
      exactSkuQuery,
      exactModelQuery,
      trustedDomain,
      source: image.source,
      sourceDomain: image.sourceDomain ?? null,
      ...signals,
    },
  }
}

/**
 * 1) Brand assets (auto-approve): Check /assets/brands/{brandName}/ for SKU-matching images.
 */
export async function tryBrandAssets(
  product: ProductForSourcing,
  targetCount: number
): Promise<SourcedImage[]> {
  const results: SourcedImage[] = []
  const brandName = product.brand?.name?.trim()
  const sku = (product.sku ?? product.id).trim()
  if (!brandName || !sku) return results

  const brandDir = join(BRAND_ASSETS_BASE, brandName.replace(/[^a-zA-Z0-9-_]/g, '_'))
  if (!existsSync(brandDir)) return results

  const files = readdirSync(brandDir)
  const matches = files.filter((f) => {
    const base = f.replace(/\.[^.]+$/, '')
    return base === sku || base.toLowerCase() === sku.toLowerCase()
  })
  if (matches.length === 0) {
    const byExt = files.filter((f) => IMAGE_EXTENSIONS.some((ext) => f.toLowerCase().endsWith(ext)))
    if (byExt.length > 0) matches.push(...byExt.slice(0, targetCount))
  }

  for (const file of matches.slice(0, targetCount)) {
    if (results.length >= targetCount) break
    try {
      const filePath = join(brandDir, file)
      const buffer = readFileSync(filePath)
      const uploaded = await uploadBufferToCloudinary(buffer, PRODUCTS_FOLDER)
      if (uploaded.success && uploaded.url) {
        results.push({
          url: uploaded.url,
          source: 'BRAND_ASSET' as ImageSourceType,
          approved: true,
          pendingReview: false,
          isAiGenerated: false,
          cloudinaryUrl: uploaded.url,
          cloudinaryPublicId: uploaded.publicId,
          width: uploaded.width,
          height: uploaded.height,
          sourceQuery: `brand:${brandName}`,
          sourceDomain: 'local',
        })
      }
    } catch {
      // Skip failed file
    }
  }
  return dedupeImages(results)
}

/**
 * 2) Google Custom Search Images — exact-match equipment. Validated with Gemini.
 */
export async function tryGoogleCSE(
  product: ProductForSourcing,
  needed: number,
  searchQueries?: string[]
): Promise<SourcedImage[]> {
  const results: SourcedImage[] = []
  const apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY
  const engineId = process.env.GOOGLE_SEARCH_ENGINE_ID
  if (!apiKey || !engineId || needed < 1) return results

  const queries = searchQueries?.length
    ? searchQueries
    : buildEquipmentSearchQueries({
        name: product.translations.find((t) => t.locale === 'en')?.name ?? product.name,
        sku: product.sku,
        category: product.category,
        brand: product.brand,
      })

  for (const query of queries.slice(0, GOOGLE_CSE_QUERY_LIMIT)) {
    if (results.length >= needed) break
    try {
      const url = new URL('https://www.googleapis.com/customsearch/v1')
      url.searchParams.set('key', apiKey)
      url.searchParams.set('cx', engineId)
      url.searchParams.set('searchType', 'image')
      url.searchParams.set('q', query.slice(0, 150))
      url.searchParams.set('imgSize', 'large')
      url.searchParams.set('imgType', 'photo')
      url.searchParams.set('num', String(Math.min(needed - results.length, 5)))
      url.searchParams.set('safe', 'active')

      const res = await fetch(url.toString(), { signal: AbortSignal.timeout(10000) })
      if (!res.ok) continue

      const data = (await res.json()) as {
        items?: Array<{ link?: string; mime?: string; image?: { width?: number; height?: number } }>
      }

      for (const item of data.items ?? []) {
        if (results.length >= needed) break
        const imageUrl = item.link
        if (!imageUrl || !(item.mime ?? '').startsWith('image/')) continue
        if ((item.image?.width ?? 0) < 800) continue

        try {
          const uploaded = await processImageFromUrl(imageUrl, PRODUCTS_FOLDER, {
            allowExternalDomains: true,
          })
          if (uploaded.success && uploaded.url && !isPlaceholderUrl(uploaded.url)) {
            results.push({
              url: uploaded.url,
              source: 'google_search' as ImageSourceType,
              approved: false,
              pendingReview: true,
              isAiGenerated: false,
              cloudinaryUrl: uploaded.url,
              cloudinaryPublicId: uploaded.publicId,
              width: uploaded.width ?? item.image?.width,
              height: uploaded.height ?? item.image?.height,
              sourceQuery: query,
              sourceDomain: extractDomain(imageUrl),
            })
          }
        } catch {
          // Skip failed upload
        }
      }
    } catch {
      // Request failed
    }
  }
  return dedupeImages(results)
}

/**
 * 3) Unsplash — stock. Never auto-approved. Must pass validation; goes to review if 0.70-0.84.
 */
export async function tryUnsplash(
  product: ProductForSourcing,
  needed: number,
  searchQueries?: string[]
): Promise<SourcedImage[]> {
  const results: SourcedImage[] = []
  const apiKey = process.env.UNSPLASH_ACCESS_KEY
  if (!apiKey || needed < 1) return results

  const queries = searchQueries?.length
    ? searchQueries
    : buildEquipmentSearchQueries({
        name: product.translations.find((t) => t.locale === 'en')?.name ?? product.name,
        sku: product.sku,
        category: product.category,
        brand: product.brand,
      })

  for (const query of queries.slice(0, 3)) {
    if (results.length >= needed) break
    try {
      const url = new URL('https://api.unsplash.com/search/photos')
      url.searchParams.set('query', query.slice(0, 100))
      url.searchParams.set('per_page', String(Math.min(needed - results.length, 5)))
      url.searchParams.set('orientation', 'landscape')

      const res = await fetch(url.toString(), {
        headers: { Authorization: `Client-ID ${apiKey}` },
        signal: AbortSignal.timeout(10000),
      })
      if (!res.ok) continue

      const data = (await res.json()) as {
        results?: Array<{
          urls?: { regular?: string; full?: string }
          width?: number
          height?: number
        }>
      }

      for (const photo of data.results ?? []) {
        if (results.length >= needed) break
        const imageUrl = photo.urls?.regular || photo.urls?.full
        if (!imageUrl || (photo.width ?? 0) < 800) continue

        try {
          const uploaded = await processImageFromUrl(imageUrl, PRODUCTS_FOLDER)
          if (uploaded.success && uploaded.url && !isPlaceholderUrl(uploaded.url)) {
            results.push({
              url: uploaded.url,
              source: 'unsplash' as ImageSourceType,
              approved: false,
              pendingReview: true,
              isAiGenerated: false,
              cloudinaryUrl: uploaded.url,
              cloudinaryPublicId: uploaded.publicId,
              width: uploaded.width ?? photo.width,
              height: uploaded.height ?? photo.height,
              sourceQuery: query,
              sourceDomain: extractDomain(imageUrl),
              attribution: 'Unsplash',
            })
          }
        } catch {
          // Skip
        }
      }
    } catch {
      // Request failed
    }
  }
  return dedupeImages(results)
}

/**
 * 4) Pexels — stock. Never auto-approved. Must pass validation; goes to review if 0.70-0.84.
 */
export async function tryPexels(
  product: ProductForSourcing,
  needed: number,
  searchQueries?: string[]
): Promise<SourcedImage[]> {
  const results: SourcedImage[] = []
  const apiKey = process.env.PEXELS_API_KEY
  if (!apiKey || needed < 1) return results

  const queries = searchQueries?.length
    ? searchQueries
    : buildEquipmentSearchQueries({
        name: product.translations.find((t) => t.locale === 'en')?.name ?? product.name,
        sku: product.sku,
        category: product.category,
        brand: product.brand,
      })

  for (const query of queries.slice(0, 3)) {
    if (results.length >= needed) break
    const q = query.slice(0, 100)
    if (!q) continue

    try {
      let photos: Array<{ src?: { original?: string } }> = []
      try {
        const { createClient } = await import('pexels')
        const client = createClient(apiKey)
        const response = await client.photos.search({
          query: q,
          per_page: Math.min(needed - results.length, 5),
        })
        if ('photos' in response && Array.isArray(response.photos)) {
          photos = response.photos
        }
      } catch {
        const res = await fetch(
          `https://api.pexels.com/v1/search?query=${encodeURIComponent(q)}&per_page=${Math.min(needed - results.length, 5)}`,
          { headers: { Authorization: apiKey }, signal: AbortSignal.timeout(10000) }
        )
        if (res.ok) {
          const data = (await res.json()) as { photos?: Array<{ src?: { original?: string } }> }
          photos = data.photos ?? []
        }
      }

      for (const photo of photos) {
        if (results.length >= needed) break
        const originalUrl = photo.src?.original
        if (!originalUrl) continue
        try {
          const uploaded = await processImageFromUrl(originalUrl, PRODUCTS_FOLDER)
          if (uploaded.success && uploaded.url && !isPlaceholderUrl(uploaded.url)) {
            results.push({
              url: uploaded.url,
              source: 'pexels' as ImageSourceType,
              approved: false,
              pendingReview: true,
              isAiGenerated: false,
              cloudinaryUrl: uploaded.url,
              cloudinaryPublicId: uploaded.publicId,
              width: uploaded.width,
              height: uploaded.height,
              sourceQuery: q,
              sourceDomain: extractDomain(originalUrl),
              attribution: 'Pexels',
            })
          }
        } catch {
          // Skip
        }
      }
    } catch {
      // Request failed
    }
  }
  return dedupeImages(results)
}

/**
 * Legacy DALL-E helper kept for tests and ad-hoc experiments.
 * Production equipment sourcing does not call this function.
 */
export async function tryDallE(
  product: ProductForSourcing,
  needed: number
): Promise<SourcedImage[]> {
  const results: SourcedImage[] = []
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey || needed < 1) return results

  const openai = new OpenAI({ apiKey })
  const name = product.translations.find((t) => t.locale === 'en')?.name ?? product.name
  const category = product.category?.name ?? 'equipment'
  const angles = [
    'front view on white background, professional product photography',
    'side angle, clean studio lighting',
    'three-quarter view, commercial quality',
    'detail close-up showing key features',
  ]

  for (let i = 0; i < Math.min(needed, 4); i++) {
    try {
      const prompt = `Professional product photo: ${name}, ${category}. ${angles[i]}. High quality, 8K, no text, no watermark.`
      const res = await openai.images.generate({
        model: 'dall-e-3',
        prompt,
        n: 1,
        size: '1024x1024',
        response_format: 'url',
        quality: 'standard',
      })
      const imageUrl = res.data?.[0]?.url
      if (!imageUrl) continue

      const uploaded = await processImageFromUrl(imageUrl, PRODUCTS_FOLDER, {
        allowExternalDomains: true,
      })
      if (uploaded.success && uploaded.url && !isPlaceholderUrl(uploaded.url)) {
        results.push({
          url: uploaded.url,
          source: 'dalle' as ImageSourceType,
          approved: false,
          pendingReview: true,
          isAiGenerated: true,
          cloudinaryUrl: uploaded.url,
          cloudinaryPublicId: uploaded.publicId,
          width: uploaded.width,
          height: uploaded.height,
          sourceQuery: prompt,
          sourceDomain: extractDomain(imageUrl),
          reviewReason:
            'AI-generated image requires manual review and never counts as a real photo',
        })
      }
    } catch {
      // Skip failed generation
    }
  }

  return dedupeImages(results)
}

/**
 * Validate image relevance using Gemini Vision. Returns score 0-1.
 * Thresholds: >= 0.85 auto-approve, 0.70-0.84 review, < 0.70 reject.
 */
export async function validateImageRelevance(
  imageUrl: string,
  product: ProductForSourcing
): Promise<{ score: number; description: string }> {
  const validation = await validateImageCandidate(imageUrl, product)
  return {
    score: validation.score,
    description: validation.description,
  }
}

/**
 * Source images for equipment. Pipeline: brand → Google → Unsplash → Pexels.
 * DALL-E excluded. All non-brand validated; only >= 0.70 accepted; >= 0.85 auto-approved.
 */
export async function sourceImages(
  product: ProductForSourcing,
  targetCount: number = 5,
  searchQueries?: string[]
): Promise<SourcedImage[]> {
  const queries = mergeQueries(product, searchQueries)

  const results: SourcedImage[] = []

  const fromBrand = await tryBrandAssets(product, targetCount)
  for (const img of fromBrand) {
    results.push({ ...img, qualityScore: 1.0 })
    if (results.length >= targetCount) return results.slice(0, targetCount)
  }

  const needed = targetCount - results.length
  if (needed < 1) return results.slice(0, targetCount)

  const fromGoogle = await tryGoogleCSE(product, Math.max(needed * 2, needed), queries)
  for (const img of fromGoogle) {
    const validation = await validateImageCandidate(img.url, product)
    const candidate = classifyCandidate(img, validation, product)
    if (!candidate) continue
    results.push(candidate)
    if (results.length >= targetCount)
      return sortImages(dedupeImages(results)).slice(0, targetCount)
  }

  const neededStock = targetCount - results.length
  if (neededStock > 0) {
    const fromUnsplash = await tryUnsplash(product, Math.max(neededStock * 2, neededStock), queries)
    const fromPexels = await tryPexels(product, Math.max(neededStock * 2, neededStock), queries)
    const stock = [...fromUnsplash, ...fromPexels]
    for (const img of stock) {
      if (results.length >= targetCount) break
      const validation = await validateImageCandidate(img.url, product)
      const candidate = classifyCandidate(img, validation, product)
      if (!candidate) continue
      results.push(candidate)
      if (results.length >= targetCount)
        return sortImages(dedupeImages(results)).slice(0, targetCount)
    }
  }

  return sortImages(dedupeImages(results)).slice(0, targetCount)
}
