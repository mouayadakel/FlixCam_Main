/**
 * @file product-equipment-sync.service.ts
 * @description Sync Product → Equipment (one-way). Used after import and AI processing.
 *
 * LIMITATION — Reverse sync (Equipment → Product) is NOT implemented:
 * Manual edits to Equipment.specifications in admin do NOT update ProductTranslation.specifications.
 * This can cause divergence between what AI sees (Product) and what users see (Equipment).
 * Future: add syncEquipmentToProduct() when Equipment is updated and productId link exists.
 */

import { prisma } from '@/lib/db/prisma'
import { cacheDelete } from '@/lib/cache'
import { ProductStatus, ProductType, TranslationLocale } from '@prisma/client'
import { NotFoundError } from '@/lib/errors'
import { getRedisClient } from '@/lib/queue/redis.client'
import { getSyncReadyImageUrls, isPlaceholderUrl } from './product-photo.service'
import { generateSlug, ensureUniqueEquipmentSlug } from '@/lib/utils/slug.utils'

const EQUIPMENT_ENTITY_TYPE = 'equipment'
const LOCALE_TO_LANG: Record<TranslationLocale, string> = {
  en: 'en',
  ar: 'ar',
  zh: 'zh',
}

/**
 * Sync a Product to Equipment: create or update Equipment, Media, and Translation records.
 * Called after Product create/update (import, AI backfill).
 */

const SYNC_TRANSACTION_TIMEOUT_MS = 30000
const SYNC_TRANSACTION_MAX_WAIT_MS = 10000

async function invalidateEquipmentCaches(equipmentId: string): Promise<void> {
  try {
    await cacheDelete('equipmentDetail', equipmentId)
    await cacheDelete('equipmentList', 'featured')
  } catch (error) {
    console.warn('[ProductSync] Failed to clear direct equipment cache keys', error)
  }

  if (!process.env.REDIS_URL) return

  try {
    const redis = getRedisClient()
    if (redis.status !== 'ready') return
    const keys = await redis.keys('cache:equipmentList:*')
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  } catch (error) {
    console.warn('[ProductSync] Failed to clear equipment list caches', error)
  }
}

export async function syncProductToEquipment(productId: string): Promise<void> {
  const product = await prisma.product.findFirst({
    where: { id: productId, deletedAt: null },
    include: {
      translations: { where: { deletedAt: null }, orderBy: { locale: 'asc' } },
      brand: true,
      category: true,
      inventoryItems: { take: 1, orderBy: { createdAt: 'asc' } },
    },
  })
  if (!product) throw new NotFoundError('Product', productId)

  const enTranslation = product.translations.find((t) => t.locale === 'en')
  const model = enTranslation?.name ?? product.sku ?? product.id
  const sku = product.sku ?? `prod-${product.id}`
  const barcode = product.inventoryItems[0]?.barcode ?? null
  const specifications = (enTranslation?.specifications as Record<string, unknown> | null) ?? null

  const galleryUrls = Array.isArray(product.galleryImages)
    ? (product.galleryImages as string[])
    : []
  const rawImageUrls = [product.featuredImage, ...galleryUrls].filter(Boolean)
  let imageUrls = rawImageUrls.filter((url) => !isPlaceholderUrl(url))
  if (imageUrls.length === 0) {
    imageUrls = await getSyncReadyImageUrls(productId)
  }

  await prisma.$transaction(
    async (tx) => {
      let existing = await tx.equipment.findFirst({
        where: { productId: product.id, deletedAt: null },
      })
      if (!existing) {
        existing = await tx.equipment.findFirst({
          where: { id: product.id, deletedAt: null },
        })
      }
      // If Product has barcode and no Equipment found yet, check for soft-deleted Equipment with same barcode (restore it)
      if (!existing && barcode) {
        const byBarcode = await tx.equipment.findFirst({
          where: { barcode },
        })
        if (byBarcode) {
          existing = byBarcode
        }
      }

      const baseSlug = generateSlug(model)
      const slug = await ensureUniqueEquipmentSlug(tx, baseSlug, existing?.id)

      const specsValue =
        specifications != null ? (JSON.parse(JSON.stringify(specifications)) as object) : undefined

      // Build customFields with boxContents, relatedProducts, bufferTime, tags
      const existingCustomFields = (existing?.customFields as Record<string, unknown> | null) ?? {}
      const customFieldsMerged: Record<string, unknown> = { ...existingCustomFields }
      if (product.boxContents) customFieldsMerged.boxContents = product.boxContents
      if (product.tags) customFieldsMerged.tags = product.tags
      if (product.bufferTime != null) customFieldsMerged.bufferTime = product.bufferTime
      if (product.relatedProducts) customFieldsMerged.relatedEquipmentIds = product.relatedProducts
      const customFieldsValue =
        Object.keys(customFieldsMerged).length > 0
          ? (JSON.parse(JSON.stringify(customFieldsMerged)) as object)
          : undefined

      const zhTranslation = product.translations.find((t) => t.locale === 'zh')
      const arTranslation = product.translations.find((t) => t.locale === 'ar')

      // Default synced equipment to active unless product is intentionally hidden/archived.
      const shouldBeActive =
        product.status !== ProductStatus.HIDDEN && product.status !== ProductStatus.ARCHIVED
      const equipmentUpdateData: Record<string, unknown> = {
        sku,
        ...(barcode != null && { barcode }),
        slug,
        productId: product.id,
        model,
        nameEn: enTranslation?.name ?? model,
        nameZh: zhTranslation?.name ?? null,
        descriptionEn: enTranslation?.longDescription ?? enTranslation?.shortDescription ?? null,
        descriptionZh: zhTranslation?.longDescription ?? zhTranslation?.shortDescription ?? null,
        categoryId: product.categoryId,
        brandId: product.brandId,
        dailyPrice: product.priceDaily,
        weeklyPrice: product.priceWeekly,
        monthlyPrice: product.priceMonthly,
        quantityTotal: product.quantity ?? 1,
        quantityAvailable: product.quantity ?? 1,
        specifications: specsValue,
        specSource: specsValue ? 'import' : undefined,
        customFields: customFieldsValue,
        isActive: shouldBeActive,
        updatedAt: new Date(),
        ...(existing?.deletedAt && { deletedAt: null, deletedBy: null }),
      }

      // We use an upsert to guarantee we don't hit a unique constraint on ID if somehow missed by findFirst
      // (e.g., deleted items or disconnected items with the same ID).
      const equipmentIdToUse = existing ? existing.id : product.id

      // Remove any undefined properties and map to equipment model fields
      const equipmentDataToInsert = {
        id: equipmentIdToUse,
        sku,
        ...(barcode != null && { barcode }),
        slug,
        productId: product.id,
        model,
        nameEn: enTranslation?.name ?? model,
        nameZh: zhTranslation?.name ?? null,
        descriptionEn: enTranslation?.longDescription ?? enTranslation?.shortDescription ?? null,
        descriptionZh: zhTranslation?.longDescription ?? zhTranslation?.shortDescription ?? null,
        categoryId: product.categoryId,
        brandId: product.brandId,
        dailyPrice: product.priceDaily,
        weeklyPrice: product.priceWeekly ?? null,
        monthlyPrice: product.priceMonthly ?? null,
        quantityTotal: product.quantity ?? 1,
        quantityAvailable: product.quantity ?? 1,
        isActive: shouldBeActive,
        specifications: specsValue ?? null,
        specSource: specsValue ? 'import' : null,
        customFields: customFieldsValue ?? null,
        deletedAt: null,
        deletedBy: null,
      }

      const equipmentDataToUpdate = {
        ...equipmentDataToInsert,
        updatedAt: new Date(),
      }

      // We can't update ID so we remove it from update
      delete (equipmentDataToUpdate as any).id

      const upsertedEquipment = await tx.equipment.upsert({
        where: { id: equipmentIdToUse },
        update: equipmentDataToUpdate as any,
        create: equipmentDataToInsert as any,
      })

      const equipmentId = upsertedEquipment.id

      // Media: Equipment.media is master. Never overwrite when Equipment already has images.
      const existingImageCount = await tx.media.count({
        where: { equipmentId, deletedAt: null, type: 'image' },
      })
      const preserveExistingMedia = existingImageCount > 0

      if (!preserveExistingMedia) {
        await tx.media.deleteMany({
          where:
            imageUrls.length > 0
              ? {
                  equipmentId,
                  url: { notIn: imageUrls },
                }
              : { equipmentId },
        })

        for (let i = 0; i < imageUrls.length; i++) {
          const url = imageUrls[i]
          const existingMedia = await tx.media.findFirst({
            where: { equipmentId, url },
          })
          if (!existingMedia) {
            await tx.media.create({
              data: {
                url,
                type: 'image',
                filename: url.split('/').pop() ?? `image-${i}.jpg`,
                mimeType: 'image/jpeg',
                equipmentId,
                imageSource: 'import',
                sortOrder: i,
              },
            })
          }
        }
      }

      for (const pt of product.translations) {
        const lang = LOCALE_TO_LANG[pt.locale]
        const fields = [
          { field: 'name', value: pt.name },
          { field: 'short_description', value: pt.shortDescription },
          { field: 'long_description', value: pt.longDescription },
          { field: 'seo_title', value: pt.seoTitle },
          { field: 'seo_description', value: pt.seoDescription },
          { field: 'seo_keywords', value: pt.seoKeywords },
        ]
        for (const { field, value } of fields) {
          await tx.translation.upsert({
            where: {
              entityType_entityId_field_language: {
                entityType: EQUIPMENT_ENTITY_TYPE,
                entityId: equipmentId,
                field,
                language: lang,
              },
            },
            update: { value, updatedAt: new Date() },
            create: {
              entityType: EQUIPMENT_ENTITY_TYPE,
              entityId: equipmentId,
              field,
              language: lang,
              value,
            },
          })
        }
      }
    },
    {
      maxWait: SYNC_TRANSACTION_MAX_WAIT_MS,
      timeout: SYNC_TRANSACTION_TIMEOUT_MS,
    }
  )

  const syncedEquipment = await prisma.equipment.findFirst({
    where: { productId, deletedAt: null },
    select: { id: true },
  })
  if (syncedEquipment?.id) {
    await invalidateEquipmentCaches(syncedEquipment.id)
  }
}

/**
 * Sync an Equipment to Product: create or update Product and ProductTranslation.
 * Used for seed and when Equipment is created/updated manually (e.g. admin form).
 */
export async function syncEquipmentToProduct(equipmentId: string, options?: { forceSpecOverride?: boolean }): Promise<void> {
  const equipment = await prisma.equipment.findFirst({
    where: { id: equipmentId, deletedAt: null },
    include: {
      media: {
        where: { deletedAt: null, type: 'image' },
        orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
      },
      brand: true,
      category: true,
    },
  })
  if (!equipment) throw new NotFoundError('Equipment', equipmentId)

  const defaultBrandId = equipment.brandId ?? undefined
  if (!defaultBrandId) {
    throw new Error('Equipment must have a brand to sync to Product')
  }

  const featuredImage = equipment.media[0]?.url ?? '/images/equipment-placeholder.svg'
  const galleryUrls = equipment.media.map((m) => m.url)
  // Only use real gallery images — no padding with duplicates
  const galleryImages: string[] = [...galleryUrls]
  const name = equipment.model ?? equipment.sku

  // Extract data from customFields
  const customFields = equipment.customFields as Record<string, unknown> | null
  const boxContents = (customFields?.boxContents as string) ?? null
  const tags = (customFields?.tags as string) ?? null
  const bufferTime = (customFields?.bufferTime as number) ?? 0
  const depositAmount = (customFields?.depositAmount as number) ?? undefined
  const subCategoryId = (customFields?.subCategoryId as string) ?? null

  // Fallback descriptions — only used when creating new translations (not overwriting existing)
  const fallbackShortDesc = `Rental equipment: ${name}.`
  const fallbackLongDesc = `Professional rental equipment: ${name} (SKU: ${equipment.sku}). Available for daily, weekly and monthly hire.`
  const fallbackSeoTitle = `${name} | FlixCam Rental`
  const fallbackSeoDesc = `Rent ${name}. SKU: ${equipment.sku}.`
  const fallbackSeoKeywords = `${equipment.sku}, ${name}, rental, equipment`

  // Fetch existing translations from the Translation table to preserve AI-generated content
  const existingEquipmentTranslations = await prisma.translation.findMany({
    where: { entityType: 'equipment', entityId: equipmentId, deletedAt: null },
  })
  const translationMap = new Map<string, Map<string, string>>()
  for (const t of existingEquipmentTranslations) {
    if (!translationMap.has(t.language)) translationMap.set(t.language, new Map())
    translationMap.get(t.language)!.set(t.field, t.value)
  }

  await prisma.$transaction(async (tx) => {
    await tx.product.upsert({
      where: { id: equipment.id },
      update: {
        sku: equipment.sku,
        brandId: defaultBrandId,
        categoryId: equipment.categoryId,
        subCategoryId: subCategoryId || undefined,
        featuredImage,
        galleryImages: galleryImages as object,
        priceDaily: equipment.dailyPrice,
        priceWeekly: equipment.weeklyPrice ?? undefined,
        priceMonthly: equipment.monthlyPrice ?? undefined,
        depositAmount: depositAmount ?? undefined,
        quantity: equipment.quantityTotal,
        boxContents,
        tags,
        bufferTime,
        updatedAt: new Date(),
      },
      create: {
        id: equipment.id,
        status: ProductStatus.DRAFT,
        productType: ProductType.RENTAL,
        sku: equipment.sku,
        brandId: defaultBrandId,
        categoryId: equipment.categoryId,
        subCategoryId: subCategoryId || undefined,
        featuredImage,
        galleryImages: galleryImages as object,
        priceDaily: equipment.dailyPrice,
        priceWeekly: equipment.weeklyPrice ?? undefined,
        priceMonthly: equipment.monthlyPrice ?? undefined,
        depositAmount: depositAmount ?? undefined,
        quantity: equipment.quantityTotal,
        boxContents,
        tags,
        bufferTime,
      },
    })

    for (const locale of ['en', 'ar', 'zh'] as const) {
      const loc = locale as TranslationLocale
      const existing = translationMap.get(locale)

      // Check if we have existing ProductTranslation for this locale
      const existingPT = await tx.productTranslation.findUnique({
        where: { productId_locale: { productId: equipment.id, locale: loc } },
      })

      // Use existing translation data if available, fallback to equipment Translation table, then generic defaults
      const resolvedName = existing?.get('name') || name
      const resolvedShortDesc =
        existingPT?.shortDescription || existing?.get('short_description') || fallbackShortDesc
      const resolvedLongDesc =
        existingPT?.longDescription || existing?.get('long_description') || fallbackLongDesc
      const resolvedSeoTitle =
        existingPT?.seoTitle || existing?.get('seo_title') || fallbackSeoTitle
      const resolvedSeoDesc =
        existingPT?.seoDescription || existing?.get('seo_description') || fallbackSeoDesc
      const resolvedSeoKeywords =
        existingPT?.seoKeywords || existing?.get('seo_keywords') || fallbackSeoKeywords

      // Preserve specs from existing ProductTranslation unless forceSpecOverride is true
      const resolvedSpecs = options?.forceSpecOverride
        ? (equipment.specifications ? JSON.parse(JSON.stringify(equipment.specifications)) : undefined)
        : (existingPT?.specifications ??
          (equipment.specifications ? JSON.parse(JSON.stringify(equipment.specifications)) : undefined))

      await tx.productTranslation.upsert({
        where: {
          productId_locale: { productId: equipment.id, locale: loc },
        },
        update: {
          name: resolvedName,
          // Only update descriptions/SEO if they were the old generic fallback or empty
          shortDescription: existingPT?.shortDescription || resolvedShortDesc,
          longDescription: existingPT?.longDescription || resolvedLongDesc,
          seoTitle: existingPT?.seoTitle || resolvedSeoTitle,
          seoDescription: existingPT?.seoDescription || resolvedSeoDesc,
          seoKeywords: existingPT?.seoKeywords || resolvedSeoKeywords,
          specifications: resolvedSpecs,
          updatedAt: new Date(),
        },
        create: {
          productId: equipment.id,
          locale: loc,
          name: resolvedName,
          shortDescription: resolvedShortDesc,
          longDescription: resolvedLongDesc,
          seoTitle: resolvedSeoTitle,
          seoDescription: resolvedSeoDesc,
          seoKeywords: resolvedSeoKeywords,
          specifications: resolvedSpecs,
        },
      })
    }
  })
}
