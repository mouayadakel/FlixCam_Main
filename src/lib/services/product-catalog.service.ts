/**
 * @file product-catalog.service.ts
 * @description Product/translation/inventory logic with phase-2 rules (pricing auto-calc, status guards, validations)
 */

import { prisma } from '@/lib/db/prisma'
import { Prisma, InventoryItemStatus, ProductStatus, ProductType, TranslationLocale } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import { ValidationError, NotFoundError } from '@/lib/errors'

const WEEKLY_FACTOR = Number(process.env.PRICING_WEEKLY_FACTOR || 4)
const MONTHLY_FACTOR = Number(process.env.PRICING_MONTHLY_FACTOR || 12)

type PricingInput = {
  priceDaily?: number
  priceWeekly?: number | null
  priceMonthly?: number | null
}

type ProductBaseInput = {
  status?: ProductStatus
  productType?: ProductType
  sku?: string | null
  brandId: string
  categoryId: string
  subCategoryId?: string | null
  quantity?: number | null
  priceDaily?: number
  priceWeekly?: number | null
  priceMonthly?: number | null
  depositAmount?: number | null
  bufferTime?: number
  boxContents?: string | null
  featuredImage: string
  galleryImages?: string[] | null
  videoUrl?: string | null
  relatedProducts?: string[] | null
  tags?: string | null
}

type TranslationInput = {
  locale: TranslationLocale
  name: string
  shortDescription: string
  longDescription: string
  specifications?: Record<string, any>
  seoTitle: string
  seoDescription: string
  seoKeywords: string
}

type InventoryItemInput = {
  serialNumber: string
  barcode: string
  itemStatus?: InventoryItemStatus
  location?: string | null
  purchaseDate?: Date | null
  purchasePrice?: number | null
}

type ProductCreateInput = ProductBaseInput & {
  translations: TranslationInput[]
  inventoryItems?: InventoryItemInput[]
  createdBy: string
}

type ProductUpdateInput = Partial<ProductBaseInput> & {
  translations?: TranslationInput[]
  inventoryItems?: InventoryItemInput[]
  updatedBy: string
}

function validateQuantity(quantity: number | null | undefined) {
  if (quantity === null || quantity === undefined) return
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new ValidationError('Quantity must be a non-negative integer', {
      quantity: ['Quantity must be a non-negative integer'],
    })
  }
}

function computePricing(input: PricingInput) {
  const daily = input.priceDaily ?? 0
  const weekly = input.priceWeekly ?? (daily > 0 ? daily * WEEKLY_FACTOR : null)
  const monthly = input.priceMonthly ?? (daily > 0 ? daily * MONTHLY_FACTOR : null)
  return { daily, weekly, monthly }
}

function enforceStatusRules(status: ProductStatus | undefined, daily: number, boxContents?: string | null) {
  const boxEmpty = !boxContents || boxContents.trim().length === 0

  // Force Draft if no/zero price or empty box contents (per blueprint rule)
  if (!daily || daily <= 0 || boxEmpty) {
    return ProductStatus.DRAFT
  }

  // If requested Active/Hidden but invalid pricing, block
  if ((status === ProductStatus.ACTIVE || status === ProductStatus.HIDDEN) && daily <= 0) {
    throw new ValidationError('Daily price must be greater than 0 to activate', {
      priceDaily: ['Daily price must be > 0 to set Active/Hidden'],
    })
  }

  return status ?? ProductStatus.DRAFT
}

async function validateCategoryHierarchy(categoryId: string, subCategoryId?: string | null) {
  const category = await prisma.category.findFirst({ where: { id: categoryId, deletedAt: null } })
  if (!category) throw new NotFoundError('Category', categoryId)

  if (subCategoryId) {
    const sub = await prisma.category.findFirst({ where: { id: subCategoryId, deletedAt: null } })
    if (!sub) throw new NotFoundError('Sub-Category', subCategoryId)
    if (sub.parentId !== categoryId) {
      throw new ValidationError('Sub-category must belong to the selected category', {
        subCategoryId: ['Sub-category parent mismatch'],
      })
    }
  }
}

async function validateBrand(brandId: string) {
  const brand = await prisma.brand.findFirst({ where: { id: brandId, deletedAt: null } })
  if (!brand) throw new NotFoundError('Brand', brandId)
}

async function ensureUniqueSku(sku?: string | null, excludeId?: string) {
  if (!sku) return
  const existing = await prisma.product.findFirst({
    where: { sku, deletedAt: null, NOT: excludeId ? { id: excludeId } : undefined },
  })
  if (existing) {
    throw new ValidationError('SKU already exists', { sku: ['SKU must be unique'] })
  }
}

function ensureUniqueLocales(translations: TranslationInput[]) {
  const seen = new Set<string>()
  for (const t of translations) {
    if (seen.has(t.locale)) {
      throw new ValidationError('Duplicate locale in translations', {
        locale: [`Locale ${t.locale} duplicated`],
      })
    }
    seen.add(t.locale)
  }
}

async function ensureInventoryUniqueness(items: InventoryItemInput[] = [], excludeProductId?: string) {
  const serials = new Set<string>()
  const barcodes = new Set<string>()

  for (const item of items) {
    if (serials.has(item.serialNumber)) {
      throw new ValidationError('Duplicate serial number in payload', {
        serialNumber: ['Serial numbers must be unique per product'],
      })
    }
    serials.add(item.serialNumber)

    if (barcodes.has(item.barcode)) {
      throw new ValidationError('Duplicate barcode in payload', {
        barcode: ['Barcodes must be unique per product'],
      })
    }
    barcodes.add(item.barcode)
  }

  if (items.length === 0) return

  const existingSerial = await prisma.inventoryItem.findFirst({
    where: {
      serialNumber: { in: [...serials] },
      deletedAt: null,
      parentProductId: excludeProductId ? { not: excludeProductId } : undefined,
    },
  })
  if (existingSerial) {
    throw new ValidationError('Serial number already exists', {
      serialNumber: ['Serial number must be unique globally'],
    })
  }

  const existingBarcode = await prisma.inventoryItem.findFirst({
    where: {
      barcode: { in: [...barcodes] },
      deletedAt: null,
      parentProductId: excludeProductId ? { not: excludeProductId } : undefined,
    },
  })
  if (existingBarcode) {
    throw new ValidationError('Barcode already exists', {
      barcode: ['Barcode must be unique globally'],
    })
  }
}

export class ProductCatalogService {
  static async create(input: ProductCreateInput) {
    await ensureUniqueSku(input.sku ?? null)
    await validateBrand(input.brandId)
    await validateCategoryHierarchy(input.categoryId, input.subCategoryId)
    ensureUniqueLocales(input.translations)
    await ensureInventoryUniqueness(input.inventoryItems)

    const { daily, weekly, monthly } = computePricing({
      priceDaily: input.priceDaily,
      priceWeekly: input.priceWeekly ?? null,
      priceMonthly: input.priceMonthly ?? null,
    })

    const status = enforceStatusRules(input.status, daily, input.boxContents)
    const resolvedQuantity = input.quantity ?? (input.inventoryItems?.length ?? 0)
    validateQuantity(resolvedQuantity)

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: {
          status,
          productType: input.productType ?? ProductType.RENTAL,
          sku: input.sku ?? null,
          brandId: input.brandId,
          categoryId: input.categoryId,
          subCategoryId: input.subCategoryId ?? null,
          priceDaily: new Decimal(daily),
          priceWeekly: weekly ? new Decimal(weekly) : null,
          priceMonthly: monthly ? new Decimal(monthly) : null,
          depositAmount: input.depositAmount ? new Decimal(input.depositAmount) : null,
          bufferTime: input.bufferTime ?? 0,
          boxContents: input.boxContents ?? null,
          featuredImage: input.featuredImage,
          galleryImages: input.galleryImages ?? Prisma.JsonNull,
          videoUrl: input.videoUrl ?? null,
          relatedProducts: input.relatedProducts ?? Prisma.JsonNull,
          tags: input.tags ?? null,
          quantity: resolvedQuantity,
          createdBy: input.createdBy,
          updatedBy: input.createdBy,
        },
      })

      if (input.translations.length > 0) {
        await tx.productTranslation.createMany({
          data: input.translations.map((t) => ({
            productId: created.id,
            locale: t.locale,
            name: t.name,
            shortDescription: t.shortDescription,
            longDescription: t.longDescription,
            specifications: t.specifications ?? Prisma.JsonNull,
            seoTitle: t.seoTitle,
            seoDescription: t.seoDescription,
            seoKeywords: t.seoKeywords,
            createdBy: input.createdBy,
            updatedBy: input.createdBy,
          })),
        })
      }

      if (input.inventoryItems && input.inventoryItems.length > 0) {
        await tx.inventoryItem.createMany({
          data: input.inventoryItems.map((item) => ({
            parentProductId: created.id,
            serialNumber: item.serialNumber,
            barcode: item.barcode,
            itemStatus: item.itemStatus ?? InventoryItemStatus.AVAILABLE,
            location: item.location ?? null,
            purchaseDate: item.purchaseDate ?? null,
            purchasePrice: item.purchasePrice ? new Decimal(item.purchasePrice) : null,
            createdBy: input.createdBy,
            updatedBy: input.createdBy,
          })),
        })
      }

      return created
    })

    return product
  }

  static async update(id: string, input: ProductUpdateInput) {
    const product = await prisma.product.findFirst({ where: { id, deletedAt: null } })
    if (!product) throw new NotFoundError('Product', id)

    await ensureUniqueSku(input.sku ?? undefined, id)

    if (input.brandId) await validateBrand(input.brandId)
    if (input.categoryId || input.subCategoryId) {
      await validateCategoryHierarchy(input.categoryId ?? product.categoryId, input.subCategoryId ?? product.subCategoryId)
    }

    if (input.translations) ensureUniqueLocales(input.translations)
    if (input.inventoryItems) await ensureInventoryUniqueness(input.inventoryItems, id)

    const { daily, weekly, monthly } = computePricing({
      priceDaily: input.priceDaily ?? Number(product.priceDaily),
      priceWeekly: input.priceWeekly ?? (product.priceWeekly ? Number(product.priceWeekly) : null),
      priceMonthly: input.priceMonthly ?? (product.priceMonthly ? Number(product.priceMonthly) : null),
    })

    const status = enforceStatusRules(input.status ?? product.status, daily, input.boxContents ?? product.boxContents)
    const resolvedQuantity = input.quantity ?? (input.inventoryItems ? input.inventoryItems.length : product.quantity ?? 0)
    validateQuantity(resolvedQuantity)

    const updated = await prisma.$transaction(async (tx) => {
      const saved = await tx.product.update({
        where: { id },
        data: {
          status,
          productType: input.productType ?? product.productType,
          sku: input.sku ?? product.sku,
          brandId: input.brandId ?? product.brandId,
          categoryId: input.categoryId ?? product.categoryId,
          subCategoryId: input.subCategoryId ?? product.subCategoryId,
          priceDaily: new Decimal(daily),
          priceWeekly: weekly ? new Decimal(weekly) : null,
          priceMonthly: monthly ? new Decimal(monthly) : null,
          depositAmount: input.depositAmount !== undefined ? (input.depositAmount ? new Decimal(input.depositAmount) : null) : product.depositAmount,
          bufferTime: input.bufferTime ?? product.bufferTime,
          boxContents: input.boxContents ?? product.boxContents,
          featuredImage: input.featuredImage ?? product.featuredImage,
          galleryImages: input.galleryImages ?? (product.galleryImages ?? Prisma.JsonNull),
          videoUrl: input.videoUrl ?? product.videoUrl,
          relatedProducts: input.relatedProducts ?? (product.relatedProducts ?? Prisma.JsonNull),
          tags: input.tags ?? product.tags,
          quantity: resolvedQuantity,
          updatedBy: input.updatedBy,
        },
      })

      if (input.translations) {
        await tx.productTranslation.deleteMany({ where: { productId: id } })
        if (input.translations.length > 0) {
          await tx.productTranslation.createMany({
            data: input.translations.map((t) => ({
              productId: id,
              locale: t.locale,
              name: t.name,
              shortDescription: t.shortDescription,
              longDescription: t.longDescription,
              specifications: t.specifications ?? Prisma.JsonNull,
              seoTitle: t.seoTitle,
              seoDescription: t.seoDescription,
              seoKeywords: t.seoKeywords,
              createdBy: input.updatedBy,
              updatedBy: input.updatedBy,
            })),
          })
        }
      }

      if (input.inventoryItems) {
        await tx.inventoryItem.deleteMany({ where: { parentProductId: id } })
        if (input.inventoryItems.length > 0) {
          await tx.inventoryItem.createMany({
            data: input.inventoryItems.map((item) => ({
              parentProductId: id,
              serialNumber: item.serialNumber,
              barcode: item.barcode,
              itemStatus: item.itemStatus ?? InventoryItemStatus.AVAILABLE,
              location: item.location ?? null,
              purchaseDate: item.purchaseDate ?? null,
              purchasePrice: item.purchasePrice ? new Decimal(item.purchasePrice) : null,
              createdBy: input.updatedBy,
              updatedBy: input.updatedBy,
            })),
          })
        }
      }

      return saved
    })

    return updated
  }
}

export const pricingDefaults = {
  weeklyFactor: WEEKLY_FACTOR,
  monthlyFactor: MONTHLY_FACTOR,
}
