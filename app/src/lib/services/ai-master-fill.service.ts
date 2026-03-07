/**
 * @file ai-master-fill.service.ts
 * @description Orchestrates the complete AI content fill pipeline for a single product:
 * text content generation, photo sourcing, brand/category resolution, DB persistence,
 * equipment sync, and post-fill validation.
 * @module lib/services
 */

import { prisma } from '@/lib/db/prisma'
import { generateMasterFill, type ContentProvider } from './ai-content-generation.service'
import { sourceImages, type ProductForSourcing } from './image-sourcing.service'
import { syncProductToEquipment } from './product-equipment-sync.service'
import { slugify } from '@/lib/utils'
import type { MasterFillOutput } from '@/lib/prompts/master-fill'

export interface AiFillResult {
  productId: string
  fieldsGenerated: number
  photosFound: number
  needsReview: boolean
  brand: string
  category: string
  score: number
}

function getProvider(): ContentProvider {
  return (process.env.AI_PROVIDER as ContentProvider) ?? 'gemini'
}

async function ensureBrand(brandName: string | null): Promise<{ id: string; name: string }> {
  const name = brandName?.trim()
  if (!name) return { id: '', name: 'Unknown' }

  const slug = slugify(name)
  try {
    const brand = await prisma.brand.upsert({
      where: { name },
      create: { name, slug },
      update: {},
    })
    return brand
  } catch {
    const brand = await prisma.brand.findFirst({
      where: { name: { equals: name, mode: 'insensitive' } },
    })
    if (brand) return brand
    const created = await prisma.brand.create({ data: { name, slug: slug + '-' + Date.now() } })
    return created
  }
}

async function resolveCategory(
  categorySuggestion: string | null,
  productName: string
): Promise<{ id: string; name: string }> {
  if (!categorySuggestion) {
    const fallback = await prisma.category.findFirst({
      where: { deletedAt: null },
      orderBy: { createdAt: 'asc' },
    })
    return fallback ?? { id: '', name: 'Uncategorized' }
  }

  const parts = categorySuggestion.split('>').map((p) => p.trim())
  const leafName = parts[parts.length - 1]

  const exactMatch = await prisma.category.findFirst({
    where: {
      name: { equals: leafName, mode: 'insensitive' },
      deletedAt: null,
    },
  })
  if (exactMatch) return exactMatch

  const fuzzyMatch = await prisma.category.findFirst({
    where: {
      name: { contains: leafName, mode: 'insensitive' },
      deletedAt: null,
    },
  })
  if (fuzzyMatch) return fuzzyMatch

  if (parts.length > 1) {
    const parentName = parts[0]
    const parentMatch = await prisma.category.findFirst({
      where: {
        name: { contains: parentName, mode: 'insensitive' },
        deletedAt: null,
      },
    })
    if (parentMatch) return parentMatch
  }

  const anyCategory = await prisma.category.findFirst({
    where: { deletedAt: null },
    orderBy: { createdAt: 'asc' },
  })
  return anyCategory ?? { id: '', name: 'Uncategorized' }
}

function normalizeKeywords(value: string | string[] | undefined): string {
  if (!value) return ''
  if (Array.isArray(value)) return value.join(', ')
  return value
}

function normalizeTags(value: string | string[] | undefined): string {
  if (!value) return ''
  if (Array.isArray(value)) return value.join(', ')
  return value
}

/**
 * Run the complete AI master fill pipeline for a single product.
 * Generates all text content, searches for photos, resolves brand/category,
 * persists everything in a transaction, syncs to Equipment, and returns a score.
 */
export async function runMasterFill(productId: string): Promise<AiFillResult> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: {
      translations: true,
      category: true,
      brand: true,
    },
  })

  if (!product) {
    throw new Error(`Product not found: ${productId}`)
  }

  const enTranslation = product.translations.find((t) => t.locale === 'en')
  const productName = enTranslation?.name || product.sku || 'Unknown Equipment'
  const provider = getProvider()

  console.info(`[AI MasterFill] Generating content for: ${productName}`)

  const aiContent = await generateMasterFill(provider, {
    name: productName,
    brand: product.brand?.name || 'Unknown',
    category: product.category?.name || 'Equipment',
    specifications:
      (enTranslation?.specifications as Record<string, unknown>) ?? null,
    existingDescription: enTranslation?.longDescription || null,
    box_contents: product.boxContents,
    price_daily: product.priceDaily ? Number(product.priceDaily) : null,
  })

  const searchQueries = aiContent.photo_search_queries ?? [
    `${productName} product photo`,
    `${productName} professional equipment`,
    `${aiContent.brand ?? ''} ${productName} front view`,
  ]

  console.info(`[AI MasterFill] Searching photos for: ${productName}`)

  const sourcingProduct: ProductForSourcing = {
    id: productId,
    name: productName,
    sku: product.sku,
    category: product.category ? { name: product.category.name } : null,
    brand: product.brand ? { name: product.brand.name } : null,
    translations: product.translations.map((t) => ({
      locale: t.locale,
      name: t.name,
      longDescription: t.longDescription,
    })),
  }

  let photos: Awaited<ReturnType<typeof sourceImages>> = []
  try {
    photos = await sourceImages(sourcingProduct, 5, searchQueries)
  } catch (err) {
    console.warn(
      `[AI MasterFill] Photo sourcing failed for ${productName}:`,
      err instanceof Error ? err.message : String(err)
    )
  }

  const brand = await ensureBrand(aiContent.brand || product.brand?.name || null)
  const category = await resolveCategory(
    aiContent.category_suggestion,
    productName
  )

  const slug =
    aiContent.slug ||
    slugify(productName).slice(0, 120)

  const isPlaceholderContent = (val: string | undefined | null): boolean => {
    if (!val || val.trim() === '') return true
    const normalized = val.trim().toLowerCase()
    const nameNorm = productName.trim().toLowerCase()
    if (normalized === nameNorm) return true
    if (normalized === product.sku?.toLowerCase()) return true
    return false
  }

  const orExisting = (
    current: string | undefined | null,
    aiValue: string | undefined
  ): string => (current && !isPlaceholderContent(current) ? current : aiValue || '')

  await prisma.$transaction(async (tx) => {
    const productUpdates: Record<string, unknown> = {
      lastAiRunAt: new Date(),
      aiRunCount: { increment: 1 },
      needsAiReview: aiContent._needs_review ?? false,
    }

    if (brand.id) {
      productUpdates.brandId = brand.id
    }
    if (category.id) {
      productUpdates.categoryId = category.id
    }

    if (!product.boxContents && aiContent.box_contents) {
      productUpdates.boxContents = aiContent.box_contents
    }

    const tagStr = normalizeTags(aiContent.tags)
    if (!product.tags && tagStr) {
      productUpdates.tags = tagStr
    }

    if (
      photos.length > 0 &&
      (!product.featuredImage || product.featuredImage === '/images/placeholder.jpg')
    ) {
      productUpdates.featuredImage = photos[0].cloudinaryUrl || photos[0].url
    }

    if (photos.length > 1) {
      const gallery = photos.slice(1).map((p) => p.cloudinaryUrl || p.url)
      productUpdates.galleryImages = gallery
    }

    productUpdates.photoStatus = photos.length > 0 ? 'sourced' : 'pending'

    await tx.product.update({
      where: { id: productId },
      data: productUpdates as any,
    })

    await tx.productTranslation.upsert({
      where: { productId_locale: { productId, locale: 'en' } },
      create: {
        productId,
        locale: 'en',
        name: productName,
        shortDescription: aiContent.short_desc_en || '',
        longDescription: aiContent.long_desc_en || '',
        seoTitle: aiContent.seo_title_en || '',
        seoDescription: aiContent.seo_desc_en || '',
        seoKeywords: normalizeKeywords(aiContent.seo_keywords_en),
        specifications: (aiContent.specifications ?? {}) as any,
      },
      update: {
        shortDescription: orExisting(
          enTranslation?.shortDescription,
          aiContent.short_desc_en
        ),
        longDescription: orExisting(
          enTranslation?.longDescription,
          aiContent.long_desc_en
        ),
        seoTitle: orExisting(enTranslation?.seoTitle, aiContent.seo_title_en),
        seoDescription: orExisting(
          enTranslation?.seoDescription,
          aiContent.seo_desc_en
        ),
        seoKeywords: orExisting(
          enTranslation?.seoKeywords,
          normalizeKeywords(aiContent.seo_keywords_en)
        ),
        specifications: aiContent.specifications ? (aiContent.specifications as any) : undefined,
      },
    })

    const arTranslation = product.translations.find((t) => t.locale === 'ar')
    const specsForAllLocales = aiContent.specifications ? (aiContent.specifications as any) : undefined

    await tx.productTranslation.upsert({
      where: { productId_locale: { productId, locale: 'ar' } },
      create: {
        productId,
        locale: 'ar',
        name: aiContent.name_ar || productName,
        shortDescription: aiContent.short_desc_ar || '',
        longDescription: aiContent.long_desc_ar || '',
        seoTitle: aiContent.seo_title_ar || '',
        seoDescription: aiContent.seo_desc_ar || '',
        seoKeywords: normalizeKeywords(aiContent.seo_keywords_ar),
        specifications: specsForAllLocales,
      },
      update: {
        name: orExisting(arTranslation?.name, aiContent.name_ar),
        shortDescription: orExisting(
          arTranslation?.shortDescription,
          aiContent.short_desc_ar
        ),
        longDescription: orExisting(
          arTranslation?.longDescription,
          aiContent.long_desc_ar
        ),
        seoTitle: orExisting(arTranslation?.seoTitle, aiContent.seo_title_ar),
        seoDescription: orExisting(
          arTranslation?.seoDescription,
          aiContent.seo_desc_ar
        ),
        seoKeywords: orExisting(
          arTranslation?.seoKeywords,
          normalizeKeywords(aiContent.seo_keywords_ar)
        ),
        specifications: specsForAllLocales ?? undefined,
      },
    })

    const zhTranslation = product.translations.find((t) => t.locale === 'zh')
    const zhName = aiContent.name_zh || productName
    const zhSeoTitle = aiContent.seo_title_zh || `租赁 ${productName} 利雅得 | FlixCam`.slice(0, 60)
    const zhSeoDesc = aiContent.seo_desc_zh || `在利雅得租赁${productName}专业摄影设备。FlixCam提供最优质的设备租赁服务。`.slice(0, 160)
    const zhSeoKeywords = normalizeKeywords(aiContent.seo_keywords_zh) || `租赁 ${productName}, 利雅得摄影设备, ${aiContent.brand ?? ''} 租赁`

    await tx.productTranslation.upsert({
      where: { productId_locale: { productId, locale: 'zh' } },
      create: {
        productId,
        locale: 'zh',
        name: zhName,
        shortDescription: aiContent.short_desc_zh || '',
        longDescription: aiContent.long_desc_zh || '',
        seoTitle: zhSeoTitle,
        seoDescription: zhSeoDesc,
        seoKeywords: zhSeoKeywords,
        specifications: specsForAllLocales,
      },
      update: {
        name: orExisting(zhTranslation?.name, aiContent.name_zh),
        shortDescription: orExisting(
          zhTranslation?.shortDescription,
          aiContent.short_desc_zh
        ),
        longDescription: orExisting(
          zhTranslation?.longDescription,
          aiContent.long_desc_zh
        ),
        seoTitle: orExisting(zhTranslation?.seoTitle, zhSeoTitle),
        seoDescription: orExisting(
          zhTranslation?.seoDescription,
          zhSeoDesc
        ),
        seoKeywords: orExisting(
          zhTranslation?.seoKeywords,
          zhSeoKeywords
        ),
        specifications: specsForAllLocales ?? undefined,
      },
    })
  })

  try {
    await syncProductToEquipment(productId)
  } catch (err) {
    console.warn(
      `[AI MasterFill] Equipment sync failed for ${productName}:`,
      err instanceof Error ? err.message : String(err)
    )
  }

  const fieldsGenerated = Object.keys(aiContent).filter(
    (k) => !k.startsWith('_') && aiContent[k as keyof MasterFillOutput]
  ).length

  const totalChecks = 10
  let passing = 0
  if (aiContent.short_desc_en) passing++
  if (aiContent.long_desc_en && aiContent.long_desc_en.length >= 100) passing++
  if (aiContent.name_ar) passing++
  if (aiContent.long_desc_ar && aiContent.long_desc_ar.length >= 80) passing++
  if (aiContent.name_zh) passing++
  if (aiContent.seo_title_en) passing++
  if (aiContent.seo_desc_en) passing++
  if (aiContent.specifications && Object.keys(aiContent.specifications).length > 0) passing++
  if (photos.length > 0) passing++
  if (normalizeTags(aiContent.tags).split(',').length >= 5) passing++

  const score = Math.round((passing / totalChecks) * 100)

  console.info(
    `[AI MasterFill] Complete for: ${productName} | Photos: ${photos.length} | Score: ${score}% | Review: ${aiContent._needs_review ?? false}`
  )

  return {
    productId,
    fieldsGenerated,
    photosFound: photos.length,
    needsReview: aiContent._needs_review ?? false,
    brand: brand.name,
    category: category.name,
    score,
  }
}
