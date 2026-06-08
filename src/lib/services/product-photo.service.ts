/**
 * @file product-photo.service.ts
 * @description Photo state manager: placeholder detection, approved-photo counting,
 * hero selection, 3-5 enforcement, and promotion of approved ProductImage rows into
 * Product featuredImage/galleryImages. Single source of truth for photo completeness.
 * @module lib/services
 */

import { prisma } from '@/lib/db/prisma'
import { ImageSource } from '@prisma/client'
import type { ImageSourceType } from '@/lib/types/backfill.types'

const MIN_APPROVED_REAL_PHOTOS = 3
const MAX_APPROVED_PHOTOS = 5

/** AI-generated sources never count toward required real-photo minimum */
const AI_GENERATED_SOURCES: ImageSource[] = ['AI_GENERATED']

/** Placeholder URL patterns — treat as missing, not valid */
const PLACEHOLDER_PATTERNS = [
  /placehold\.co/i,
  /placeholder\.(jpg|jpeg|png|webp|gif)/i,
  /\/images\/placeholder/i,
  /placeholder/i,
]

export type PhotoCompleteness = {
  isComplete: boolean
  approvedRealCount: number
  hasPlaceholderHero: boolean
  heroIsApproved: boolean
  canPublish: boolean
}

/**
 * Detect if a URL is a placeholder. Placeholders count as missing.
 */
export function isPlaceholderUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string' || url.trim() === '') return true
  return PLACEHOLDER_PATTERNS.some((p) => p.test(url))
}

/**
 * Check if an image source is AI-generated (does not count toward real-photo minimum).
 */
export function isAiGeneratedSource(source: ImageSource | string): boolean {
  return AI_GENERATED_SOURCES.includes(source as ImageSource)
}

/**
 * Get approved real (non-AI) ProductImage rows for a product, ordered by isPrimary then sortOrder.
 */
export async function getApprovedRealProductImages(productId: string) {
  const images = await prisma.productImage.findMany({
    where: {
      productId,
      isDeleted: false,
      pendingReview: false,
      url: { not: '' },
    },
    orderBy: [
      { isPrimary: 'desc' },
      { matchScore: 'desc' },
      { qualityScore: 'desc' },
      { sortOrder: 'asc' },
      { createdAt: 'asc' },
    ],
  })
  return images.filter((img) => !isAiGeneratedSource(img.imageSource))
}

/**
 * Get approved real photo count (excludes AI-generated, excludes placeholders).
 */
export async function getApprovedRealPhotoCount(productId: string): Promise<number> {
  const images = await getApprovedRealProductImages(productId)
  return images.filter((img) => !isPlaceholderUrl(img.url)).length
}

/**
 * Compute photo completeness for a product.
 */
export async function getPhotoCompleteness(productId: string): Promise<PhotoCompleteness> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: { featuredImage: true, productImages: { where: { isDeleted: false } } },
  })
  if (!product) {
    return {
      isComplete: false,
      approvedRealCount: 0,
      hasPlaceholderHero: true,
      heroIsApproved: false,
      canPublish: false,
    }
  }

  const approvedReal = await getApprovedRealProductImages(productId)
  const approvedRealCount = approvedReal.filter((img) => !isPlaceholderUrl(img.url)).length
  const hasPlaceholderHero = isPlaceholderUrl(product.featuredImage)
  const heroUrl = product.featuredImage?.trim()
  const heroIsApproved = heroUrl
    ? approvedReal.some((img) => img.url === heroUrl && !isAiGeneratedSource(img.imageSource))
    : false

  const isComplete =
    approvedRealCount >= MIN_APPROVED_REAL_PHOTOS &&
    approvedRealCount <= MAX_APPROVED_PHOTOS &&
    !hasPlaceholderHero &&
    heroIsApproved

  const canPublish =
    approvedRealCount >= MIN_APPROVED_REAL_PHOTOS && !hasPlaceholderHero && heroIsApproved

  return {
    isComplete,
    approvedRealCount,
    hasPlaceholderHero,
    heroIsApproved,
    canPublish,
  }
}

/**
 * Build ordered list of approved real image URLs for sync (hero first, then gallery).
 * Never includes placeholders.
 */
export async function getSyncReadyImageUrls(productId: string): Promise<string[]> {
  const images = await getApprovedRealProductImages(productId)
  const urls = images
    .filter((img) => !isPlaceholderUrl(img.url))
    .slice(0, MAX_APPROVED_PHOTOS)
    .map((img) => img.url)
  return [...new Set(urls)]
}

/**
 * Seed approved ProductImage rows from the live Product hero/gallery when legacy imports
 * populated Product fields directly but never created ProductImage records.
 */
export async function seedApprovedProductImagesFromLiveFields(productId: string): Promise<number> {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    select: {
      featuredImage: true,
      galleryImages: true,
      productImages: {
        where: { isDeleted: false },
        select: {
          id: true,
          url: true,
          imageSource: true,
          pendingReview: true,
        },
      },
    },
  })
  if (!product) return 0

  const galleryUrls = Array.isArray(product.galleryImages)
    ? (product.galleryImages as string[])
    : []
  const liveUrls = [product.featuredImage, ...galleryUrls]
    .map((url) => (typeof url === 'string' ? url.trim() : ''))
    .filter((url) => url && !isPlaceholderUrl(url))

  const dedupedLiveUrls = [...new Set(liveUrls)].slice(0, MAX_APPROVED_PHOTOS)
  if (dedupedLiveUrls.length === 0) return 0

  const hasApprovedRealImages = product.productImages.some(
    (img) =>
      !img.pendingReview && !isPlaceholderUrl(img.url) && !isAiGeneratedSource(img.imageSource)
  )
  if (hasApprovedRealImages) return 0

  await prisma.productImage.updateMany({
    where: { productId, isDeleted: false },
    data: { isPrimary: false },
  })

  for (let index = 0; index < dedupedLiveUrls.length; index++) {
    const url = dedupedLiveUrls[index]
    const existing = product.productImages.find((img) => img.url === url)
    const imageSource =
      existing?.imageSource && !isAiGeneratedSource(existing.imageSource)
        ? existing.imageSource
        : ImageSource.UPLOAD

    if (existing) {
      await prisma.productImage.update({
        where: { id: existing.id },
        data: {
          imageSource,
          pendingReview: false,
          isPrimary: index === 0,
          sortOrder: index,
          isDeleted: false,
          reviewReason: null,
          rejectionReason: null,
        },
      })
      continue
    }

    await prisma.productImage.create({
      data: {
        productId,
        url,
        imageSource,
        pendingReview: false,
        sortOrder: index,
        isPrimary: index === 0,
      },
    })
  }

  return dedupedLiveUrls.length
}

/**
 * Map ImageSourceType to Prisma ImageSource for ProductImage.
 */
export function mapSourceToProductImageSource(source: ImageSourceType): ImageSource {
  if (source === 'BRAND_ASSET') return ImageSource.BRAND_ASSET
  if (source === 'AI_GENERATED' || source === 'dalle') return ImageSource.AI_GENERATED
  if (source === 'unsplash' || source === 'pexels') return ImageSource.STOCK_PHOTO
  if (source === 'google_search') return ImageSource.WEB_SCRAPED
  return ImageSource.STOCK_PHOTO
}

/**
 * Use Equipment.media as the master source: copy all linked image URLs to Product and
 * ProductImage (approved). Equipment media is never modified.
 */
export async function promoteEquipmentMediaToProduct(equipmentId: string): Promise<number> {
  const equipment = await prisma.equipment.findFirst({
    where: { id: equipmentId, deletedAt: null },
    include: {
      media: {
        where: { deletedAt: null, type: 'image' },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      },
    },
  })
  if (!equipment) return 0

  const productId = equipment.productId ?? equipment.id
  const product = await prisma.product.findFirst({
    where: { id: productId, deletedAt: null },
    select: { id: true },
  })
  if (!product) return 0

  const urls = [
    ...new Set(
      equipment.media
        .map((m) => m.url.trim())
        .filter((url) => url && !isPlaceholderUrl(url))
    ),
  ]
  if (urls.length === 0) return 0

  const [hero, ...gallery] = urls
  const photoStatus = urls.length >= MIN_APPROVED_REAL_PHOTOS ? 'sufficient' : 'incomplete'

  await prisma.product.update({
    where: { id: productId },
    data: {
      featuredImage: hero,
      galleryImages: gallery.length > 0 ? gallery : [],
      photoStatus,
    },
  })

  await prisma.productImage.updateMany({
    where: { productId, isDeleted: false },
    data: { isPrimary: false },
  })

  for (let index = 0; index < urls.length; index++) {
    const url = urls[index]
    const imageSource = url.includes('/uploads/') ? ImageSource.UPLOAD : ImageSource.WEB_SCRAPED
    const existing = await prisma.productImage.findFirst({
      where: { productId, url, isDeleted: false },
    })
    if (existing) {
      await prisma.productImage.update({
        where: { id: existing.id },
        data: {
          imageSource,
          pendingReview: false,
          isPrimary: index === 0,
          sortOrder: index,
          reviewReason: null,
          rejectionReason: null,
        },
      })
    } else {
      await prisma.productImage.create({
        data: {
          productId,
          url,
          imageSource,
          pendingReview: false,
          isPrimary: index === 0,
          sortOrder: index,
        },
      })
    }
  }

  return urls.length
}

/**
 * Promote approved ProductImage rows into Product.featuredImage and Product.galleryImages.
 * Sets photoStatus based on completeness. Does not sync to Equipment (caller does that).
 */
export async function promoteApprovedPhotosToProduct(productId: string): Promise<void> {
  await seedApprovedProductImagesFromLiveFields(productId)
  const urls = await getSyncReadyImageUrls(productId)
  if (urls.length === 0) {
    await prisma.product.update({
      where: { id: productId },
      data: {
        featuredImage: '',
        galleryImages: [],
        photoStatus: 'incomplete',
      },
    })
    return
  }

  const [hero, ...gallery] = urls.slice(0, MAX_APPROVED_PHOTOS)
  const completeness = await getPhotoCompleteness(productId)
  const photoStatus =
    completeness.approvedRealCount >= MIN_APPROVED_REAL_PHOTOS ? 'sufficient' : 'incomplete'

  await prisma.product.update({
    where: { id: productId },
    data: {
      featuredImage: hero,
      galleryImages: gallery.length > 0 ? gallery : [],
      photoStatus,
    },
  })
}
