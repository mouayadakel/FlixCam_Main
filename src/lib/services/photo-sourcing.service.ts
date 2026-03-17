/**
 * Photo sourcing for products: single public entrypoint.
 * Delegates to image-sourcing.service (brand → Google → stock; strict scoring; no DALL-E).
 */

import type { SourcedImage } from '@/lib/types/backfill.types'
import {
  sourceImages as sourceImagesFromPipeline,
  validateImageRelevance as validateImageRelevanceFromPipeline,
  type ProductForSourcing,
} from '@/lib/services/image-sourcing.service'

type ProductWithRelations = {
  id?: string
  name: string
  sku: string | null
  category?: { name: string } | null
  brand?: { name: string } | null
  translations: Array<{ locale: string; name: string; longDescription: string | null }>
}

/**
 * Source images for a product until targetCount is reached.
 * Pipeline: brand → Google CSE → Unsplash/Pexels. All non-brand validated; DALL-E excluded.
 */
export async function sourceImages(
  product: ProductWithRelations,
  targetCount = 5,
  searchQueries?: string[]
): Promise<SourcedImage[]> {
  const forSourcing: ProductForSourcing = {
    id: product.id ?? '',
    name: product.name,
    sku: product.sku,
    category: product.category,
    brand: product.brand,
    translations: product.translations,
  }
  return sourceImagesFromPipeline(forSourcing, targetCount, searchQueries)
}

/**
 * Validate image relevance using Gemini Vision (score 0-1).
 */
export async function validateImageRelevance(
  imageUrl: string,
  product: ProductWithRelations
): Promise<{ score: number; description: string }> {
  const forSourcing: ProductForSourcing = {
    id: product.id ?? '',
    name: product.name,
    sku: product.sku,
    category: product.category,
    brand: product.brand,
    translations: product.translations,
  }
  return validateImageRelevanceFromPipeline(imageUrl, forSourcing)
}
