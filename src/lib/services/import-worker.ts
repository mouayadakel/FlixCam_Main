import { ImportService } from './import.service'
import { ImportRowStatus, ProductStatus, ProductType, TranslationLocale } from '@prisma/client'
import { ProductCatalogService } from './product-catalog.service'
import { prisma } from '@/lib/db/prisma'

type RowPayload = {
  sheetName: string
  categoryId: string | null
  subCategoryId?: string | null
  row: Record<string, any>
}

const WEEKLY_FACTOR = Number(process.env.PRICING_WEEKLY_FACTOR || 4)
const MONTHLY_FACTOR = Number(process.env.PRICING_MONTHLY_FACTOR || 12)

function num(val: any): number | null {
  if (val === null || val === undefined || val === '') return null
  const n = Number(val)
  return Number.isFinite(n) ? n : null
}

function arr(val: any): string[] {
  if (!val) return []
  if (Array.isArray(val)) return val.map((v) => String(v).trim()).filter(Boolean)
  return String(val)
    .split(/[,\\n]/)
    .map((v) => v.trim())
    .filter(Boolean)
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
  const brand = await prisma.brand.upsert({
    where: { name },
    create: { name, slug },
    update: {},
  })
  return brand.id
}

const BATCH_SIZE = 100 // Process 100 products per transaction

export async function processImportJob(jobId: string) {
  const job = await ImportService.getJob(jobId)
  if (!job) throw new Error('Job not found')

  if (!job.rows.length) {
    await ImportService.markComplete(jobId)
    return
  }

  await ImportService.markProcessing(jobId)

  // Process in batches of 100
  const batches: typeof job.rows[] = []
  for (let i = 0; i < job.rows.length; i += BATCH_SIZE) {
    batches.push(job.rows.slice(i, i + BATCH_SIZE))
  }

  for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
    const batch = batches[batchIndex]
    let batchSuccess = 0
    let batchErrors = 0

    // Process each row in batch
    for (const row of batch) {
      const payload = row.payload as RowPayload
      try {
        if (!payload.categoryId) throw new Error('Category mapping missing')

        const name =
          payload.row['Name'] ||
          payload.row['name'] ||
          payload.row['Product'] ||
          payload.row['Product Name'] ||
          payload.row['اسم'] ||
          ''
        if (!name) throw new Error('Name is required')

        const brandName =
          payload.row['Brand'] ||
          payload.row['brand'] ||
          payload.row['Brand Name'] ||
          payload.row['brand_name'] ||
          payload.row['Manufacturer'] ||
          payload.row['الماركة'] ||
          payload.row['العلامة التجارية'] ||
          'Unknown'
        const brandId = await ensureBrand(brandName || null)

        const daily = num(
          payload.row['Daily Price'] ??
            payload.row['Price Daily'] ??
            payload.row['daily_price'] ??
            payload.row['price_daily'] ??
            payload.row['السعر اليومي']
        )

        const quantity = num(
          payload.row['Quantity'] ??
            payload.row['Qty'] ??
            payload.row['quantity'] ??
            payload.row['qty'] ??
            payload.row['Stock'] ??
            payload.row['stock']
        )
        const weekly = num(payload.row['Weekly Price'] ?? payload.row['weekly_price'] ?? payload.row['price_weekly'])
        const monthly = num(payload.row['Monthly Price'] ?? payload.row['monthly_price'] ?? payload.row['price_monthly'])
        const deposit = num(payload.row['Deposit'] ?? payload.row['deposit_amount'])

        const priceDaily = daily ?? 0
        const priceWeekly = weekly ?? (priceDaily > 0 ? priceDaily * WEEKLY_FACTOR : null)
        const priceMonthly = monthly ?? (priceDaily > 0 ? priceDaily * MONTHLY_FACTOR : null)

        const status = priceDaily > 0 ? ProductStatus.ACTIVE : ProductStatus.DRAFT

        const featuredImage =
          payload.row['Featured Image'] ||
          payload.row['featured_image'] ||
          payload.row['featured'] ||
          payload.row['صورة'] ||
          '/images/placeholder.jpg'

        const galleryImages = arr(payload.row['Gallery'] || payload.row['gallery_images'])
        const tags = payload.row['Tags'] ? String(payload.row['Tags']) : null
        const relatedProducts = arr(payload.row['Related Products'])
        const videoUrl = payload.row['Video'] || payload.row['video_url'] || null
        const sku = payload.row['SKU'] || payload.row['sku'] || null
        const boxContents = null // per rule: leave null in import

        const specsRaw = payload.row['Specifications'] || payload.row['specifications']
        let specifications: Record<string, any> | null = null
        if (specsRaw) {
          try {
            specifications = typeof specsRaw === 'string' ? JSON.parse(specsRaw) : specsRaw
          } catch {
            throw new Error('Specifications JSON invalid')
          }
        }

        // Extract translations for multiple languages
        const translations: Array<{
          locale: TranslationLocale
          name: string
          shortDescription?: string
          longDescription?: string
          seoTitle?: string
          seoDescription?: string
          seoKeywords?: string
        }> = []

        // English translation (default)
        const shortDescriptionEn =
          payload.row['Short Description'] || payload.row['short_description'] || payload.row['وصف مختصر'] || ''
        const longDescriptionEn =
          payload.row['Long Description'] || payload.row['long_description'] || payload.row['وصف طويل'] || ''
        const seoTitleEn = payload.row['SEO Title'] || payload.row['seo_title'] || name
        const seoDescriptionEn = payload.row['SEO Description'] || payload.row['seo_description'] || shortDescriptionEn || name
        const seoKeywordsEn = payload.row['SEO Keywords'] || payload.row['seo_keywords'] || ''

        translations.push({
          locale: TranslationLocale.en,
          name,
          shortDescription: shortDescriptionEn || undefined,
          longDescription: longDescriptionEn || undefined,
          seoTitle: seoTitleEn || undefined,
          seoDescription: seoDescriptionEn || undefined,
          seoKeywords: seoKeywordsEn || undefined,
        })

        // Arabic translation (if provided)
        const nameAr = payload.row['الاسم'] || payload.row['Name (AR)'] || payload.row['name_ar'] || ''
        const shortDescriptionAr = payload.row['وصف مختصر'] || payload.row['Short Description (AR)'] || payload.row['short_description_ar'] || ''
        const longDescriptionAr = payload.row['وصف طويل'] || payload.row['Long Description (AR)'] || payload.row['long_description_ar'] || ''
        if (nameAr) {
          translations.push({
            locale: TranslationLocale.ar,
            name: nameAr,
            shortDescription: shortDescriptionAr || undefined,
            longDescription: longDescriptionAr || undefined,
            seoTitle: payload.row['SEO Title (AR)'] || payload.row['seo_title_ar'] || nameAr,
            seoDescription: payload.row['SEO Description (AR)'] || payload.row['seo_description_ar'] || shortDescriptionAr || nameAr,
            seoKeywords: payload.row['SEO Keywords (AR)'] || payload.row['seo_keywords_ar'] || '',
          })
        }

        // Chinese translation (if provided)
        const nameZh = payload.row['名称'] || payload.row['Name (ZH)'] || payload.row['name_zh'] || ''
        const shortDescriptionZh = payload.row['Short Description (ZH)'] || payload.row['short_description_zh'] || ''
        const longDescriptionZh = payload.row['Long Description (ZH)'] || payload.row['long_description_zh'] || ''
        if (nameZh) {
          translations.push({
            locale: TranslationLocale.zh,
            name: nameZh,
            shortDescription: shortDescriptionZh || undefined,
            longDescription: longDescriptionZh || undefined,
            seoTitle: payload.row['SEO Title (ZH)'] || payload.row['seo_title_zh'] || nameZh,
            seoDescription: payload.row['SEO Description (ZH)'] || payload.row['seo_description_zh'] || shortDescriptionZh || nameZh,
            seoKeywords: payload.row['SEO Keywords (ZH)'] || payload.row['seo_keywords_zh'] || '',
          })
        }

        // Buffer time and unit
        const bufferTime = num(payload.row['Buffer Time'] || payload.row['buffer_time'] || payload.row['وقت الفاصل']) || 0
        const bufferTimeUnit = payload.row['Buffer Time Unit'] || payload.row['buffer_time_unit'] || payload.row['وحدة الوقت'] || 'hours'
        const bufferTimeInHours = bufferTimeUnit === 'days' ? bufferTime * 24 : bufferTime

        // Box contents
        const boxContentsValue = payload.row['Box Contents'] || payload.row['box_contents'] || payload.row['محتوى الصندوق'] || null

        const product = await ProductCatalogService.create({
          status,
          productType: ProductType.RENTAL,
          sku,
          brandId,
          categoryId: payload.categoryId,
          subCategoryId: payload.subCategoryId || null,
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
          tags,
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
          inventoryItems: [],
          createdBy: job.createdBy || 'system',
        })

        await ImportService.markRow(jobId, row.rowNumber, ImportRowStatus.SUCCESS, { productId: product.id })
        batchSuccess++
      } catch (err: any) {
        await ImportService.markRow(jobId, row.rowNumber, ImportRowStatus.ERROR, { error: err.message })
        batchErrors++
      }
    }

    // Update progress after each batch
    await ImportService.bumpProgress(jobId, batch.length, batchSuccess, batchErrors)
  }

  // After all products are created, trigger AI and image processing
  const successfulProducts = await prisma.importJobRow.findMany({
    where: {
      jobId,
      status: ImportRowStatus.SUCCESS,
      productId: { not: null },
    },
    select: { productId: true },
  })

  const productIds = successfulProducts.map((r) => r.productId!).filter(Boolean)

  if (productIds.length > 0) {
    // Trigger AI processing (always runs, even if preview was skipped)
    const { addAIProcessingJob } = await import('@/lib/queue/ai-processing.queue')
    await addAIProcessingJob(jobId, productIds)

    // Trigger image processing
    const { addImageProcessingJob } = await import('@/lib/queue/image-processing.queue')
    await addImageProcessingJob(jobId, productIds)
  }

  await ImportService.markComplete(jobId)
}
