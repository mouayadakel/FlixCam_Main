/**
 * @file image-sourcing.service.ts
 * @description Five-source image pipeline for product backfill:
 * brand assets → Unsplash → Pexels → Google Custom Search → DALL-E (last resort).
 * Brand assets and stock photos are auto-approved; DALL-E images need admin review.
 * All non-brand images are validated with Gemini Vision (score >= 0.7 required).
 * @module lib/services
 */

import { existsSync, readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'
import type { SourcedImage, ImageSourceType } from '@/lib/types/backfill.types'
import { processImageFromUrl, uploadBufferToCloudinary } from './image-processing.service'

const RELEVANCE_MIN_SCORE = 0.7
const PRODUCTS_FOLDER = 'products'

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
    const byExt = files.filter((f) =>
      IMAGE_EXTENSIONS.some((ext) => f.toLowerCase().endsWith(ext))
    )
    if (byExt.length > 0) {
      matches.push(...byExt.slice(0, targetCount))
    }
  }

  for (const file of matches.slice(0, targetCount)) {
    /* istanbul ignore next - slice limits iterations so break is defensive only */
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
          cloudinaryUrl: uploaded.url,
          cloudinaryPublicId: uploaded.publicId,
          width: uploaded.width,
          height: uploaded.height,
        })
      }
    } catch {
      // Skip failed file
    }
  }
  return results
}

/**
 * 2) Unsplash API (auto-approve): High-quality, commercial-use photos.
 */
export async function tryUnsplash(
  product: ProductForSourcing,
  needed: number,
  searchQueries?: string[]
): Promise<SourcedImage[]> {
  const results: SourcedImage[] = []
  const apiKey = process.env.UNSPLASH_ACCESS_KEY
  if (!apiKey) {
    console.warn('[ImageSourcing] UNSPLASH_ACCESS_KEY not configured — skipping Unsplash')
    return results
  }
  if (needed < 1) return results

  const name = product.translations.find((t) => t.locale === 'en')?.name ?? product.name
  const queries = searchQueries?.length
    ? searchQueries.slice(0, 3)
    : [`${name} ${product.category?.name ?? ''}`.trim()]

  for (const query of queries) {
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
        if (!imageUrl) continue
        if ((photo.width ?? 0) < 800) continue

        try {
          const uploaded = await processImageFromUrl(imageUrl, PRODUCTS_FOLDER)
          if (uploaded.success && uploaded.url) {
            results.push({
              url: uploaded.url,
              source: 'unsplash' as ImageSourceType,
              approved: true,
              pendingReview: false,
              cloudinaryUrl: uploaded.url,
              cloudinaryPublicId: uploaded.publicId,
              width: uploaded.width ?? photo.width,
              height: uploaded.height ?? photo.height,
              attribution: 'Unsplash',
            })
          }
        } catch {
          // Skip failed upload
        }
      }
    } catch {
      // Unsplash request failed for this query
    }
  }
  return results
}

/**
 * 3) Pexels API (auto-approve): Stock photos.
 */
export async function tryPexels(
  product: ProductForSourcing,
  needed: number,
  searchQueries?: string[]
): Promise<SourcedImage[]> {
  const results: SourcedImage[] = []
  const apiKey = process.env.PEXELS_API_KEY
  if (!apiKey) {
    console.warn('[ImageSourcing] PEXELS_API_KEY not configured — skipping Pexels')
    return results
  }
  if (needed < 1) return results

  const name = product.translations.find((t) => t.locale === 'en')?.name ?? product.name
  const queries = searchQueries?.length
    ? searchQueries.slice(0, 3)
    : [`${name} ${product.category?.name ?? ''}`.trim()]

  for (const query of queries) {
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
          const data = (await res.json()) as {
            photos?: Array<{ src?: { original?: string } }>
          }
          photos = data.photos ?? []
        }
      }

      for (const photo of photos) {
        if (results.length >= needed) break
        const originalUrl = photo.src?.original
        if (!originalUrl) continue
        try {
          const uploaded = await processImageFromUrl(originalUrl, PRODUCTS_FOLDER)
          if (uploaded.success && uploaded.url) {
            results.push({
              url: uploaded.url,
              source: 'pexels' as ImageSourceType,
              approved: true,
              pendingReview: false,
              cloudinaryUrl: uploaded.url,
              cloudinaryPublicId: uploaded.publicId,
              width: uploaded.width,
              height: uploaded.height,
              attribution: 'Pexels',
            })
          }
        } catch {
          // Skip failed upload
        }
      }
    } catch {
      // Pexels request failed for this query
    }
  }
  return results
}

/**
 * 4) Google Custom Search Images (auto-approve): Most accurate for specific products.
 */
export async function tryGoogleCSE(
  product: ProductForSourcing,
  needed: number,
  searchQueries?: string[]
): Promise<SourcedImage[]> {
  const results: SourcedImage[] = []
  const apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY
  const engineId = process.env.GOOGLE_SEARCH_ENGINE_ID
  if (!apiKey || !engineId) {
    console.warn('[ImageSourcing] GOOGLE_CUSTOM_SEARCH_API_KEY or GOOGLE_SEARCH_ENGINE_ID not configured — skipping Google CSE')
    return results
  }
  if (needed < 1) return results

  const name = product.translations.find((t) => t.locale === 'en')?.name ?? product.name
  const queries = searchQueries?.length
    ? searchQueries.slice(0, 3)
    : [`${name} product photo`]

  for (const query of queries) {
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

      const res = await fetch(url.toString(), {
        signal: AbortSignal.timeout(10000),
      })
      if (!res.ok) continue

      const data = (await res.json()) as {
        items?: Array<{
          link?: string
          mime?: string
          image?: { width?: number; height?: number }
        }>
      }

      for (const item of data.items ?? []) {
        if (results.length >= needed) break
        const imageUrl = item.link
        if (!imageUrl) continue

        const mime = item.mime ?? ''
        if (!mime.startsWith('image/')) continue

        const width = item.image?.width ?? 0
        if (width < 800) continue

        try {
          const uploaded = await processImageFromUrl(imageUrl, PRODUCTS_FOLDER)
          if (uploaded.success && uploaded.url) {
            results.push({
              url: uploaded.url,
              source: 'google' as ImageSourceType,
              approved: true,
              pendingReview: false,
              cloudinaryUrl: uploaded.url,
              cloudinaryPublicId: uploaded.publicId,
              width: uploaded.width ?? width,
              height: uploaded.height ?? item.image?.height,
              attribution: 'Google Images',
            })
          }
        } catch {
          // Skip failed upload
        }
      }
    } catch {
      // Google CSE request failed for this query
    }
  }
  return results
}

/**
 * 5) AI generation via DALL-E (last resort, needs review): Generate product photos.
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

      const uploaded = await processImageFromUrl(imageUrl, PRODUCTS_FOLDER)
      if (uploaded.success && uploaded.url) {
        results.push({
          url: uploaded.url,
          source: 'dalle' as ImageSourceType,
          approved: false,
          pendingReview: true,
          cloudinaryUrl: uploaded.url,
          cloudinaryPublicId: uploaded.publicId,
          width: uploaded.width,
          height: uploaded.height,
        })
      }
    } catch {
      // Skip failed generation
    }
  }
  return results
}

/**
 * Validate image relevance using Gemini Vision. Returns score 0-1 and short description.
 * Used to auto-reject images below RELEVANCE_MIN_SCORE (0.7).
 */
export async function validateImageRelevance(
  imageUrl: string,
  product: ProductForSourcing
): Promise<{ score: number; description: string }> {
  const geminiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY
  if (!geminiKey) return { score: 0, description: '' }

  try {
    const res = await fetch(imageUrl, { signal: AbortSignal.timeout(10000) })
    if (!res.ok) return { score: 0, description: '' }
    const buf = await res.arrayBuffer()
    const base64 = Buffer.from(buf).toString('base64')
    const mime = res.headers.get('content-type')?.split(';')[0]?.trim() || 'image/jpeg'
    const name = product.translations.find((t) => t.locale === 'en')?.name ?? product.name
    const category = product.category?.name ?? ''
    const brand = product.brand?.name ?? ''

    const genAI = new GoogleGenerativeAI(geminiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: mime,
          data: base64,
        },
      },
      {
        text: `This image is a candidate for a product photo. Product: ${name}. Category: ${category}. Brand: ${brand}.
Rate how relevant and suitable this image is as a product photo (0.0 = not relevant, 1.0 = perfect). Reply with JSON only: { "score": 0.0 to 1.0, "description": "one short sentence" }`,
      },
    ])
    const text = result.response.text()?.trim()
    const match = text?.match(/\{[\s\S]*\}/)
    if (!match) return { score: 0, description: '' }
    const parsed = JSON.parse(match[0]) as { score?: number; description?: string }
    const score = typeof parsed.score === 'number' ? Math.max(0, Math.min(1, parsed.score)) : 0
    return { score, description: typeof parsed.description === 'string' ? parsed.description : '' }
  } catch {
    return { score: 0, description: '' }
  }
}

/**
 * Source images for a product until targetCount is reached.
 * Pipeline: brand assets → Unsplash → Pexels → Google CSE → DALL-E (last resort).
 * Non-brand images are validated with Gemini Vision; score < 0.7 are rejected.
 *
 * @param searchQueries - AI-generated search queries for this specific product
 */
export async function sourceImages(
  product: ProductForSourcing,
  targetCount: number = 5,
  searchQueries?: string[]
): Promise<SourcedImage[]> {
  const results: SourcedImage[] = []

  const hasAnyApiKey =
    !!process.env.UNSPLASH_ACCESS_KEY ||
    !!process.env.PEXELS_API_KEY ||
    (!!process.env.GOOGLE_CUSTOM_SEARCH_API_KEY && !!process.env.GOOGLE_SEARCH_ENGINE_ID)

  if (!hasAnyApiKey) {
    console.warn(
      '[ImageSourcing] No image API keys configured (UNSPLASH_ACCESS_KEY, PEXELS_API_KEY, or GOOGLE_CUSTOM_SEARCH_API_KEY). Photo auto-fill will not work. Add at least one key to .env'
    )
  }

  const fromBrand = await tryBrandAssets(product, targetCount)
  results.push(...fromBrand)
  if (results.length >= targetCount) return results.slice(0, targetCount)

  const neededUnsplash = targetCount - results.length
  const fromUnsplashRaw = await tryUnsplash(product, neededUnsplash, searchQueries)
  for (const img of fromUnsplashRaw) {
    const { score } = await validateImageRelevance(img.url, product)
    if (score >= RELEVANCE_MIN_SCORE) {
      results.push({ ...img, qualityScore: score })
      if (results.length >= targetCount) return results.slice(0, targetCount)
    }
  }

  const neededPexels = targetCount - results.length
  const fromPexelsRaw = await tryPexels(product, neededPexels, searchQueries)
  for (const img of fromPexelsRaw) {
    const { score } = await validateImageRelevance(img.url, product)
    if (score >= RELEVANCE_MIN_SCORE) {
      results.push({ ...img, qualityScore: score })
      if (results.length >= targetCount) return results.slice(0, targetCount)
    }
  }

  const neededGoogle = targetCount - results.length
  if (neededGoogle > 0) {
    const fromGoogleRaw = await tryGoogleCSE(product, neededGoogle, searchQueries)
    for (const img of fromGoogleRaw) {
      const { score } = await validateImageRelevance(img.url, product)
      if (score >= RELEVANCE_MIN_SCORE) {
        results.push({ ...img, qualityScore: score })
        if (results.length >= targetCount) return results.slice(0, targetCount)
      }
    }
  }

  const neededDalle = targetCount - results.length
  if (neededDalle > 0) {
    const fromDalleRaw = await tryDallE(product, neededDalle)
    for (const img of fromDalleRaw) {
      const { score } = await validateImageRelevance(img.url, product)
      if (score >= RELEVANCE_MIN_SCORE) {
        results.push({ ...img, qualityScore: score })
        if (results.length >= targetCount) return results.slice(0, targetCount)
      }
    }
  }

  return results.slice(0, targetCount)
}
