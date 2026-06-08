/**
 * Backfill photos for active equipment that have no image media.
 * Also auto-reviews high-confidence pending ProductImage rows.
 *
 * Run: npx tsx scripts/backfill-missing-equipment-photos.ts
 */

import 'dotenv/config'
import * as fs from 'fs'
import * as path from 'path'
import { PrismaClient } from '@prisma/client'
import { sourceImages, type ProductForSourcing } from '../src/lib/services/image-sourcing.service'
import type { SourcedImage } from '../src/lib/types/backfill.types'
import {
  promoteApprovedPhotosToProduct,
  mapSourceToProductImageSource,
  isPlaceholderUrl,
  getApprovedRealPhotoCount,
} from '../src/lib/services/product-photo.service'
import { syncProductToEquipment } from '../src/lib/services/product-equipment-sync.service'
import { buildEquipmentSearchQueries } from '../src/lib/services/equipment-search-queries'

const prisma = new PrismaClient()
const TARGET_IMAGE_COUNT = 3
const SOURCE_CANDIDATE_COUNT = 10
const CONCURRENCY = 2

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

function ensureMinimumApprovedImages(images: SourcedImage[]): SourcedImage[] {
  const nextImages = images.map((image) => ({ ...image }))
  let approvedCount = nextImages.filter((image) => image.approved).length
  if (approvedCount >= TARGET_IMAGE_COUNT) return nextImages

  const fallbackCandidates = nextImages
    .map((image, index) => ({ image, index }))
    .filter(({ image }) => canFallbackPromote(image))
    .sort((a, b) => getCandidateScore(b.image) - getCandidateScore(a.image))

  for (const { image, index } of fallbackCandidates) {
    if (approvedCount >= TARGET_IMAGE_COUNT) break
    nextImages[index] = { ...image, approved: true, pendingReview: false, reviewReason: undefined }
    approvedCount++
  }
  return nextImages
}

async function autoReviewPendingImages(): Promise<{ approved: number; rejected: number }> {
  const pending = await prisma.productImage.findMany({
    where: { isDeleted: false, pendingReview: true },
    select: {
      id: true,
      productId: true,
      url: true,
      imageSource: true,
      matchScore: true,
      scoreBreakdown: true,
    },
  })

  let approved = 0
  let rejected = 0
  const affected = new Set<string>()

  for (const img of pending) {
    const breakdown = img.scoreBreakdown as Record<string, unknown> | null
    const exact =
      breakdown?.exactSkuQuery === true || breakdown?.exactModelQuery === true
    const score = img.matchScore != null ? Number(img.matchScore) : 0
    const isStock =
      img.imageSource === 'STOCK_PHOTO' ||
      img.url.includes('unsplash') ||
      img.url.includes('pexels')

    if (exact && score >= 0.82) {
      await prisma.productImage.update({
        where: { id: img.id },
        data: { pendingReview: false, reviewedAt: new Date(), reviewedBy: 'system-backfill' },
      })
      affected.add(img.productId)
      approved++
      continue
    }

    if (isStock && score < 0.55 && !exact) {
      await prisma.productImage.update({
        where: { id: img.id },
        data: {
          pendingReview: false,
          isDeleted: true,
          rejectionReason: 'auto_reject_low_match_stock',
          reviewedAt: new Date(),
          reviewedBy: 'system-backfill',
        },
      })
      affected.add(img.productId)
      rejected++
    }
  }

  for (const productId of affected) {
    await promoteApprovedPhotosToProduct(productId)
    await syncProductToEquipment(productId)
  }

  return { approved, rejected }
}

async function backfillProduct(productId: string): Promise<{
  sku: string
  status: 'success' | 'partial' | 'review' | 'skipped' | 'failed' | 'no_product'
  approvedCount: number
  message: string
}> {
  const product = await prisma.product.findFirst({
    where: { id: productId, deletedAt: null },
    include: { brand: true, category: true, translations: true, equipment: true },
  })
  if (!product) {
    return { sku: productId, status: 'no_product', approvedCount: 0, message: 'Product not found' }
  }

  const enTranslation = product.translations.find((t) => t.locale === 'en')
  const productName =
    enTranslation?.name || product.equipment?.nameEn || product.sku || 'Unknown'

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
    const finalizedImages = ensureMinimumApprovedImages(sourced)

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
        await prisma.productImage.update({ where: { id: existingImageId }, data: imageData })
      } else {
        const created = await prisma.productImage.create({
          data: { productId: product.id, ...imageData },
        })
        existingImageIds.set(url, created.id)
      }
    }

    await promoteApprovedPhotosToProduct(product.id)
    await syncProductToEquipment(product.id)

    const totalApproved = await getApprovedRealPhotoCount(product.id)
    const sku = product.sku ?? product.id

    if (totalApproved >= TARGET_IMAGE_COUNT) {
      return {
        sku,
        status: 'success',
        approvedCount: totalApproved,
        message: `${totalApproved} approved images`,
      }
    }
    if (totalApproved > 0) {
      return {
        sku,
        status: 'partial',
        approvedCount: totalApproved,
        message: `${totalApproved} approved (need ${TARGET_IMAGE_COUNT})`,
      }
    }
    if (finalizedImages.length > 0) {
      return {
        sku,
        status: 'review',
        approvedCount: 0,
        message: `${finalizedImages.length} images pending review`,
      }
    }
    await prisma.product.update({
      where: { id: product.id },
      data: { photoStatus: 'not_found' },
    })
    return { sku, status: 'skipped', approvedCount: 0, message: 'No suitable images found' }
  } catch (error) {
    return {
      sku: product.sku ?? product.id,
      status: 'failed',
      approvedCount: 0,
      message: error instanceof Error ? error.message : String(error),
    }
  }
}

async function main() {
  console.log('=== Backfill missing equipment photos ===\n')

  const reviewStats = await autoReviewPendingImages()
  console.log(
    `Auto-review: approved ${reviewStats.approved}, rejected ${reviewStats.rejected} low-match stock\n`
  )

  const missing = await prisma.equipment.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      productId: { not: null },
      NOT: { media: { some: { deletedAt: null, type: 'image' } } },
    },
    select: { sku: true, model: true, productId: true },
    orderBy: { sku: 'asc' },
  })

  console.log(`Equipment missing images: ${missing.length}\n`)

  const results: Awaited<ReturnType<typeof backfillProduct>>[] = []
  const productIds = [
    ...new Set(missing.map((e) => e.productId).filter((id): id is string => Boolean(id))),
  ]

  for (let i = 0; i < productIds.length; i += CONCURRENCY) {
    const batch = productIds.slice(i, i + CONCURRENCY)
    const batchResults = await Promise.all(batch.map((id) => backfillProduct(id)))
    results.push(...batchResults)
    for (const r of batchResults) {
      console.log(`  [${r.status}] ${r.sku}: ${r.message}`)
    }
  }

  const stillMissing = await prisma.equipment.count({
    where: {
      deletedAt: null,
      isActive: true,
      NOT: { media: { some: { deletedAt: null, type: 'image' } } },
    },
  })

  const reportPath = path.join(process.cwd(), 'docs', 'EQUIPMENT_PHOTO_BACKFILL_REPORT.md')
  const lines = [
    '# Equipment photo backfill report',
    '',
    `Generated: ${new Date().toISOString()}`,
    '',
    `## Summary`,
    `- Started with **${missing.length}** active equipment items without images`,
    `- After backfill: **${stillMissing}** still without images`,
    `- Auto-review pending: **${reviewStats.approved}** approved, **${reviewStats.rejected}** rejected`,
    '',
    '## Per-SKU results',
    '',
    '| SKU | Status | Approved | Message |',
    '|-----|--------|----------|---------|',
    ...results.map(
      (r) => `| ${r.sku} | ${r.status} | ${r.approvedCount} | ${r.message.replace(/\|/g, '/')} |`
    ),
    '',
    '## Still missing images',
    '',
  ]

  const stillList = await prisma.equipment.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      NOT: { media: { some: { deletedAt: null, type: 'image' } } },
    },
    select: { sku: true, model: true },
    orderBy: { sku: 'asc' },
  })
  for (const e of stillList) {
    lines.push(`- ${e.sku} — ${e.model ?? '—'}`)
  }

  fs.mkdirSync(path.dirname(reportPath), { recursive: true })
  fs.writeFileSync(reportPath, lines.join('\n'), 'utf8')

  console.log(`\nStill missing images: ${stillMissing}`)
  console.log(`Report: ${reportPath}`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
