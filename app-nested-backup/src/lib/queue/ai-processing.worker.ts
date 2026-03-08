/**
 * @file ai-processing.worker.ts
 * @description BullMQ worker for AI processing (translations, SEO, specs, photos).
 * Integrates master fill, photo sourcing, and post-fill validation.
 * @module lib/queue
 */

import { Worker, Job } from 'bullmq'
import { getRedisClient } from './redis.client'
import { prisma } from '@/lib/db/prisma'
import {
  generateMasterFill,
  type ContentProvider,
} from '@/lib/services/ai-content-generation.service'
import { syncProductToEquipment } from '@/lib/services/product-equipment-sync.service'
import {
  inferMissingSpecs,
  type ProductForSpecInference,
} from '@/lib/services/ai-spec-parser.service'
import {
  sourceImages,
  type ProductForSourcing,
} from '@/lib/services/image-sourcing.service'

export const AI_PROCESSING_QUEUE_NAME = 'ai-processing'

function normalizeKeywords(value: string | string[] | undefined): string {
  if (!value) return ''
  if (Array.isArray(value)) return value.join(', ')
  return value
}

/**
 * Create AI processing worker
 */
export function createAIProcessingWorker() {
  const worker = new Worker(
    AI_PROCESSING_QUEUE_NAME,
    async (job: Job) => {
      const { importJobId, productIds, provider } = job.data as {
        importJobId: string
        productIds: string[]
        provider?: 'openai' | 'gemini'
      }

      await job.updateProgress(0)

      try {
        let aiJob = await prisma.aIProcessingJob.findFirst({
          where: { importJobId },
        })

        if (!aiJob) {
          aiJob = await prisma.aIProcessingJob.create({
            data: {
              importJobId,
              status: 'processing',
              provider: provider || 'gemini',
              totalItems: productIds.length,
              processedItems: 0,
              failedItems: 0,
              startedAt: new Date(),
            },
          })
        }

        await prisma.importJob.update({
          where: { id: importJobId },
          data: { aiProcessingStatus: 'processing' },
        })

        let processed = 0
        let failed = 0
        let totalCost = 0

        for (let i = 0; i < productIds.length; i++) {
          const productId = productIds[i]

          try {
            const product = await prisma.product.findUnique({
              where: { id: productId },
              include: {
                translations: true,
                category: true,
                brand: true,
              },
            })

            if (!product) {
              failed++
              continue
            }

            const existingTranslations = product.translations.map((t) => ({
              locale: t.locale,
              name: t.name,
              shortDescription: t.shortDescription,
              longDescription: t.longDescription,
              seoTitle: t.seoTitle,
              seoDescription: t.seoDescription,
              seoKeywords: t.seoKeywords,
              specifications: t.specifications,
            }))

            const enTranslation = existingTranslations.find((t) => t.locale === 'en')
            const arTranslation = existingTranslations.find((t) => t.locale === 'ar')
            const zhTranslation = existingTranslations.find((t) => t.locale === 'zh')

            // ═══════════════════════════════════════════════
            // PHASE 1: Auto-infer missing specs
            // ═══════════════════════════════════════════════
            try {
              const existingSpecs = (enTranslation?.specifications as Record<string, unknown>) ?? {}
              const specProductLike: ProductForSpecInference = {
                id: productId,
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
                const mergedSpecs = { ...existingSpecs }
                for (const s of specResult.specs) {
                  const key = (s as { key: string }).key
                  const value = (s as { value: string }).value
                  if (
                    key &&
                    value &&
                    String(value).trim() !== '' &&
                    String(value).toLowerCase() !== 'unknown' &&
                    String(value).toLowerCase() !== 'n/a' &&
                    (mergedSpecs[key] == null || String(mergedSpecs[key]).trim() === '')
                  ) {
                    mergedSpecs[key] = value
                  }
                }

                for (const translation of product.translations) {
                  await prisma.productTranslation.updateMany({
                    where: { productId, locale: translation.locale },
                    data: { specifications: mergedSpecs as any },
                  })
                }

                if (specResult.cost) totalCost += specResult.cost
                console.info(
                  `[AI Worker] Product ${productId}: inferred ${specResult.specs.length} specs`
                )
              }
            } catch (specErr) {
              console.warn(
                `[AI Worker] Spec inference failed for product ${productId}:`,
                specErr instanceof Error ? specErr.message : String(specErr)
              )
            }

            // ═══════════════════════════════════════════════
            // PHASE 2: Master-fill — descriptions, SEO, translations, specs, tags, photo queries
            // ═══════════════════════════════════════════════
            const needsSEO = !enTranslation?.seoTitle || !enTranslation?.seoDescription
            const needsArTranslation = !arTranslation
            const needsZhTranslation = !zhTranslation
            const needsContent =
              needsSEO ||
              needsArTranslation ||
              needsZhTranslation ||
              !enTranslation?.shortDescription ||
              !enTranslation?.longDescription ||
              !product.boxContents ||
              !product.tags

            let photoSearchQueries: string[] = []

            if (needsContent) {
              try {
                const enrichedSpecs =
                  (enTranslation?.specifications as Record<string, unknown>) ?? {}
                const masterResult = await generateMasterFill(
                  (provider || 'gemini') as ContentProvider,
                  {
                    name: enTranslation?.name || product.sku || '',
                    brand: product.brand?.name || 'Unknown',
                    category: product.category?.name || 'Equipment',
                    specifications: Object.keys(enrichedSpecs).length > 0 ? enrichedSpecs : null,
                    existingDescription: enTranslation?.longDescription || null,
                    box_contents: product.boxContents,
                    price_daily: product.priceDaily ? Number(product.priceDaily) : null,
                  }
                )

                if (masterResult) {
                  photoSearchQueries = masterResult.photo_search_queries ?? []

                  const orExisting = (
                    current: string | undefined | null,
                    aiValue: string | undefined
                  ) => (current && current.trim() !== '' ? current : aiValue || '')

                  await prisma.productTranslation.upsert({
                    where: { productId_locale: { productId, locale: 'en' } },
                    create: {
                      productId,
                      locale: 'en',
                      name: enTranslation?.name || product.sku || '',
                      shortDescription: masterResult.short_desc_en || '',
                      longDescription: masterResult.long_desc_en || '',
                      seoTitle: masterResult.seo_title_en || '',
                      seoDescription: masterResult.seo_desc_en || '',
                      seoKeywords: normalizeKeywords(masterResult.seo_keywords_en) || '',
                      specifications: (masterResult.specifications ?? {}) as any,
                    },
                    update: {
                      shortDescription: orExisting(
                        enTranslation?.shortDescription,
                        masterResult.short_desc_en
                      ),
                      longDescription: orExisting(
                        enTranslation?.longDescription,
                        masterResult.long_desc_en
                      ),
                      seoTitle: orExisting(enTranslation?.seoTitle, masterResult.seo_title_en),
                      seoDescription: orExisting(
                        enTranslation?.seoDescription,
                        masterResult.seo_desc_en
                      ),
                      seoKeywords: orExisting(
                        enTranslation?.seoKeywords,
                        normalizeKeywords(masterResult.seo_keywords_en)
                      ),
                      specifications: masterResult.specifications ? (masterResult.specifications as any) : undefined,
                    },
                  })

                  await prisma.productTranslation.upsert({
                    where: { productId_locale: { productId, locale: 'ar' } },
                    create: {
                      productId,
                      locale: 'ar',
                      name: masterResult.name_ar || enTranslation?.name || '',
                      shortDescription: masterResult.short_desc_ar || '',
                      longDescription: masterResult.long_desc_ar || '',
                      seoTitle: masterResult.seo_title_ar || '',
                      seoDescription: masterResult.seo_desc_ar || '',
                      seoKeywords: normalizeKeywords(masterResult.seo_keywords_ar) || '',
                    },
                    update: {
                      name: orExisting(arTranslation?.name as string | undefined, masterResult.name_ar),
                      shortDescription: orExisting(
                        arTranslation?.shortDescription as string | undefined,
                        masterResult.short_desc_ar
                      ),
                      longDescription: orExisting(
                        arTranslation?.longDescription as string | undefined,
                        masterResult.long_desc_ar
                      ),
                      seoTitle: orExisting(
                        arTranslation?.seoTitle as string | undefined,
                        masterResult.seo_title_ar
                      ),
                      seoDescription: orExisting(
                        arTranslation?.seoDescription as string | undefined,
                        masterResult.seo_desc_ar
                      ),
                      seoKeywords: orExisting(
                        arTranslation?.seoKeywords as string | undefined,
                        normalizeKeywords(masterResult.seo_keywords_ar)
                      ),
                    },
                  })

                  await prisma.productTranslation.upsert({
                    where: { productId_locale: { productId, locale: 'zh' } },
                    create: {
                      productId,
                      locale: 'zh',
                      name: masterResult.name_zh || enTranslation?.name || '',
                      shortDescription: masterResult.short_desc_zh || '',
                      longDescription: masterResult.long_desc_zh || '',
                      seoTitle: masterResult.seo_title_zh || '',
                      seoDescription: masterResult.seo_desc_zh || '',
                      seoKeywords: normalizeKeywords(masterResult.seo_keywords_zh) || '',
                    },
                    update: {
                      name: orExisting(zhTranslation?.name as string | undefined, masterResult.name_zh),
                      shortDescription: orExisting(
                        zhTranslation?.shortDescription as string | undefined,
                        masterResult.short_desc_zh
                      ),
                      longDescription: orExisting(
                        zhTranslation?.longDescription as string | undefined,
                        masterResult.long_desc_zh
                      ),
                      seoTitle: orExisting(
                        zhTranslation?.seoTitle as string | undefined,
                        masterResult.seo_title_zh
                      ),
                      seoDescription: orExisting(
                        zhTranslation?.seoDescription as string | undefined,
                        masterResult.seo_desc_zh
                      ),
                      seoKeywords: orExisting(
                        zhTranslation?.seoKeywords as string | undefined,
                        normalizeKeywords(masterResult.seo_keywords_zh)
                      ),
                    },
                  })

                  const productUpdates: Record<string, unknown> = {
                    lastAiRunAt: new Date(),
                    aiRunCount: { increment: 1 },
                    needsAiReview: masterResult._needs_review ?? false,
                  }
                  if (!product.boxContents && masterResult.box_contents) {
                    productUpdates.boxContents = masterResult.box_contents
                  }
                  const tagStr = Array.isArray(masterResult.tags)
                    ? masterResult.tags.join(', ')
                    : masterResult.tags
                  if (!product.tags && tagStr) {
                    productUpdates.tags = tagStr
                  }
                  await prisma.product.update({
                    where: { id: productId },
                    data: productUpdates as any,
                  })

                  console.info(
                    `[AI Worker] Product ${productId}: master-fill complete`
                  )
                }
              } catch (masterErr) {
                console.warn(
                  `[AI Worker] Master-fill failed for product ${productId}:`,
                  masterErr instanceof Error ? masterErr.message : String(masterErr)
                )
              }
            }

            // ═══════════════════════════════════════════════
            // PHASE 3: Photo sourcing with AI-generated search queries
            // ═══════════════════════════════════════════════
            const needsPhotos =
              !product.featuredImage || product.featuredImage === '/images/placeholder.jpg'

            if (needsPhotos) {
              try {
                const productName = enTranslation?.name || product.sku || ''
                const sourcingProduct: ProductForSourcing = {
                  id: productId,
                  name: productName,
                  sku: product.sku,
                  category: product.category ? { name: product.category.name } : null,
                  brand: product.brand ? { name: product.brand.name } : null,
                  translations: product.translations.map((t) => ({
                    locale: t.locale,
                    name: t.name,
                    longDescription: t.longDescription,
                  })),
                }

                const defaultQueries = [
                  `${productName} product photo`,
                  `${productName} professional equipment`,
                ]
                const queries = photoSearchQueries.length > 0
                  ? photoSearchQueries
                  : defaultQueries

                const photos = await sourceImages(sourcingProduct, 5, queries)

                if (photos.length > 0) {
                  const featuredUrl = photos[0].cloudinaryUrl || photos[0].url
                  const galleryUrls = photos.slice(1).map((p) => p.cloudinaryUrl || p.url)

                  await prisma.product.update({
                    where: { id: productId },
                    data: {
                      featuredImage: featuredUrl,
                      galleryImages: galleryUrls.length > 0 ? galleryUrls : undefined,
                      photoStatus: 'sourced',
                    },
                  })

                  console.info(
                    `[AI Worker] Product ${productId}: sourced ${photos.length} photos`
                  )
                } else {
                  await prisma.product.update({
                    where: { id: productId },
                    data: { photoStatus: 'not_found' },
                  })
                }
              } catch (photoErr) {
                console.warn(
                  `[AI Worker] Photo sourcing failed for product ${productId}:`,
                  photoErr instanceof Error ? photoErr.message : String(photoErr)
                )
              }
            }

            await syncProductToEquipment(productId)
            processed++
          } catch (error) {
            console.error(`AI processing failed for product ${productId}:`, error)
            failed++
          }

          await job.updateProgress(Math.round(((i + 1) / productIds.length) * 100))

          await prisma.aIProcessingJob.update({
            where: { id: aiJob.id },
            data: {
              processedItems: processed,
              failedItems: failed,
              cost: totalCost,
            },
          })
        }

        await prisma.aIProcessingJob.update({
          where: { id: aiJob.id },
          data: {
            status: 'completed',
            completedAt: new Date(),
            processedItems: processed,
            failedItems: failed,
            cost: totalCost,
          },
        })

        await prisma.importJob.update({
          where: { id: importJobId },
          data: { aiProcessingStatus: 'completed' },
        })

        await job.updateProgress(100)

        return {
          success: true,
          importJobId,
          processed,
          failed,
          totalCost,
        }
      } catch (error: any) {
        console.error(`AI processing job ${importJobId} failed:`, error)

        await prisma.aIProcessingJob.updateMany({
          where: { importJobId },
          data: {
            status: 'failed',
            errorMessage: error.message,
          },
        })

        await prisma.importJob.update({
          where: { id: importJobId },
          data: { aiProcessingStatus: 'failed' },
        })

        throw error
      }
    },
    {
      connection: getRedisClient(),
      concurrency: 2,
      limiter: {
        max: 5,
        duration: 1000,
      },
    }
  )

  worker.on('completed', (job) => {
    console.info(`AI processing job ${job.id} completed`)
  })

  worker.on('failed', (job, err) => {
    console.error(`AI processing job ${job?.id} failed:`, err)
  })

  worker.on('error', (err) => {
    console.error('AI processing worker error:', err)
  })

  return worker
}

let aiWorkerInstance: Worker | null = null

/**
 * Get or create AI processing worker instance
 */
export function getAIProcessingWorker(): Worker {
  if (!aiWorkerInstance) {
    aiWorkerInstance = createAIProcessingWorker()
  }
  return aiWorkerInstance
}
