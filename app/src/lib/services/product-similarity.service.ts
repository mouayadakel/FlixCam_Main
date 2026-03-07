/**
 * @file product-similarity.service.ts
 * @description Vector embeddings for automatic related products linking.
 * Uses OpenAI text-embedding-3-small to generate product embeddings,
 * then finds top-N most similar products via cosine similarity.
 * @module lib/services
 */

import { prisma } from '@/lib/db/prisma'

/**
 * Cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0
  let dotProduct = 0
  let normA = 0
  let normB = 0
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  const denominator = Math.sqrt(normA) * Math.sqrt(normB)
  return denominator === 0 ? 0 : dotProduct / denominator
}

/**
 * Generate an embedding for a product description using OpenAI
 */
async function generateEmbedding(text: string): Promise<number[] | null> {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null

  try {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text.slice(0, 8000),
      }),
    })

    if (!response.ok) return null
    const data = await response.json()
    return data.data?.[0]?.embedding ?? null
  } catch {
    return null
  }
}

/**
 * Build a text representation of a product for embedding
 */
function buildProductText(product: {
  name: string
  brand?: string
  category?: string
  description?: string
  tags?: string
  specs?: Record<string, unknown> | null
}): string {
  const parts = [product.name]
  if (product.brand) parts.push(product.brand)
  if (product.category) parts.push(product.category)
  if (product.description) parts.push(product.description.slice(0, 500))
  if (product.tags) parts.push(product.tags)
  if (product.specs) {
    const specStr = Object.entries(product.specs)
      .map(([k, v]) => `${k}: ${v}`)
      .join(', ')
    parts.push(specStr)
  }
  return parts.join(' | ')
}

export interface SimilarProduct {
  productId: string
  similarity: number
  name: string
}

// In-memory embedding cache (in production, store in DB or Redis)
const embeddingCache = new Map<string, number[]>()

/**
 * Generate and cache embedding for a product
 */
export async function embedProduct(productId: string): Promise<number[] | null> {
  if (embeddingCache.has(productId)) return embeddingCache.get(productId)!

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      brand: { select: { name: true } },
      category: { select: { name: true } },
      translations: {
        where: { locale: 'en', deletedAt: null },
        select: { name: true, shortDescription: true, specifications: true },
        take: 1,
      },
    },
  })

  if (!product) return null

  const trans = product.translations[0]
  const text = buildProductText({
    name: trans?.name || product.sku || productId,
    brand: product.brand?.name,
    category: product.category?.name,
    description: trans?.shortDescription || undefined,
    tags: product.tags || undefined,
    specs: (trans as { specifications?: Record<string, unknown> })?.specifications ?? undefined,
  })

  const embedding = await generateEmbedding(text)
  if (embedding) embeddingCache.set(productId, embedding)
  return embedding
}

/**
 * Find the top-N most similar products to a given product.
 * Category-aware: boosts same-category results.
 */
export async function findSimilarProducts(
  productId: string,
  topN: number = 5,
  categoryBoost: number = 0.1
): Promise<SimilarProduct[]> {
  const targetEmbedding = await embedProduct(productId)
  if (!targetEmbedding) return []

  const targetProduct = await prisma.product.findUnique({
    where: { id: productId },
    select: { categoryId: true },
  })

  const allProducts = await prisma.product.findMany({
    where: {
      id: { not: productId },
      deletedAt: null,
      status: { in: ['ACTIVE', 'DRAFT'] },
    },
    include: {
      translations: {
        where: { locale: 'en', deletedAt: null },
        select: { name: true, shortDescription: true, specifications: true },
        take: 1,
      },
      brand: { select: { name: true } },
      category: { select: { name: true } },
    },
    take: 500,
  })

  const similarities: SimilarProduct[] = []

  for (const p of allProducts) {
    let embedding = embeddingCache.get(p.id)
    if (!embedding) {
      const trans = p.translations[0]
      const text = buildProductText({
        name: trans?.name || p.sku || p.id,
        brand: p.brand?.name,
        category: p.category?.name,
        description: trans?.shortDescription || undefined,
        tags: p.tags || undefined,
        specs: (trans as { specifications?: Record<string, unknown> })?.specifications ?? undefined,
      })
      embedding = (await generateEmbedding(text)) ?? undefined
      if (embedding) embeddingCache.set(p.id, embedding)
    }

    if (!embedding) continue

    let sim = cosineSimilarity(targetEmbedding, embedding)
    if (targetProduct && p.categoryId === targetProduct.categoryId) {
      sim += categoryBoost
    }

    similarities.push({
      productId: p.id,
      similarity: Math.round(sim * 1000) / 1000,
      name: p.translations[0]?.name || p.sku || p.id,
    })
  }

  return similarities.sort((a, b) => b.similarity - a.similarity).slice(0, topN)
}

/**
 * Batch update related products for all products.
 * Runs after import to rebuild the related products network.
 */
export async function rebuildRelatedProducts(
  productIds?: string[],
  topN: number = 5
): Promise<{ updated: number; errors: number }> {
  const where: Record<string, unknown> = { deletedAt: null }
  if (productIds?.length) where.id = { in: productIds }

  const products = await prisma.product.findMany({
    where,
    select: { id: true },
    take: 200,
  })

  let updated = 0
  let errors = 0

  for (const product of products) {
    try {
      const similar = await findSimilarProducts(product.id, topN)
      if (similar.length > 0) {
        await prisma.product.update({
          where: { id: product.id },
          data: {
            relatedProducts: similar.map((s) => s.productId),
          },
        })
        updated++
      }
    } catch {
      errors++
    }
  }

  return { updated, errors }
}
