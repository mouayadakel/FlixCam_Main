/**
 * @file import-worker.ts
 * @description Import worker that processes Excel rows into Products.
 * Uses ColumnMapperService for dynamic header resolution instead of hardcoded lookups.
 * Auto-generates SKUs, auto-calculates weekly/monthly prices, and enriches with curated specs.
 * @module lib/services
 */

import { ImportService } from './import.service'
import {
  ImportRowStatus,
  ProductStatus,
  ProductType,
  TranslationLocale,
  BudgetTier,
  EquipmentCondition,
} from '@prisma/client'
import { ProductCatalogService } from './product-catalog.service'
import { syncProductToEquipment } from './product-equipment-sync.service'
import { prisma } from '@/lib/db/prisma'
import { generateUniqueSKU } from '@/lib/utils/sku-generator'
import { mapColumns, saveMappingHistory, type ColumnMapping } from './column-mapper.service'
import { lookupDeepSpecs } from './specs-db.service'
import { getRowNameValue } from './import-validation.service'
import { ValidationError } from '@/lib/errors'

type RowPayload = {
  sheetName: string
  categoryId: string | null
  subCategoryId?: string | null
  excelRowNumber?: number
  row: Record<string, any>
  columnMappings?: ColumnMapping[]
}

type ApprovedSuggestion = {
  sheetName: string
  excelRowNumber: number
  aiSuggestions: {
    translations?: Record<
      string,
      { name: string; shortDescription: string; longDescription: string }
    >
    seo?: { metaTitle: string; metaDescription: string; metaKeywords: string }
    seoByLocale?: {
      ar?: { metaTitle: string; metaDescription: string; metaKeywords: string }
      zh?: { metaTitle: string; metaDescription: string; metaKeywords: string }
    }
    specifications?: Record<string, unknown>
    boxContents?: string
    tags?: string
    confidence?: number
  }
}

const WEEKLY_FACTOR = Number(process.env.PRICING_WEEKLY_FACTOR || 4)
const MONTHLY_FACTOR = Number(process.env.PRICING_MONTHLY_FACTOR || 12)
const MAX_PRICE = 99_999_999

function num(val: any): number | null {
  if (val === null || val === undefined || val === '') return null
  const n = Number(val)
  return Number.isFinite(n) ? n : null
}

function safePrice(val: number | null): number | null {
  if (val === null || val === undefined) return null
  if (val < 0) return null
  if (val > MAX_PRICE) return null
  return val
}

function arr(val: any): string[] {
  if (!val) return []
  if (Array.isArray(val)) return val.map((v) => String(v).trim()).filter(Boolean)
  return String(val)
    .split(/[,\n]/)
    .map((v) => v.trim())
    .filter(Boolean)
}

function normalizeSpecs(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {}
  const obj = input as Record<string, unknown>
  const entries = Object.entries(obj)
    .map(([k, v]) => [String(k).trim(), v] as const)
    .filter(([k, v]) => k.length > 0 && v != null && String(v).trim() !== '')
  return Object.fromEntries(entries)
}

function slugify(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
}

async function ensureBrand(brandName: string | null) {
  const name = brandName?.trim()
  if (!name) throw new Error('Brand is required')
  const slug = slugify(name)
  if (!slug) throw new Error('Brand name produced an empty slug')
  try {
    const brand = await prisma.brand.upsert({
      where: { slug },
      create: { name, slug },
      update: { name },
    })
    return brand.id
  } catch (err: unknown) {
    const brand = await prisma.brand.findFirst({ where: { slug } })
    if (brand) return brand.id
    throw err
  }
}

/**
 * Resolve a field value from a row using column mappings.
 * Falls back to direct key lookup for backward compatibility.
 */
function resolveField(
  row: Record<string, any>,
  fieldName: string,
  mappings?: ColumnMapping[]
): any {
  if (mappings) {
    const mapping = mappings.find((m) => m.mappedField === fieldName)
    if (mapping) {
      const exact = row[mapping.sourceHeader]
      if (exact !== undefined && exact !== null && String(exact).trim() !== '') return exact
      // Excel often has headers with trailing/leading spaces; match by trimmed key
      const target = mapping.sourceHeader.trim().toLowerCase()
      for (const key of Object.keys(row)) {
        if (key.trim().toLowerCase() === target) {
          const val = row[key]
          if (val !== undefined && val !== null && String(val).trim() !== '') return val
          /* istanbul ignore next - break when matching key has empty value */
          break
        }
      }
    }
  }
  return undefined
}

function parseBool(val: unknown): boolean {
  if (val == null) return false
  const s = String(val).trim().toLowerCase()
  return s === 'true' || s === '1' || s === 'yes'
}

function parseBudgetTier(val: unknown): BudgetTier | null {
  if (!val) return null
  const s = String(val).trim().toUpperCase()
  if (s === 'ESSENTIAL' || s === 'PROFESSIONAL' || s === 'PREMIUM') return s as BudgetTier
  return null
}

function parseConditionEnum(val: unknown): EquipmentCondition {
  if (!val) return EquipmentCondition.GOOD
  const s = String(val).trim().toUpperCase()
  const valid: Record<string, EquipmentCondition> = {
    EXCELLENT: EquipmentCondition.EXCELLENT,
    GOOD: EquipmentCondition.GOOD,
    FAIR: EquipmentCondition.FAIR,
    POOR: EquipmentCondition.POOR,
    MAINTENANCE: EquipmentCondition.MAINTENANCE,
    DAMAGED: EquipmentCondition.DAMAGED,
    NEW: EquipmentCondition.EXCELLENT,
  }
  return valid[s] ?? EquipmentCondition.GOOD
}

interface EquipmentExtraFields {
  purchasePrice?: number
  requiresAssistant?: boolean
  budgetTier?: BudgetTier
  condition?: EquipmentCondition
  quantityAvailable?: number
  warehouseLocation?: string
  featured?: boolean
}

const BATCH_SIZE = 100

export async function processImportJob(
  jobId: string,
  options?: { approvedSuggestions?: ApprovedSuggestion[] }
) {
  console.info(
    `[Import] Starting job ${jobId}, approvedSuggestions: ${options?.approvedSuggestions?.length ?? 0}`
  )
  const job = await ImportService.getJob(jobId)
  if (!job) throw new Error('Job not found')

  if (!job.rows.length) {
    console.warn(`[Import] Job ${jobId} has no rows, marking complete`)
    await ImportService.markComplete(jobId)
    return
  }

  console.info(`[Import] Job ${jobId}: processing ${job.rows.length} rows`)
  await ImportService.markProcessing(jobId)

  // Build column mappings per sheet. Use user-confirmed mappings from the import UI when present (so name, seo, descriptions, all locales are linked correctly).
  const columnMappingsBySheet = new Map<string, ColumnMapping[]>()
  const jobColumnMappings = job.columnMappingsBySheet as Record<
    string,
    Array<{ sourceHeader: string; mappedField: string | null; confidence: number; method: string }>
  > | null
  if (jobColumnMappings && typeof jobColumnMappings === 'object') {
    for (const [sheetName, mappings] of Object.entries(jobColumnMappings)) {
      if (Array.isArray(mappings) && mappings.length > 0) {
        columnMappingsBySheet.set(sheetName, mappings as ColumnMapping[])
      }
    }
    if (columnMappingsBySheet.size > 0) {
      console.info(`[Import] Using ${columnMappingsBySheet.size} user-confirmed column mapping(s) from import UI`)
    }
  }

  const seenSheets = new Set<string>()
  for (const row of job.rows) {
    const payload = row.payload as unknown as RowPayload
    const sheetName = payload?.sheetName
    if (!sheetName || !payload?.row || seenSheets.has(sheetName)) continue
    seenSheets.add(sheetName)
    if (columnMappingsBySheet.has(sheetName)) continue
    const headers = Object.keys(payload.row)
    try {
      const mappings = await mapColumns(headers, { useHistory: true })
      columnMappingsBySheet.set(sheetName, mappings)
      const confirmed = mappings
        .filter((m) => m.mappedField && m.confidence >= 60)
        .map((m) => ({ sourceHeader: m.sourceHeader, mappedField: m.mappedField! }))
      if (confirmed.length > 0) await saveMappingHistory(confirmed)
    } catch (err) {
      console.warn(`[Import] Column mapping failed for sheet "${sheetName}"`, err)
    }
  }
  // Fallback: use first sheet's mappings if a sheet wasn't seen (shouldn't happen)
  const firstSheetMappings = job.rows[0]
    ? columnMappingsBySheet.get((job.rows[0].payload as unknown as RowPayload)?.sheetName)
    : undefined

  const suggestionByRow = new Map<string, ApprovedSuggestion['aiSuggestions']>()
  for (const s of options?.approvedSuggestions ?? []) {
    suggestionByRow.set(`${s.sheetName}:${s.excelRowNumber}`, s.aiSuggestions)
  }

  // Track SKUs used in this job to avoid duplicates within file (e.g. "50000009" appearing twice)
  const usedSkusInJob = new Set<string>()
  const equipmentExtras = new Map<string, EquipmentExtraFields>()

  const batches: (typeof job.rows)[] = []
  for (let i = 0; i < job.rows.length; i += BATCH_SIZE) {
    batches.push(job.rows.slice(i, i + BATCH_SIZE))
  }

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex]
    let batchSuccess = 0
    let batchErrors = 0
    const batchProductIds: string[] = []

    for (const row of batch) {
      const payload = row.payload as unknown as RowPayload
      const r = payload.row
      const columnMappings = payload.sheetName
        ? (columnMappingsBySheet.get(payload.sheetName) ?? firstSheetMappings)
        : firstSheetMappings
      const suggestion = payload.excelRowNumber
        ? suggestionByRow.get(`${payload.sheetName}:${payload.excelRowNumber}`)
        : undefined

      try {
        if (!payload.categoryId?.trim()) {
          throw new Error(
            `Category mapping missing for sheet "${payload.sheetName ?? 'Unknown'}". Select a category for this sheet in the import step.`
          )
        }

        const categoryId = payload.categoryId

        // Resolve fields via column mapper (SYNONYM_MAP handles all aliases).
        // Fallback: getRowNameValue (checks name_en/name_ar/name_zh), then model.
        const modelName = resolveField(r, 'model', columnMappings) ?? null
        const nameRaw =
          resolveField(r, 'name', columnMappings) ??
          r['*'] ??
          getRowNameValue(r as Record<string, unknown>) ??
          modelName
        const name = typeof nameRaw === 'string' ? nameRaw : String(nameRaw ?? '').trim()
        if (!name) throw new Error('Name is required')

        const brandName = resolveField(r, 'brand', columnMappings) ?? 'Unknown'
        const brandId = await ensureBrand(brandName || null)

        const daily = num(resolveField(r, 'daily_price', columnMappings))
        const quantityRaw = num(resolveField(r, 'quantity', columnMappings))
        const quantity = quantityRaw != null && quantityRaw >= 0 ? quantityRaw : 0
        const weekly = num(resolveField(r, 'weekly_price', columnMappings))
        const monthly = num(resolveField(r, 'monthly_price', columnMappings))
        const deposit = safePrice(num(resolveField(r, 'deposit', columnMappings)))

        // New mapped fields
        const conditionRaw = resolveField(r, 'condition', columnMappings)
        const conditionEnum = parseConditionEnum(conditionRaw)
        const warehouseLocation = resolveField(r, 'warehouse_location', columnMappings) ?? null
        const featuredRaw = resolveField(r, 'featured', columnMappings)
        const isFeatured = parseBool(featuredRaw)
        const isActiveRaw = resolveField(r, 'is_active', columnMappings)
        const isActive =
          isActiveRaw != null
            ? String(isActiveRaw).toLowerCase() !== 'false' &&
              isActiveRaw !== '0' &&
              isActiveRaw !== false
            : true
        const subCategoryFromExcel = resolveField(r, 'sub_category', columnMappings) ?? null
        const categorySlugFromExcel = resolveField(r, 'category_slug', columnMappings) ?? null

        const purchasePriceRaw = num(resolveField(r, 'purchase_price', columnMappings))
        const requiresAssistantRaw = resolveField(r, 'requires_assistant', columnMappings)
        const requiresAssistant = parseBool(requiresAssistantRaw)
        const budgetTierRaw = resolveField(r, 'budget_tier', columnMappings)
        const budgetTier = parseBudgetTier(budgetTierRaw)
        const quantityAvailableRaw = num(resolveField(r, 'quantity_available', columnMappings))
        const quantityAvailable = quantityAvailableRaw != null && quantityAvailableRaw >= 0 ? quantityAvailableRaw : quantity

        const descriptionEn = resolveField(r, 'description', columnMappings) ?? ''
        const descriptionAr = resolveField(r, 'description_ar', columnMappings) ?? ''
        const descriptionZh = resolveField(r, 'description_zh', columnMappings) ?? ''

        const priceDaily = safePrice(daily) ?? 0
        const priceWeekly = safePrice(weekly) ?? (priceDaily > 0 ? safePrice(priceDaily * WEEKLY_FACTOR) ?? null : null)
        const priceMonthly = safePrice(monthly) ?? (priceDaily > 0 ? safePrice(priceDaily * MONTHLY_FACTOR) ?? null : null)
        const status = priceDaily > 0 ? ProductStatus.ACTIVE : ProductStatus.DRAFT

        const PLACEHOLDER_IMAGE = '/images/placeholder.jpg'
        const featuredImageRaw = resolveField(r, 'featured_image', columnMappings)
        const featuredImage =
          typeof featuredImageRaw === 'string' && featuredImageRaw.trim()
            ? featuredImageRaw.trim()
            : PLACEHOLDER_IMAGE
        const featuredImageSafe =
          featuredImage && featuredImage !== '/' ? featuredImage : PLACEHOLDER_IMAGE
        const galleryImages = arr(resolveField(r, 'gallery', columnMappings))
        const tagsRaw = resolveField(r, 'tags', columnMappings)
        const tags = tagsRaw ? String(tagsRaw).trim() : null
        const relatedProducts = arr(resolveField(r, 'related_products', columnMappings))
        const videoUrl = resolveField(r, 'video', columnMappings) ?? null

        // SKU and barcode are distinct: do not use barcode as SKU
        let sku = resolveField(r, 'sku', columnMappings) ?? null
        const barcodeValue =
          resolveField(r, 'barcode', columnMappings) ??
          r['Barcode'] ??
          r['barcode'] ??
          (() => {
            const barcodeKeys = ['Barcode', 'barcode', 'UPC', 'upc', 'EAN', 'ean', 'GTIN', 'gtin']
            for (const k of barcodeKeys) {
              const v = r[k]
              if (v != null && String(v).trim()) return v
            }
            for (const [key, val] of Object.entries(r)) {
              if (key?.toLowerCase().includes('barcode') && val != null && String(val).trim())
                return val
            }
            return null
          })()
        if (!sku) {
          const cat = await prisma.category.findUnique({
            where: { id: payload.categoryId },
            select: { name: true },
          })
          sku = await generateUniqueSKU(cat?.name || 'General', brandName || 'Unknown')
        }
        // Proactively replace duplicate SKU within file (e.g. "50000009" appearing in multiple rows)
        if (usedSkusInJob.has(sku)) {
          const cat = await prisma.category.findUnique({
            where: { id: payload.categoryId },
            select: { name: true },
          })
          const fallbackSku = await generateUniqueSKU(
            cat?.name || 'General',
            brandName || 'Unknown'
          )
          console.info(
            `[Import] Row ${row.rowNumber}: duplicate SKU "${sku}" within file → using ${fallbackSku}`
          )
          sku = fallbackSku
        }
        usedSkusInJob.add(sku)

        // Specs: curated DB lookup first, then Excel data, then AI suggestion
        let specifications: Record<string, any> | null = null
        const curatedMatch = lookupDeepSpecs(name, brandName)
        if (curatedMatch && curatedMatch.confidence >= 75) {
          specifications = curatedMatch.specs
          console.info(
            `[Import] Curated specs match for "${name}" → ${curatedMatch.matchedModel} (${curatedMatch.confidence}%)`
          )
        }

        const specsRaw = resolveField(r, 'specifications', columnMappings)
        if (specsRaw && !specifications) {
          try {
            const parsed = typeof specsRaw === 'string' ? JSON.parse(specsRaw) : specsRaw
            specifications = normalizeSpecs(parsed)
          } catch {
            // Plain text (e.g. specifications_notes) — store as notes so row still imports
            const rawStr = typeof specsRaw === 'string' ? specsRaw : String(specsRaw)
            if (rawStr.trim()) {
              specifications = { notes: rawStr.trim() }
            }
          }
        }
        if (suggestion?.specifications && typeof suggestion.specifications === 'object') {
          const merged = { ...(specifications ?? {}) }
          const normalizedSuggestion = normalizeSpecs(suggestion.specifications)
          for (const [k, v] of Object.entries(normalizedSuggestion)) {
            if (merged[k] == null || String(merged[k]).trim() === '') merged[k] = v
          }
          specifications = normalizeSpecs(merged)
        }

        // Translations
        const translations: Array<{
          locale: TranslationLocale
          name: string
          shortDescription?: string
          longDescription?: string
          seoTitle?: string
          seoDescription?: string
          seoKeywords?: string
        }> = []

        const enFromSuggestion = suggestion?.translations?.en
        const seoFromSuggestion = suggestion?.seo
        const seoByLocale = suggestion?.seoByLocale

        const shortDescEn =
          enFromSuggestion?.shortDescription ||
          resolveField(r, 'short_description', columnMappings) ||
          descriptionEn ||
          ''
        const longDescEn =
          enFromSuggestion?.longDescription ||
          resolveField(r, 'long_description', columnMappings) ||
          ''
        const seoTitleEn =
          seoFromSuggestion?.metaTitle || (resolveField(r, 'seo_title', columnMappings) ?? name)
        const seoDescEn =
          seoFromSuggestion?.metaDescription ||
          (resolveField(r, 'seo_description', columnMappings) ?? (shortDescEn || name))
        const seoKeywordsEn =
          seoFromSuggestion?.metaKeywords || (resolveField(r, 'seo_keywords', columnMappings) ?? '')

        translations.push({
          locale: TranslationLocale.en,
          name: enFromSuggestion?.name ?? name,
          shortDescription: shortDescEn || undefined,
          longDescription: longDescEn || undefined,
          seoTitle: seoTitleEn || undefined,
          seoDescription: seoDescEn || undefined,
          seoKeywords: seoKeywordsEn || undefined,
        })

        const arFromSuggestion = suggestion?.translations?.ar
        const nameAr = arFromSuggestion?.name || (resolveField(r, 'name_ar', columnMappings) ?? '')
        const shortDescAr =
          arFromSuggestion?.shortDescription ||
          resolveField(r, 'short_desc_ar', columnMappings) ||
          descriptionAr ||
          ''
        const longDescAr =
          arFromSuggestion?.longDescription ||
          resolveField(r, 'long_desc_ar', columnMappings) ||
          ''
        const seoTitleAr =
          seoByLocale?.ar?.metaTitle ||
          seoFromSuggestion?.metaTitle ||
          (resolveField(r, 'seo_title_ar', columnMappings) ?? (nameAr || name))
        const seoDescAr =
          seoByLocale?.ar?.metaDescription ||
          seoFromSuggestion?.metaDescription ||
          (resolveField(r, 'seo_desc_ar', columnMappings) ?? (shortDescAr || nameAr || name))
        const seoKeywordsAr =
          seoByLocale?.ar?.metaKeywords ||
          seoFromSuggestion?.metaKeywords ||
          (resolveField(r, 'seo_keywords_ar', columnMappings) ?? '')
        // Push AR when we have ANY data (name, description, or SEO) — use EN name as fallback when nameAr empty
        const hasArData = nameAr || shortDescAr || longDescAr || seoTitleAr || seoDescAr || seoKeywordsAr
        if (hasArData) {
          translations.push({
            locale: TranslationLocale.ar,
            name: nameAr || name,
            shortDescription: shortDescAr || undefined,
            longDescription: longDescAr || undefined,
            seoTitle: seoTitleAr || undefined,
            seoDescription: seoDescAr || undefined,
            seoKeywords: seoKeywordsAr || undefined,
          })
        }

        const zhFromSuggestion = suggestion?.translations?.zh
        const nameZh = zhFromSuggestion?.name || (resolveField(r, 'name_zh', columnMappings) ?? '')
        const shortDescZh =
          zhFromSuggestion?.shortDescription ||
          resolveField(r, 'short_desc_zh', columnMappings) ||
          descriptionZh ||
          ''
        const longDescZh =
          zhFromSuggestion?.longDescription ||
          resolveField(r, 'long_desc_zh', columnMappings) ||
          ''
        const seoTitleZh =
          seoByLocale?.zh?.metaTitle ||
          seoFromSuggestion?.metaTitle ||
          (resolveField(r, 'seo_title_zh', columnMappings) ?? (nameZh || name))
        const seoDescZh =
          seoByLocale?.zh?.metaDescription ||
          seoFromSuggestion?.metaDescription ||
          (resolveField(r, 'seo_desc_zh', columnMappings) ?? (shortDescZh || nameZh || name))
        const seoKeywordsZh =
          seoByLocale?.zh?.metaKeywords ||
          seoFromSuggestion?.metaKeywords ||
          (resolveField(r, 'seo_keywords_zh', columnMappings) ?? '')
        // Push ZH when we have ANY data — use EN name as fallback when nameZh empty
        const hasZhData = nameZh || shortDescZh || longDescZh || seoTitleZh || seoDescZh || seoKeywordsZh
        if (hasZhData) {
          translations.push({
            locale: TranslationLocale.zh,
            name: nameZh || name,
            shortDescription: shortDescZh || undefined,
            longDescription: longDescZh || undefined,
            seoTitle: seoTitleZh || undefined,
            seoDescription: seoDescZh || undefined,
            seoKeywords: seoKeywordsZh || undefined,
          })
        }

        const bufferTime = num(resolveField(r, 'buffer_time', columnMappings)) || 0
        const bufferTimeUnit = resolveField(r, 'buffer_time_unit', columnMappings) ?? 'hours'
        const bufferTimeInHours = bufferTimeUnit === 'days' ? bufferTime * 24 : bufferTime

        // Box contents: curated DB → Excel row → AI suggestion
        let boxContentsValue = resolveField(r, 'box_contents', columnMappings) ?? null
        if (boxContentsValue != null && typeof boxContentsValue !== 'string') {
          boxContentsValue = Array.isArray(boxContentsValue)
            ? boxContentsValue.join(', ')
            : String(boxContentsValue)
        }
        if (!boxContentsValue && curatedMatch?.boxContents?.length) {
          boxContentsValue = curatedMatch.boxContents.join(', ')
        }
        const suggestionBox = suggestion?.boxContents
        if (!boxContentsValue && suggestionBox != null) {
          const s = typeof suggestionBox === 'string' ? suggestionBox : String(suggestionBox)
          if (s.trim()) boxContentsValue = s
        }

        const effectiveTags =
          tags && tags.trim().length > 0
            ? tags
            : suggestion?.tags?.trim()
              ? suggestion.tags.trim()
              : null

        const createPayload = (skuForCreate: string | null) => ({
          status,
          productType: ProductType.RENTAL,
          sku: skuForCreate,
          brandId,
          categoryId,
          subCategoryId: payload.subCategoryId || subCategoryFromExcel || null,
          priceDaily,
          priceWeekly,
          priceMonthly,
          depositAmount: deposit,
          quantity,
          bufferTime: bufferTimeInHours,
          boxContents: boxContentsValue,
          featuredImage: featuredImageSafe,
          galleryImages,
          videoUrl,
          relatedProducts: relatedProducts.length ? relatedProducts : null,
          tags: effectiveTags,
          translations: translations.map((t) => ({
            locale: t.locale,
            name: t.name,
            shortDescription: t.shortDescription ?? '',
            longDescription: t.longDescription ?? '',
            specifications: specifications ?? undefined,
            seoTitle: t.seoTitle ?? '',
            seoDescription: t.seoDescription ?? '',
            seoKeywords: t.seoKeywords ?? '',
          })),
          inventoryItems:
            barcodeTrimmed
              ? [
                  {
                    serialNumber: skuForCreate ?? `import-${row.rowNumber}`,
                    barcode: barcodeTrimmed,
                  },
                ]
              : [],
          createdBy: job.createdBy || 'system',
        })

        const updatedBy = job.createdBy || 'system'
        const baseUpdatePayload = {
          status,
          brandId,
          categoryId,
          subCategoryId: payload.subCategoryId || subCategoryFromExcel || null,
          priceDaily,
          priceWeekly,
          priceMonthly,
          depositAmount: deposit,
          quantity,
          bufferTime: bufferTimeInHours,
          boxContents: boxContentsValue,
          featuredImage: featuredImageSafe,
          galleryImages,
          videoUrl,
          relatedProducts: relatedProducts.length ? relatedProducts : null,
          tags: effectiveTags,
          translations: translations.map((t) => ({
            locale: t.locale,
            name: t.name,
            shortDescription: t.shortDescription ?? '',
            longDescription: t.longDescription ?? '',
            specifications: specifications ?? undefined,
            seoTitle: t.seoTitle ?? '',
            seoDescription: t.seoDescription ?? '',
            seoKeywords: t.seoKeywords ?? '',
          })),
          updatedBy,
        }

        let product: { id: string }

        // Root fix: if barcode already exists, update the existing product instead of failing
        const barcodeRaw =
          barcodeValue != null && barcodeValue !== ''
            ? typeof barcodeValue === 'number'
              ? String(Math.floor(barcodeValue))
              : String(barcodeValue)
            : ''
        const barcodeTrimmed = barcodeRaw.trim() || null
        if (barcodeTrimmed) {
          let existingItem = await prisma.inventoryItem.findFirst({
            where: { barcode: barcodeTrimmed, deletedAt: null },
            select: { id: true, parentProductId: true, deletedAt: true },
          })
          if (!existingItem) {
            existingItem = await prisma.inventoryItem.findFirst({
              where: { barcode: barcodeTrimmed },
              select: { id: true, parentProductId: true, deletedAt: true },
            })
          }
          if (existingItem) {
            const parentProduct = await prisma.product.findUnique({
              where: { id: existingItem.parentProductId },
              select: { id: true, deletedAt: true },
            })
            if (parentProduct?.deletedAt) {
              await prisma.product.update({
                where: { id: parentProduct.id },
                data: { deletedAt: null, deletedBy: null },
              })
              console.info(
                `[Import] Row ${row.rowNumber}: restored soft-deleted product ${parentProduct.id}`
              )
            }
            product = await ProductCatalogService.update(existingItem.parentProductId, baseUpdatePayload)
            if (existingItem.deletedAt) {
              await prisma.inventoryItem.update({
                where: { id: existingItem.id },
                data: { deletedAt: null, deletedBy: null },
              })
            }
            batchProductIds.push(product.id)
            await ImportService.markRow(jobId, row.rowNumber, ImportRowStatus.SUCCESS, {
              productId: product.id,
            })
            batchSuccess++
            console.info(
              `[Import] Row ${row.rowNumber}: barcode "${barcodeTrimmed}" exists → updated product ${product.id}`
            )
            continue
          }
        }

        try {
          product = await ProductCatalogService.create(createPayload(sku))
        } catch (createErr) {
          if (
            createErr instanceof ValidationError &&
            createErr.message.includes('SKU already exists') &&
            sku
          ) {
            const cat = await prisma.category.findUnique({
              where: { id: payload.categoryId },
              select: { name: true },
            })
            const fallbackSku = await generateUniqueSKU(
              cat?.name || 'General',
              brandName || 'Unknown'
            )
            usedSkusInJob.add(fallbackSku)
            product = await ProductCatalogService.create(createPayload(fallbackSku))
            console.info(
              `[Import] Row ${row.rowNumber}: duplicate SKU "${sku}" (in DB) replaced with ${fallbackSku}`
            )
          } else if (
            createErr instanceof ValidationError &&
            createErr.message.includes('Barcode already exists') &&
            barcodeTrimmed
          ) {
            const existingItem = await prisma.inventoryItem.findFirst({
              where: { barcode: barcodeTrimmed },
              select: { id: true, parentProductId: true, deletedAt: true },
            })
            if (existingItem) {
              const parentProd = await prisma.product.findUnique({
                where: { id: existingItem.parentProductId },
                select: { id: true, deletedAt: true },
              })
              if (parentProd?.deletedAt) {
                await prisma.product.update({
                  where: { id: parentProd.id },
                  data: { deletedAt: null, deletedBy: null },
                })
              }
              product = await ProductCatalogService.update(
                existingItem.parentProductId,
                baseUpdatePayload
              )
              if (existingItem.deletedAt) {
                await prisma.inventoryItem.update({
                  where: { id: existingItem.id },
                  data: { deletedAt: null, deletedBy: null },
                })
              }
              console.info(
                `[Import] Row ${row.rowNumber}: caught "Barcode already exists" → updated product ${product.id}`
              )
            } else {
              throw createErr
            }
          } else {
            throw createErr
          }
        }

        batchProductIds.push(product.id)

        equipmentExtras.set(product.id, {
          ...(purchasePriceRaw != null && { purchasePrice: purchasePriceRaw }),
          requiresAssistant,
          ...(budgetTier != null && { budgetTier }),
          condition: conditionEnum,
          quantityAvailable,
          ...(warehouseLocation && { warehouseLocation }),
          featured: isFeatured,
        })

        // Queue AI fill for this product; fallback to direct sync if queue unavailable
        try {
          const { addAIProcessingJob } = await import('@/lib/queue/ai-processing.queue')
          await addAIProcessingJob(jobId, [product.id])
          console.info(`[Import] Row ${row.rowNumber}: queued AI fill for product ${product.id}`)
        } catch {
          console.info(`[Import] Row ${row.rowNumber}: AI queue unavailable, will run AI fill after batch sync`)
        }

        await ImportService.markRow(jobId, row.rowNumber, ImportRowStatus.SUCCESS, {
          productId: product.id,
        })
        batchSuccess++
        console.info(`[Import] Row ${row.rowNumber} success → product ${product.id}`)
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err)
        console.error(`[Import] Row ${row.rowNumber} failed:`, message)
        if (batchErrors === 0) {
          console.error(`[Import] First row error (fix this to unblock other rows): ${message}`)
        }
        await ImportService.markRow(jobId, row.rowNumber, ImportRowStatus.ERROR, { error: message })
        batchErrors++
      }
    }

    // Batch sync: sync all successful products to Equipment in one pass
    for (const pid of batchProductIds) {
      try {
        await syncProductToEquipment(pid)
      } catch (syncErr) {
        console.warn(
          `[Import] Sync to equipment failed for product ${pid}:`,
          syncErr instanceof Error ? syncErr.message : String(syncErr)
        )
      }
    }

    // Apply extra fields that exist on Equipment but not on Product
    for (const pid of batchProductIds) {
      const extras = equipmentExtras.get(pid)
      if (!extras) continue
      try {
        const equip = await prisma.equipment.findFirst({
          where: { productId: pid, deletedAt: null },
          select: { id: true },
        })
        if (equip) {
          await prisma.equipment.update({
            where: { id: equip.id },
            data: {
              ...(extras.purchasePrice != null && { purchasePrice: extras.purchasePrice }),
              ...(extras.requiresAssistant != null && { requiresAssistant: extras.requiresAssistant }),
              ...(extras.budgetTier != null && { budgetTier: extras.budgetTier }),
              ...(extras.condition != null && { condition: extras.condition }),
              ...(extras.quantityAvailable != null && { quantityAvailable: extras.quantityAvailable }),
              ...(extras.warehouseLocation != null && { warehouseLocation: extras.warehouseLocation }),
              ...(extras.featured != null && { featured: extras.featured }),
            },
          })
        }
      } catch (extraErr) {
        console.warn(
          `[Import] Extra equipment field update failed for ${pid}:`,
          extraErr instanceof Error ? extraErr.message : String(extraErr)
        )
      }
    }

    await ImportService.bumpProgress(jobId, batch.length, batchSuccess, batchErrors)
  }

  const successfulProducts = await prisma.importJobRow.findMany({
    where: { jobId, status: ImportRowStatus.SUCCESS, productId: { not: null } },
    select: { productId: true },
  })
  const productIds = successfulProducts.map((r) => r.productId!).filter(Boolean)

  if (productIds.length > 0) {
    let aiQueueSucceeded = false
    try {
      const { addAIProcessingJob } = await import('@/lib/queue/ai-processing.queue')
      await addAIProcessingJob(jobId, productIds)
      aiQueueSucceeded = true
    } catch (queueErr) {
      console.warn(
        '[Import] AI queue unavailable, will run spec inference synchronously:',
        queueErr instanceof Error ? queueErr.message : String(queueErr)
      )
    }

    // Synchronous fallback: if AI queue failed (Redis down), run AI fill inline
    if (!aiQueueSucceeded) {
      console.info(
        `[Import] Running synchronous AI fill for ${productIds.length} products (queue unavailable)...`
      )

      // Try full master fill first, fall back to spec inference only
      for (const pid of productIds) {
        try {
          const { runMasterFill } = await import('@/lib/services/ai-master-fill.service')
          const result = await runMasterFill(pid)
          console.info(
            `[Import] AI master fill for ${pid}: ${result.fieldsGenerated} fields, ${result.photosFound} photos, score=${result.score}`
          )
        } catch (masterErr) {
          console.warn(
            `[Import] Master fill failed for ${pid}, falling back to spec inference:`,
            masterErr instanceof Error ? masterErr.message : String(masterErr)
          )

          try {
            const { inferMissingSpecs } = await import('@/lib/services/ai-spec-parser.service')
            const product = await prisma.product.findUnique({
              where: { id: pid },
              include: { translations: true, category: true, brand: true },
            })
            if (!product) continue

            const translations = product.translations ?? []
            const enTrans = translations.find((t) => t.locale === 'en')
            const specProductLike = {
              id: pid,
              sku: product.sku,
              category: product.category ?? { name: 'Equipment' },
              brand: product.brand ?? { name: 'Unknown' },
              boxContents: product.boxContents,
              translations: translations.map((t) => ({
                locale: t.locale,
                name: t.name,
                shortDescription: t.shortDescription,
                longDescription: t.longDescription,
                specifications: t.specifications,
              })),
            }

            const specResult = await inferMissingSpecs(specProductLike)
            if (specResult.specs.length > 0) {
              const existingSpecs = (enTrans?.specifications as Record<string, unknown>) ?? {}
              const merged = { ...existingSpecs }
              for (const s of specResult.specs) {
                const key = (s as { key: string }).key
                const value = (s as { value: string }).value
                if (
                  key &&
                  value &&
                  String(value).trim() !== '' &&
                  String(value).toLowerCase() !== 'unknown' &&
                  String(value).toLowerCase() !== 'n/a' &&
                  (merged[key] == null || String(merged[key]).trim() === '')
                ) {
                  merged[key] = value
                }
              }
              for (const t of translations) {
                await prisma.productTranslation.updateMany({
                  where: { productId: pid, locale: t.locale },
                  data: { specifications: merged as any },
                })
              }
              await syncProductToEquipment(pid)
              console.info(
                `[Import] Spec inference for "${enTrans?.name}": ${specResult.specs.length} specs inferred`
              )
            }
          } catch (specErr) {
            console.warn(
              `[Import] Spec inference also failed for ${pid}:`,
              specErr instanceof Error ? specErr.message : String(specErr)
            )
          }
        }
      }
    }

    try {
      const { addImageProcessingJob } = await import('@/lib/queue/image-processing.queue')
      await addImageProcessingJob(jobId, productIds)
    } catch (imgErr) {
      console.warn(
        '[Import] Image queue unavailable:',
        imgErr instanceof Error ? imgErr.message : String(imgErr)
      )
    }

    try {
      const { rebuildRelatedProducts } = await import('@/lib/services/product-similarity.service')
      await rebuildRelatedProducts(productIds, 5)
    } catch (err) {
      console.warn(
        '[Import] Related products rebuild skipped:',
        err instanceof Error ? err.message : String(err)
      )
    }
  }

  await ImportService.markComplete(jobId)
}
