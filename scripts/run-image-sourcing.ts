/**
 * @file run-image-sourcing.ts
 * @description Photo backfill script: sources images, persists to ProductImage,
 * promotes approved photos to Product, syncs to Equipment.
 * Run: npx ts-node scripts/run-image-sourcing.ts
 */

import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { sourceImages, ProductForSourcing } from '../src/lib/services/image-sourcing.service'
import type { SourcedImage } from '../src/lib/types/backfill.types'
import {
  promoteApprovedPhotosToProduct,
  mapSourceToProductImageSource,
  isPlaceholderUrl,
  getApprovedRealPhotoCount,
  seedApprovedProductImagesFromLiveFields,
} from '../src/lib/services/product-photo.service'
import { syncProductToEquipment } from '../src/lib/services/product-equipment-sync.service'
import { buildEquipmentSearchQueries } from '../src/lib/services/equipment-search-queries'

const prisma = new PrismaClient()
const TARGET_IMAGE_COUNT = 3
const SOURCE_CANDIDATE_COUNT = 10
const SOURCE_CONCURRENCY = 3

function getCandidateScore(image: SourcedImage): number {
  return image.matchScore ?? image.qualityScore ?? 0
}

function hasExactIdentitySignal(image: SourcedImage): boolean {
  return (
    image.scoreBreakdown?.exactSkuQuery === true || image.scoreBreakdown?.exactModelQuery === true
  )
}

function canFallbackPromote(image: SourcedImage): boolean {
  if (image.approved || image.isAiGenerated) return false
  if (!hasExactIdentitySignal(image)) return false

  const score = getCandidateScore(image)
  if (image.source === 'google_search') return score >= 0.82
  if (image.source === 'unsplash' || image.source === 'pexels') return score >= 0.9
  return false
}

function ensureMinimumApprovedImages(images: SourcedImage[]): {
  images: SourcedImage[]
  fallbackPromotedCount: number
} {
  const nextImages = images.map((image) => ({ ...image }))
  let approvedCount = nextImages.filter((image) => image.approved).length
  if (approvedCount >= TARGET_IMAGE_COUNT) {
    return { images: nextImages, fallbackPromotedCount: 0 }
  }

  const fallbackCandidates = nextImages
    .map((image, index) => ({ image, index }))
    .filter(({ image }) => canFallbackPromote(image))
    .sort((a, b) => getCandidateScore(b.image) - getCandidateScore(a.image))

  let fallbackPromotedCount = 0
  for (const { image, index } of fallbackCandidates) {
    if (approvedCount >= TARGET_IMAGE_COUNT) break
    nextImages[index] = {
      ...image,
      approved: true,
      pendingReview: false,
      reviewReason: undefined,
    }
    approvedCount++
    fallbackPromotedCount++
  }

  return { images: nextImages, fallbackPromotedCount }
}

async function run() {
  console.log('🚀 Starting Automated Image Sourcing Pipeline...')
  console.log(`🔑 Pexels: ${process.env.PEXELS_API_KEY ? '✅' : '❌'}`)
  console.log(
    `🔑 Gemini: ${process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY ? '✅' : '❌'}`
  )
  console.log(`🔑 Unsplash: ${process.env.UNSPLASH_ACCESS_KEY ? '✅' : '❌'}`)
  console.log(
    `🔑 Google CSE: ${process.env.GOOGLE_CUSTOM_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_ENGINE_ID ? '✅' : '❌'}`
  )

  const warehouseProducts = await prisma.product.findMany({
    where: {
      status: { not: 'ARCHIVED' },
      deletedAt: null,
      equipment: {
        is: {
          deletedAt: null,
          quantityAvailable: { gt: 0 },
        },
      },
    },
    include: { brand: true, category: true, translations: true, equipment: true },
  })

  let restoredExistingPhotoSets = 0
  for (const product of warehouseProducts) {
    const restoredCount = await seedApprovedProductImagesFromLiveFields(product.id)
    if (restoredCount === 0) continue
    await promoteApprovedPhotosToProduct(product.id)
    await syncProductToEquipment(product.id)
    restoredExistingPhotoSets++
  }

  if (restoredExistingPhotoSets > 0) {
    console.log(
      `♻️ Restored legacy live photos for ${restoredExistingPhotoSets} warehouse products`
    )
  }

  const productsNeedingImages = warehouseProducts.filter((p) => {
    const hasPlaceholder = isPlaceholderUrl(p.featuredImage)
    const gallery = Array.isArray(p.galleryImages) ? (p.galleryImages as string[]) : []
    const validCount = [p.featuredImage, ...gallery].filter((u) => u && !isPlaceholderUrl(u)).length
    return hasPlaceholder || validCount < TARGET_IMAGE_COUNT
  })

  console.log(`\n📦 Found ${productsNeedingImages.length} warehouse products needing images.\n`)

  let successCount = 0
  let partialCount = 0
  let skippedCount = 0
  let failCount = 0
  let reviewOnlyCount = 0

  const processProduct = async (
    product: (typeof productsNeedingImages)[number],
    index: number
  ): Promise<'success' | 'partial' | 'review' | 'skipped' | 'failed'> => {
    const enTranslation = product.translations.find((t) => t.locale === 'en')
    const productName = enTranslation?.name || product.equipment?.nameEn || product.sku || 'Unknown'

    console.log(`\n--------------------------------------------------`)
    console.log(
      `📸 [${index + 1}/${productsNeedingImages.length}] [${product.sku}] ${product.brand?.name ?? ''} ${productName}`
    )

    const sourcingProduct: ProductForSourcing = {
      id: product.id,
      name: productName,
      sku: product.sku,
      category: product.category,
      brand: product.brand,
      translations: product.translations,
    }

    const searchQueries = buildEquipmentSearchQueries({
      name: productName,
      sku: product.sku,
      category: product.category ? { name: product.category.name } : null,
      brand: product.brand ? { name: product.brand.name } : null,
    })

    try {
      const sourced = await sourceImages(sourcingProduct, SOURCE_CANDIDATE_COUNT, searchQueries)
      const { images: finalizedImages, fallbackPromotedCount } =
        ensureMinimumApprovedImages(sourced)

      const existingImages = await prisma.productImage.findMany({
        where: { productId: product.id, isDeleted: false },
        select: { id: true, url: true },
      })
      const existingImageIds = new Map(existingImages.map((image) => [image.url, image.id]))

      for (let i = 0; i < finalizedImages.length; i++) {
        const s = finalizedImages[i]
        const url = s.cloudinaryUrl || s.url
        if (!url) continue
        const imageData = {
          url,
          imageSource: mapSourceToProductImageSource(s.source),
          pendingReview: !s.approved,
          qualityScore: s.qualityScore ?? null,
          matchScore: s.matchScore ?? s.qualityScore ?? null,
          sourceQuery: s.sourceQuery ?? null,
          sourceDomain: s.sourceDomain ?? null,
          scoreBreakdown: s.scoreBreakdown
            ? JSON.parse(JSON.stringify(s.scoreBreakdown))
            : undefined,
          reviewReason: s.reviewReason ?? null,
          sortOrder: i,
          isPrimary: i === 0 && s.approved,
          cloudinaryPublicId: s.cloudinaryPublicId ?? null,
        }
        const existingImageId = existingImageIds.get(url)
        if (existingImageId) {
          await prisma.productImage.update({
            where: { id: existingImageId },
            data: imageData,
          })
          continue
        }

        const createdImage = await prisma.productImage.create({
          data: {
            productId: product.id,
            ...imageData,
          },
        })
        existingImageIds.set(url, createdImage.id)
      }

      await promoteApprovedPhotosToProduct(product.id)
      await syncProductToEquipment(product.id)

      const newlyApprovedCount = finalizedImages.filter((s) => s.approved).length
      const totalApprovedCount = await getApprovedRealPhotoCount(product.id)

      if (totalApprovedCount >= TARGET_IMAGE_COUNT) {
        const fallbackNote =
          fallbackPromotedCount > 0 ? `, ${fallbackPromotedCount} fallback-promoted` : ''
        console.log(
          `   ✅ Product now has ${totalApprovedCount} approved real images (${newlyApprovedCount} newly promoted${fallbackNote})`
        )
        return 'success'
      } else if (totalApprovedCount > 0) {
        const fallbackNote =
          fallbackPromotedCount > 0 ? `, ${fallbackPromotedCount} fallback-promoted` : ''
        console.log(
          `   ⚠️ Product now has ${totalApprovedCount} approved real images (${newlyApprovedCount} newly promoted${fallbackNote})`
        )
        return 'partial'
      } else if (finalizedImages.length > 0) {
        console.log(`   ⚠️ Stored ${finalizedImages.length} images for review only; none promoted`)
        return 'review'
      } else {
        console.log('   ⚠️ No suitable images found')
        await prisma.product.update({
          where: { id: product.id },
          data: { photoStatus: 'not_found' },
        })
        return 'skipped'
      }
    } catch (error) {
      console.error(`   ❌ Error:`, (error as Error).message)
      return 'failed'
    }
  }

  for (let start = 0; start < productsNeedingImages.length; start += SOURCE_CONCURRENCY) {
    const batch = productsNeedingImages.slice(start, start + SOURCE_CONCURRENCY)
    const results = await Promise.all(
      batch.map((product, offset) => processProduct(product, start + offset))
    )

    for (const result of results) {
      if (result === 'success') successCount++
      if (result === 'partial') partialCount++
      if (result === 'review') reviewOnlyCount++
      if (result === 'skipped') skippedCount++
      if (result === 'failed') failCount++
    }
  }

  console.log('\n==================================================')
  console.log('🎉 Image Sourcing Complete!')
  console.log(`   ✅ Success: ${successCount}`)
  console.log(`   🟠 Partial: ${partialCount}`)
  console.log(`   🟡 Review only: ${reviewOnlyCount}`)
  console.log(`   ⚠️ Skipped: ${skippedCount}`)
  console.log(`   ❌ Failed: ${failCount}`)
  console.log('==================================================\n')
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
