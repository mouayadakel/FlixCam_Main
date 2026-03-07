/**
 * Photo sourcing for products: brand assets, DALL-E, Pexels.
 * Delegates to image-sourcing.service (pipeline + Gemini Vision quality gate; score < 0.7 auto-rejected).
 */

import type { SourcedImage } from '@/lib/types/backfill.types'
import {
  sourceImages as sourceImagesFromPipeline,
  validateImageRelevance as validateImageRelevanceFromPipeline,
} from '@/lib/services/image-sourcing.service'

type ProductWithRelations = {
  id: string
  name: string
  sku: string | null
  category?: { name: string } | null
  brand?: { name: string } | null
  translations: Array<{ locale: string; name: string; longDescription: string | null }>
}

/**
 * Source images for a product until targetCount is reached.
 * Pipeline: brand → DALL-E → Pexels; Gemini Vision rejects images with relevance score < 0.7.
 */
export async function sourceImages(
  product: ProductWithRelations,
  targetCount = 4
): Promise<SourcedImage[]> {
  return sourceImagesFromPipeline(product, targetCount)
}

/**
 * Validate image relevance using Gemini Vision (score 0-1). Auto-reject below 0.7 in pipeline.
 */
export async function validateImageRelevance(
  imageUrl: string,
  product: ProductWithRelations
): Promise<{ score: number; description: string }> {
  return validateImageRelevanceFromPipeline(imageUrl, product)
}
