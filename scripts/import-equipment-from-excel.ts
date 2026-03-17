/**
 * Import all equipment from equipment-full-ai-filled_last_import.xlsx
 *
 * Rules:
 *   - requiresAssistant = false (default, overrides Excel)
 *   - requiresDeposit = false (default, overrides Excel)
 *   - Sheet name used as category guide (maps to DB categories)
 *
 * Usage:
 *   npx tsx scripts/import-equipment-from-excel.ts        # Dry run
 *   npx tsx scripts/import-equipment-from-excel.ts --commit
 */

import * as path from 'path'
import { prisma } from '../src/lib/db/prisma'
import { ProductCatalogService } from '../src/lib/services/product-catalog.service'
import { syncProductToEquipment } from '../src/lib/services/product-equipment-sync.service'
import { parseSpreadsheetBuffer } from '../src/lib/utils/excel-parser'
import { TranslationLocale } from '@prisma/client'
import { generateUniqueSKU } from '../src/lib/utils/sku-generator'

const EXCEL_PATH = path.resolve(process.cwd(), 'equipment-full-ai-filled_last_import.xlsx')
const PLACEHOLDER_IMAGE = '/images/placeholder.jpg'
const WEEKLY_FACTOR = Number(process.env.PRICING_WEEKLY_FACTOR || 4)
const MONTHLY_FACTOR = Number(process.env.PRICING_MONTHLY_FACTOR || 12)

/** Sheet name → category slug (sheet name as guide) */
const SHEET_TO_CATEGORY_SLUG: Record<string, string> = {
  Camera: 'cameras',
  'Camera Acc': 'camera-accessories',
  Lenses: 'lenses',
  Tripodgimbals: 'tripods-gimbals',
  Boxes: 'cases-bags',
  Light: 'lighting',
  'Light Acc': 'light-accessories',
  Grips: 'grip',
  Monitors: 'monitors',
  Battery: 'batteries-power',
  Sound: 'audio',
  'Live and Mixing': 'live-mixing',
}

function num(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null
  const n = Number(val)
  return Number.isFinite(n) ? n : null
}

function str(val: unknown): string {
  if (val == null) return ''
  return String(val).trim()
}

function parseBool(val: unknown): boolean {
  if (val == null) return false
  const s = String(val).trim().toLowerCase()
  return s === 'true' || s === '1' || s === 'yes'
}

function arr(val: unknown): string[] {
  if (!val) return []
  if (Array.isArray(val)) return val.map((v) => String(v).trim()).filter(Boolean)
  return String(val)
    .split(/[,\n;]/)
    .map((v) => v.trim())
    .filter(Boolean)
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

async function ensureBrand(name: string): Promise<string> {
  const n = name?.trim() || 'Unknown'
  const slug = slugify(n) || 'unknown'
  const brand = await prisma.brand.upsert({
    where: { slug },
    create: { name: n, slug },
    update: { name: n },
  })
  return brand.id
}

async function getCategoryIdBySlug(slug: string): Promise<string | null> {
  const cat = await prisma.category.findFirst({
    where: { slug, deletedAt: null },
    select: { id: true },
  })
  return cat?.id ?? null
}

async function resolveCategoryId(
  sheetName: string,
  excelCategorySlug: string | null
): Promise<string> {
  const sheetSlug = SHEET_TO_CATEGORY_SLUG[sheetName]
  const slugsToTry = [sheetSlug, excelCategorySlug].filter(Boolean)
  for (const s of slugsToTry) {
    const id = await getCategoryIdBySlug(s)
    if (id) return id
  }
  throw new Error(
    `No category found for sheet "${sheetName}" (tried: ${slugsToTry.join(', ')})`
  )
}

interface RowData {
  sku: string
  model: string
  category_slug: string
  brand_slug: string
  condition: string
  quantityTotal: number
  quantityAvailable: number
  dailyPrice: number
  weeklyPrice: number | null
  monthlyPrice: number | null
  purchasePrice: number | null
  depositAmount: number | null
  barcode: string | null
  boxContents: string | null
  tags: string | null
  bufferTime: number
  bufferTimeUnit: string
  featuredImageUrl: string
  galleryImageUrls: string[]
  videoUrl: string | null
  name_en: string
  name_ar: string
  name_zh: string
  description_en: string
  description_ar: string
  description_zh: string
  shortDescription_en: string
  shortDescription_ar: string
  shortDescription_zh: string
  longDescription_en: string
  longDescription_ar: string
  longDescription_zh: string
  seoTitle_en: string
  seoTitle_ar: string
  seoTitle_zh: string
  seoDescription_en: string
  seoDescription_ar: string
  seoDescription_zh: string
  seoKeywords_en: string
  seoKeywords_ar: string
  seoKeywords_zh: string
  specifications_notes: string | null
}

function rowToData(row: Record<string, unknown>, sheetName: string): RowData | null {
  const name = str(row.model ?? row.name_en ?? row['*']) || str(row.name_en)
  if (!name) return null

  const daily = num(row.dailyPrice) ?? 0
  const quantity = Math.max(1, Math.trunc(num(row.quantityTotal) ?? num(row.quantityAvailable) ?? 1))
  const brandSlug = str(row.brand_slug) || 'Unknown'

  const galleryRaw = row.galleryImageUrls ?? row.gallery
  const galleryUrls = arr(galleryRaw)

  return {
    sku: str(row.sku) || '',
    model: name,
    category_slug: str(row.category_slug),
    brand_slug: brandSlug,
    condition: str(row.condition) || 'GOOD',
    quantityTotal: quantity,
    quantityAvailable: quantity,
    dailyPrice: daily,
    weeklyPrice: num(row.weeklyPrice),
    monthlyPrice: num(row.monthlyPrice),
    purchasePrice: num(row.purchasePrice),
    depositAmount: num(row.depositAmount),
    barcode: str(row.barcode) || null,
    boxContents: str(row.boxContents) || null,
    tags: str(row.tags) || null,
    bufferTime: num(row.bufferTime) ?? 0,
    bufferTimeUnit: str(row.bufferTimeUnit) || 'hours',
    featuredImageUrl: str(row.featuredImageUrl) || PLACEHOLDER_IMAGE,
    galleryImageUrls: galleryUrls,
    videoUrl: str(row.videoUrl) || null,
    name_en: str(row.name_en) || name,
    name_ar: str(row.name_ar) || '',
    name_zh: str(row.name_zh) || '',
    description_en: str(row.description_en) || '',
    description_ar: str(row.description_ar) || '',
    description_zh: str(row.description_zh) || '',
    shortDescription_en: str(row.shortDescription_en) || str(row.description_en) || '',
    shortDescription_ar: str(row.shortDescription_ar) || str(row.description_ar) || '',
    shortDescription_zh: str(row.shortDescription_zh) || str(row.description_zh) || '',
    longDescription_en: str(row.longDescription_en) || '',
    longDescription_ar: str(row.longDescription_ar) || '',
    longDescription_zh: str(row.longDescription_zh) || '',
    seoTitle_en: str(row.seoTitle_en) || name,
    seoTitle_ar: str(row.seoTitle_ar) || str(row.name_ar) || name,
    seoTitle_zh: str(row.seoTitle_zh) || str(row.name_zh) || name,
    seoDescription_en: str(row.seoDescription_en) || str(row.shortDescription_en) || name,
    seoDescription_ar: str(row.seoDescription_ar) || str(row.shortDescription_ar) || name,
    seoDescription_zh: str(row.seoDescription_zh) || str(row.shortDescription_zh) || name,
    seoKeywords_en: str(row.seoKeywords_en) || '',
    seoKeywords_ar: str(row.seoKeywords_ar) || '',
    seoKeywords_zh: str(row.seoKeywords_zh) || '',
    specifications_notes: str(row.specifications_notes) || null,
  }
}

async function main() {
  const args = new Set(process.argv.slice(2))
  const commit = args.has('--commit')

  const fs = await import('fs')
  if (!fs.existsSync(EXCEL_PATH)) {
    console.error(`File not found: ${EXCEL_PATH}`)
    process.exit(1)
  }

  const buffer = fs.readFileSync(EXCEL_PATH)
  const { sheetNames, sheets } = await parseSpreadsheetBuffer(buffer, 'equipment-full-ai-filled_last_import.xlsx')

  const stats = {
    rowsTotal: 0,
    rowsSkipped: 0,
    created: 0,
    updated: 0,
    errors: 0,
  }

  const usedSkus = new Set<string>()

  for (const sheetName of sheetNames) {
    const rows = sheets[sheetName] ?? []
    const categoryId = await resolveCategoryId(sheetName, null)

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] as Record<string, unknown>
      stats.rowsTotal++

      const data = rowToData(row, sheetName)
      if (!data) {
        stats.rowsSkipped++
        continue
      }

      const brandId = await ensureBrand(data.brand_slug)

      let sku = data.sku
      if (!sku) {
        sku = await generateUniqueSKU(sheetName, data.brand_slug)
      }
      if (usedSkus.has(sku)) {
        sku = await generateUniqueSKU(sheetName, data.brand_slug)
      }
      usedSkus.add(sku)

      const bufferHours =
        data.bufferTimeUnit === 'days' ? (data.bufferTime ?? 0) * 24 : (data.bufferTime ?? 0)
      const priceWeekly = data.weeklyPrice ?? (data.dailyPrice > 0 ? data.dailyPrice * WEEKLY_FACTOR : null)
      const priceMonthly = data.monthlyPrice ?? (data.dailyPrice > 0 ? data.dailyPrice * MONTHLY_FACTOR : null)

      const translations: Array<{
        locale: TranslationLocale
        name: string
        shortDescription: string
        longDescription: string
        seoTitle: string
        seoDescription: string
        seoKeywords: string
      }> = [
        {
          locale: 'en' as TranslationLocale,
          name: data.name_en,
          shortDescription: data.shortDescription_en || data.description_en || '',
          longDescription: data.longDescription_en || data.description_en || '',
          seoTitle: data.seoTitle_en || data.name_en,
          seoDescription: data.seoDescription_en || data.shortDescription_en || data.name_en,
          seoKeywords: data.seoKeywords_en || '',
        },
      ]
      if (data.name_ar || data.shortDescription_ar || data.longDescription_ar) {
        translations.push({
          locale: 'ar' as TranslationLocale,
          name: data.name_ar || data.name_en,
          shortDescription: data.shortDescription_ar || data.description_ar || '',
          longDescription: data.longDescription_ar || data.description_ar || '',
          seoTitle: data.seoTitle_ar || data.name_ar || data.name_en,
          seoDescription: data.seoDescription_ar || data.shortDescription_ar || data.name_ar || data.name_en,
          seoKeywords: data.seoKeywords_ar || '',
        })
      }
      if (data.name_zh || data.shortDescription_zh || data.longDescription_zh) {
        translations.push({
          locale: 'zh' as TranslationLocale,
          name: data.name_zh || data.name_en,
          shortDescription: data.shortDescription_zh || data.description_zh || '',
          longDescription: data.longDescription_zh || data.description_zh || '',
          seoTitle: data.seoTitle_zh || data.name_zh || data.name_en,
          seoDescription: data.seoDescription_zh || data.shortDescription_zh || data.name_zh || data.name_en,
          seoKeywords: data.seoKeywords_zh || '',
        })
      }

      const featuredImage =
        data.featuredImageUrl && data.featuredImageUrl !== '/' ? data.featuredImageUrl : PLACEHOLDER_IMAGE

      const createPayload = {
        status: data.dailyPrice > 0 ? ('ACTIVE' as const) : ('DRAFT' as const),
        productType: 'RENTAL' as const,
        sku,
        brandId,
        categoryId,
        priceDaily: data.dailyPrice,
        priceWeekly,
        priceMonthly,
        depositAmount: data.depositAmount,
        quantity: data.quantityTotal,
        bufferTime: bufferHours,
        boxContents: data.boxContents,
        featuredImage,
        galleryImages: data.galleryImageUrls.length ? data.galleryImageUrls : null,
        videoUrl: data.videoUrl,
        tags: data.tags,
        translations: translations.map((t) => ({
          locale: t.locale,
          name: t.name,
          shortDescription: t.shortDescription,
          longDescription: t.longDescription,
          specifications: data.specifications_notes ? { notes: data.specifications_notes } : undefined,
          seoTitle: t.seoTitle,
          seoDescription: t.seoDescription,
          seoKeywords: t.seoKeywords,
        })),
        inventoryItems: data.barcode
          ? [{ serialNumber: sku, barcode: data.barcode }]
          : [],
        createdBy: 'system',
      }

      if (!commit) {
        console.log(`[DRY] ${sheetName} row ${i + 2}: ${data.name_en} (${sku})`)
        stats.created++
        continue
      }

      try {
        let product: { id: string }

        if (data.barcode) {
          const existingItem = await prisma.inventoryItem.findFirst({
            where: { barcode: data.barcode },
            select: { parentProductId: true, deletedAt: true },
          })
          if (existingItem) {
            const parent = await prisma.product.findUnique({
              where: { id: existingItem.parentProductId },
              select: { id: true, deletedAt: true },
            })
            if (parent) {
              if (parent.deletedAt) {
                await prisma.product.update({
                  where: { id: parent.id },
                  data: { deletedAt: null, deletedBy: null },
                })
              }
              const { inventoryItems: _, ...updatePayload } = createPayload
              product = await ProductCatalogService.update(parent.id, {
                ...updatePayload,
                updatedBy: 'system',
              })
              stats.updated++
            } else {
              product = await ProductCatalogService.create(createPayload)
              stats.created++
            }
          } else {
            product = await ProductCatalogService.create(createPayload)
            stats.created++
          }
        } else {
          product = await ProductCatalogService.create(createPayload)
          stats.created++
        }

        await syncProductToEquipment(product.id)

        const equip = await prisma.equipment.findFirst({
          where: { productId: product.id, deletedAt: null },
          select: { id: true },
        })
        if (equip) {
          const customFields = (await prisma.equipment.findUnique({
            where: { id: equip.id },
            select: { customFields: true },
          }))?.customFields as Record<string, unknown> | null
          const merged = { ...(customFields ?? {}), requiresDeposit: false }
          await prisma.equipment.update({
            where: { id: equip.id },
            data: {
              requiresAssistant: false,
              customFields: merged,
              ...(data.purchasePrice != null && { purchasePrice: data.purchasePrice }),
            },
          })
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        if (msg.includes('SKU already exists')) {
          try {
            const fallbackSku = await generateUniqueSKU(sheetName, data.brand_slug)
            usedSkus.add(fallbackSku)
            const product = await ProductCatalogService.create({
              ...createPayload,
              sku: fallbackSku,
            })
            await syncProductToEquipment(product.id)
            const equip = await prisma.equipment.findFirst({
              where: { productId: product.id, deletedAt: null },
              select: { id: true },
            })
            if (equip) {
              const customFields = (await prisma.equipment.findUnique({
                where: { id: equip.id },
                select: { customFields: true },
              }))?.customFields as Record<string, unknown> | null
              const merged = { ...(customFields ?? {}), requiresDeposit: false }
              await prisma.equipment.update({
                where: { id: equip.id },
                data: {
                  requiresAssistant: false,
                  customFields: merged,
                  ...(data.purchasePrice != null && { purchasePrice: data.purchasePrice }),
                },
              })
            }
            stats.created++
          } catch (retryErr) {
            stats.errors++
            console.error(`[ERROR] ${sheetName} row ${i + 2} (${data.name_en}):`, retryErr instanceof Error ? retryErr.message : retryErr)
          }
        } else {
          stats.errors++
          console.error(`[ERROR] ${sheetName} row ${i + 2} (${data.name_en}):`, msg)
        }
      }
    }
  }

  console.log('\n=== Import Summary ===')
  console.log(`Mode: ${commit ? 'COMMIT' : 'DRY RUN'}`)
  console.log(`Sheets: ${sheetNames.join(', ')}`)
  console.log(`Rows scanned: ${stats.rowsTotal}`)
  console.log(`Skipped (empty name): ${stats.rowsSkipped}`)
  console.log(`Created: ${stats.created}`)
  console.log(`Updated: ${stats.updated}`)
  console.log(`Errors: ${stats.errors}`)

  if (!commit) {
    console.log('\nTo apply, run: npx tsx scripts/import-equipment-from-excel.ts --commit')
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
