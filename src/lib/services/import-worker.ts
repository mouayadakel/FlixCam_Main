/**
 * @file import-worker.ts
 * @description Import worker that processes Excel rows into Products.
 * Uses ColumnMapperService for dynamic header resolution instead of hardcoded lookups.
 * Auto-generates SKUs, auto-calculates weekly/monthly prices, and enriches with curated specs.
 * @module lib/services
 */

import { ImportService } from './import.service'
import { ImportRowStatus, ProductStatus, ProductType, TranslationLocale } from '@prisma/client'
import { ProductCatalogService } from './product-catalog.service'
import { syncProductToEquipment } from './product-equipment-sync.service'
import { prisma } from '@/lib/db/prisma'
import { generateUniqueSKU } from '@/lib/utils/sku-generator'
import { mapColumns, saveMappingHistory, type ColumnMapping } from './column-mapper.service'
import { lookupDeepSpecs } from './specs-db.service'
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
  try {
    const brand = await prisma.brand.upsert({
      where: { name },
      create: { name, slug },
      update: {},
    })
    return brand.id
  } catch (err: unknown) {
    const brand = await prisma.brand.findUnique({ where: { name } })
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
          break
        }
      }
    }
  }
  return undefined
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

  // Build column mappings per sheet (so different sheets with different headers all resolve correctly)
  const columnMappingsBySheet = new Map<string, ColumnMapping[]>()
  const seenSheets = new Set<string>()
  for (const row of job.rows) {
    const payload = row.payload as unknown as RowPayload
    const sheetName = payload?.sheetName
    if (!sheetName || !payload?.row || seenSheets.has(sheetName)) continue
    seenSheets.add(sheetName)
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

        // Resolve fields via column mapper (SYNONYM_MAP handles all aliases)
        const name = resolveField(r, 'name', columnMappings) ?? r['*'] ?? ''
        if (!name) throw new Error('Name is required')

        const brandName = resolveField(r, 'brand', columnMappings) ?? 'Unknown'
        const brandId = await ensureBrand(brandName || null)
        const modelName = resolveField(r, 'model', columnMappings) ?? null

        const daily = num(resolveField(r, 'daily_price', columnMappings))
        const quantityRaw = num(resolveField(r, 'quantity', columnMappings))
        const quantity = quantityRaw != null && quantityRaw >= 0 ? quantityRaw : 0
        const weekly = num(resolveField(r, 'weekly_price', columnMappings))
        const monthly = num(resolveField(r, 'monthly_price', columnMappings))
        const deposit = num(resolveField(r, 'deposit', columnMappings))

        // New mapped fields
        const conditionRaw = resolveField(r, 'condition', columnMappings)
        const warehouseLocation = resolveField(r, 'warehouse_location', columnMappings) ?? null
        const featuredRaw = resolveField(r, 'featured', columnMappings)
        const isFeatured =
          featuredRaw != null
            ? String(featuredRaw).toLowerCase() === 'true' ||
              featuredRaw === '1' ||
              featuredRaw === true
            : false
        const isActiveRaw = resolveField(r, 'is_active', columnMappings)
        const isActive =
          isActiveRaw != null
            ? String(isActiveRaw).toLowerCase() !== 'false' &&
              isActiveRaw !== '0' &&
              isActiveRaw !== false
            : true
        const subCategoryFromExcel = resolveField(r, 'sub_category', columnMappings) ?? null

        const priceDaily = safePrice(daily) ?? 0
        const priceWeekly =
          safePrice(weekly) ?? (priceDaily > 0 ? priceDaily * WEEKLY_FACTOR : null)
        const priceMonthly =
          safePrice(monthly) ?? (priceDaily > 0 ? priceDaily * MONTHLY_FACTOR : null)
        const status = priceDaily > 0 ? ProductStatus.ACTIVE : ProductStatus.DRAFT

        const featuredImageRaw =
          resolveField(r, 'featured_image', columnMappings) ?? '/images/placeholder.jpg'
        const featuredImage =
          typeof featuredImageRaw === 'string' && featuredImageRaw.trim()
            ? featuredImageRaw.trim()
            : '/images/placeholder.jpg'
        const galleryImages = arr(resolveField(r, 'gallery', columnMappings))
        const tagsRaw = resolveField(r, 'tags', columnMappings)
        const tags = tagsRaw ? String(tagsRaw).trim() : null
        const relatedProducts = arr(resolveField(r, 'related_products', columnMappings))
        const videoUrl = resolveField(r, 'video', columnMappings) ?? null

        // SKU and barcode are distinct: do not use barcode as SKU
        let sku = resolveField(r, 'sku', columnMappings) ?? null
        const barcodeValue = resolveField(r, 'barcode', columnMappings) ?? null
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
            throw new Error('Specifications JSON invalid')
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
          (resolveField(r, 'short_description', columnMappings) ?? '')
        const longDescEn =
          enFromSuggestion?.longDescription ||
          (resolveField(r, 'long_description', columnMappings) ?? '')
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
          (resolveField(r, 'short_desc_ar', columnMappings) ?? '')
        const longDescAr =
          arFromSuggestion?.longDescription ||
          (resolveField(r, 'long_desc_ar', columnMappings) ?? '')
        if (nameAr) {
          translations.push({
            locale: TranslationLocale.ar,
            name: nameAr,
            shortDescription: shortDescAr || undefined,
            longDescription: longDescAr || undefined,
            seoTitle:
              seoByLocale?.ar?.metaTitle ||
              seoFromSuggestion?.metaTitle ||
              (resolveField(r, 'seo_title_ar', columnMappings) ?? nameAr),
            seoDescription:
              seoByLocale?.ar?.metaDescription ||
              seoFromSuggestion?.metaDescription ||
              (resolveField(r, 'seo_desc_ar', columnMappings) ?? (shortDescAr || nameAr)),
            seoKeywords:
              seoByLocale?.ar?.metaKeywords ||
              seoFromSuggestion?.metaKeywords ||
              (resolveField(r, 'seo_keywords_ar', columnMappings) ?? ''),
          })
        }

        const zhFromSuggestion = suggestion?.translations?.zh
        const nameZh = zhFromSuggestion?.name || (resolveField(r, 'name_zh', columnMappings) ?? '')
        const shortDescZh =
          zhFromSuggestion?.shortDescription ||
          (resolveField(r, 'short_desc_zh', columnMappings) ?? '')
        const longDescZh =
          zhFromSuggestion?.longDescription ||
          (resolveField(r, 'long_desc_zh', columnMappings) ?? '')
        if (nameZh) {
          translations.push({
            locale: TranslationLocale.zh,
            name: nameZh,
            shortDescription: shortDescZh || undefined,
            longDescription: longDescZh || undefined,
            seoTitle:
              seoByLocale?.zh?.metaTitle ||
              seoFromSuggestion?.metaTitle ||
              (resolveField(r, 'seo_title_zh', columnMappings) ?? nameZh),
            seoDescription:
              seoByLocale?.zh?.metaDescription ||
              seoFromSuggestion?.metaDescription ||
              (resolveField(r, 'seo_desc_zh', columnMappings) ?? (shortDescZh || nameZh)),
            seoKeywords:
              seoByLocale?.zh?.metaKeywords ||
              seoFromSuggestion?.metaKeywords ||
              (resolveField(r, 'seo_keywords_zh', columnMappings) ?? ''),
          })
        }

        const bufferTime = num(resolveField(r, 'buffer_time', columnMappings)) || 0
        const bufferTimeUnit = resolveField(r, 'buffer_time_unit', columnMappings) ?? 'hours'
        const bufferTimeInHours = bufferTimeUnit === 'days' ? bufferTime * 24 : bufferTime

        // Box contents: curated DB → Excel row → AI suggestion
        let boxContentsValue = resolveField(r, 'box_contents', columnMappings) ?? null
        if (!boxContentsValue && curatedMatch?.boxContents?.length) {
          boxContentsValue = curatedMatch.boxContents.join(', ')
        }
        if (!boxContentsValue && suggestion?.boxContents?.trim()) {
          boxContentsValue = suggestion.boxContents
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
          featuredImage,
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
            barcodeValue && String(barcodeValue).trim()
              ? [
                  {
                    serialNumber: skuForCreate ?? `import-${row.rowNumber}`,
                    barcode: String(barcodeValue).trim(),
                  },
                ]
              : [],
          createdBy: job.createdBy || 'system',
        })

        let product
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
          } else {
            throw createErr
          }
        }

        batchProductIds.push(product.id)

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

    // Synchronous fallback: if AI queue failed (Redis down), run spec inference inline
    // so specs are ALWAYS filled regardless of infrastructure
    if (!aiQueueSucceeded) {
      console.info(
        `[Import] Running synchronous AI spec inference for ${productIds.length} products...`
      )
      const { inferMissingSpecs } = await import('@/lib/services/ai-spec-parser.service')
      for (const pid of productIds) {
        try {
          const product = await prisma.product.findUnique({
            where: { id: pid },
            include: { translations: true, category: true, brand: true },
          })
          if (!product) continue

          const enTrans = product.translations.find((t) => t.locale === 'en')
          const specProductLike = {
            id: pid,
            sku: product.sku,
            category: product.category ?? { name: 'Equipment' },
            brand: product.brand ?? { name: 'Unknown' },
            boxContents: product.boxContents,
            translations: product.translations.map((t) => ({
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
            for (const t of product.translations) {
              await prisma.productTranslation.updateMany({
                where: { productId: pid, locale: t.locale },
                data: { specifications: merged as any },
              })
            }
            await syncProductToEquipment(pid)
            console.info(
              `[Import] Sync spec inference for "${enTrans?.name}": ${specResult.specs.length} specs inferred`
            )
          }
        } catch (specErr) {
          console.warn(
            `[Import] Sync spec inference failed for product ${pid}:`,
            specErr instanceof Error ? specErr.message : String(specErr)
          )
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
