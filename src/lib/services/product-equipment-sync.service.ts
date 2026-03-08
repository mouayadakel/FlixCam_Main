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
import { ProductStatus, ProductType, TranslationLocale } from '@prisma/client'
import { NotFoundError } from '@/lib/errors'

const EQUIPMENT_ENTITY_TYPE = 'equipment'
const LOCALE_TO_LANG: Record<TranslationLocale, string> = {
  en: 'en',
  ar: 'ar',
  zh: 'zh',
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120)
}

const MAX_SLUG_ATTEMPTS = 100

async function ensureUniqueSlug(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  baseSlug: string,
  excludeId?: string
): Promise<string> {
  let slug = baseSlug
  let attempt = 0
  while (attempt < MAX_SLUG_ATTEMPTS) {
    try {
      const where: Record<string, unknown> = { slug, deletedAt: null }
      if (excludeId) where.id = { not: excludeId }
      const existing = await tx.equipment.findFirst({
        where: where as NonNullable<Parameters<typeof tx.equipment.findFirst>[0]>['where'],
        select: { id: true },
      })
      if (!existing) return slug
    } catch {
      return slug
    }
    attempt++
    slug = `${baseSlug}-${attempt}`
  }
  return `${baseSlug}-${Date.now()}`
}

/**
 * Sync a Product to Equipment: create or update Equipment, Media, and Translation records.
 * Called after Product create/update (import, AI backfill).
 */
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
  const imageUrls = [product.featuredImage, ...galleryUrls].filter(Boolean)

  await prisma.$transaction(async (tx) => {
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
    const slug = await ensureUniqueSlug(tx, baseSlug, existing?.id)

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
      updatedAt: new Date(),
      ...(existing?.deletedAt && { deletedAt: null, deletedBy: null }),
    }

    let equipmentId: string
    if (existing) {
      await tx.equipment.update({
        where: { id: existing.id },
        data: equipmentUpdateData as Parameters<typeof tx.equipment.update>[0]['data'],
      })
      equipmentId = existing.id
    } else {
      const created = await tx.equipment.create({
        data: {
          id: product.id,
          sku,
          ...(barcode != null && { barcode }),
          slug,
          productId: product.id,
          model,
          nameEn: enTranslation?.name ?? model,
          nameZh: zhTranslation?.name ?? undefined,
          descriptionEn: enTranslation?.longDescription ?? enTranslation?.shortDescription ?? undefined,
          descriptionZh: zhTranslation?.longDescription ?? zhTranslation?.shortDescription ?? undefined,
          categoryId: product.categoryId,
          brandId: product.brandId,
          dailyPrice: product.priceDaily,
          weeklyPrice: product.priceWeekly ?? undefined,
          monthlyPrice: product.priceMonthly ?? undefined,
          quantityTotal: product.quantity ?? 1,
          quantityAvailable: product.quantity ?? 1,
          specifications: specsValue,
          specSource: specsValue ? 'import' : undefined,
          customFields: customFieldsValue,
        },
      })
      equipmentId = created.id
    }

    // Media: ensure we have one Media per image URL; avoid duplicates by url+equipmentId
    for (let i = 0; i < imageUrls.length; i++) {
      const url = imageUrls[i]
      const existingMedia = await tx.media.findFirst({
        where: { equipmentId, url, deletedAt: null },
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
          },
        })
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
  })
}

/**
 * Sync an Equipment to Product: create or update Product and ProductTranslation.
 * Used for seed and when Equipment is created/updated manually (e.g. admin form).
 */
export async function syncEquipmentToProduct(equipmentId: string): Promise<void> {
  const equipment = await prisma.equipment.findFirst({
    where: { id: equipmentId, deletedAt: null },
    include: {
      media: { where: { deletedAt: null }, orderBy: { createdAt: 'asc' }, take: 4 },
      brand: true,
      category: true,
    },
  })
  if (!equipment) throw new NotFoundError('Equipment', equipmentId)

  const defaultBrandId = equipment.brandId ?? undefined
  if (!defaultBrandId) {
    throw new Error('Equipment must have a brand to sync to Product')
  }

  const featuredImage = equipment.media[0]?.url ?? 'https://placehold.co/400x300?text=Equipment'
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
      const resolvedSeoTitle = existingPT?.seoTitle || existing?.get('seo_title') || fallbackSeoTitle
      const resolvedSeoDesc =
        existingPT?.seoDescription || existing?.get('seo_description') || fallbackSeoDesc
      const resolvedSeoKeywords =
        existingPT?.seoKeywords || existing?.get('seo_keywords') || fallbackSeoKeywords

      // Preserve specs from existing ProductTranslation
      const resolvedSpecs =
        existingPT?.specifications ??
        (equipment.specifications
          ? JSON.parse(JSON.stringify(equipment.specifications))
          : undefined)

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
