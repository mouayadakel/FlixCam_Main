/**
 * @file ai-processing.worker.ts
 * @description BullMQ worker for AI processing (translations, SEO)
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

export const AI_PROCESSING_QUEUE_NAME = 'ai-processing'

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
        // Create or update AI processing job
        let aiJob = await prisma.aIProcessingJob.findFirst({
          where: { importJobId },
        })

        if (!aiJob) {
          aiJob = await prisma.aIProcessingJob.create({
            data: {
              importJobId,
              status: 'processing',
              provider: provider || 'openai',
              totalItems: productIds.length,
              processedItems: 0,
              failedItems: 0,
              startedAt: new Date(),
            },
          })
        }

        // Update import job status
        await prisma.importJob.update({
          where: { id: importJobId },
          data: { aiProcessingStatus: 'processing' },
        })

        let processed = 0
        let failed = 0
        let totalCost = 0

        // Process each product
        for (let i = 0; i < productIds.length; i++) {
          const productId = productIds[i]

          try {
            // Get product with translations
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

            // Get existing translation data
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

            // Check what's missing
            const enTranslation = existingTranslations.find((t) => t.locale === 'en')
            const arTranslation = existingTranslations.find((t) => t.locale === 'ar')
            const zhTranslation = existingTranslations.find((t) => t.locale === 'zh')

            const needsSEO = !enTranslation?.seoTitle || !enTranslation?.seoDescription
            const needsArTranslation = !arTranslation
            const needsZhTranslation = !zhTranslation

            // ═══════════════════════════════════════════════
            // PHASE 1: Auto-infer missing specs with creative measurement rules
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
                  // Only fill missing/empty specs — never overwrite existing values
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

                // Write enriched specs back to ALL locale translations
                for (const translation of product.translations) {
                  await prisma.productTranslation.updateMany({
                    where: { productId, locale: translation.locale },
                    data: { specifications: mergedSpecs as any },
                  })
                }

                if (specResult.cost) totalCost += specResult.cost
                console.info(
                  `[AI Worker] Product ${productId}: inferred ${specResult.specs.length} specs (${specResult.autoSaved} auto, ${specResult.suggestions} suggested)`
                )
              }
            } catch (specErr) {
              console.warn(
                `[AI Worker] Spec inference failed for product ${productId}:`,
                specErr instanceof Error ? specErr.message : String(specErr)
              )
              // Non-fatal: continue with translations/SEO
            }

            // ═══════════════════════════════════════════════
            // PHASE 2: Master-fill — descriptions, SEO, translations (EN/AR/ZH), box contents, tags
            // Uses the high-quality master prompt with creative measurement rules
            // ═══════════════════════════════════════════════
            const needsContent =
              needsSEO ||
              needsArTranslation ||
              needsZhTranslation ||
              !enTranslation?.shortDescription ||
              !enTranslation?.longDescription ||
              !product.boxContents ||
              !product.tags

            if (needsContent) {
              try {
                const enrichedSpecs =
                  (enTranslation?.specifications as Record<string, unknown>) ?? {}
                const masterResult = await generateMasterFill(
                  (provider || 'openai') as ContentProvider,
                  {
                    name: enTranslation?.name || product.sku || '',
                    brand: product.brand?.name || 'Unknown',
                    category: product.category?.name || 'Equipment',
                    specifications: Object.keys(enrichedSpecs).length > 0 ? enrichedSpecs : null,
                    existingDescription: enTranslation?.longDescription || null,
                  }
                )

                if (masterResult) {
                  // Helper: use AI value only if current value is empty/missing
                  const orExisting = (
                    current: string | undefined | null,
                    aiValue: string | undefined
                  ) => (current && current.trim() !== '' ? current : aiValue || '')

                  // Update English translation
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
                      seoKeywords: masterResult.seo_keywords_en || '',
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
                        masterResult.seo_keywords_en
                      ),
                    },
                  })

                  // Update/create Arabic translation
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
                      seoKeywords: masterResult.seo_keywords_ar || '',
                    },
                    update: {
                      name: orExisting(
                        arTranslation?.name as string | undefined,
                        masterResult.name_ar
                      ),
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
                        masterResult.seo_keywords_ar
                      ),
                    },
                  })

                  // Update/create Chinese translation
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
                      seoKeywords: masterResult.seo_keywords_zh || '',
                    },
                    update: {
                      name: orExisting(
                        zhTranslation?.name as string | undefined,
                        masterResult.name_zh
                      ),
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
                        masterResult.seo_keywords_zh
                      ),
                    },
                  })

                  // Update boxContents and tags on Product if AI generated them and they're missing
                  const productUpdates: Record<string, unknown> = {}
                  if (!product.boxContents && masterResult.box_contents) {
                    productUpdates.boxContents = masterResult.box_contents
                  }
                  if (!product.tags && masterResult.tags) {
                    productUpdates.tags = masterResult.tags
                  }
                  if (Object.keys(productUpdates).length > 0) {
                    await prisma.product.update({
                      where: { id: productId },
                      data: productUpdates,
                    })
                  }

                  console.info(
                    `[AI Worker] Product ${productId}: master-fill generated all 18 fields (EN/AR/ZH)${masterResult.box_contents ? ' + box contents' : ''}${masterResult.tags ? ' + tags' : ''}`
                  )
                }
              } catch (masterErr) {
                console.warn(
                  `[AI Worker] Master-fill failed for product ${productId}:`,
                  masterErr instanceof Error ? masterErr.message : String(masterErr)
                )
              }
            }

            // Always sync to equipment after AI enrichment
            await syncProductToEquipment(productId)

            processed++
          } catch (error: any) {
            console.error(`AI processing failed for product ${productId}:`, error)
            failed++

            // Mark product for review (could add a "needsReview" field to Product model)
            // For now, we'll just log the error
          }

          // Update progress
          await job.updateProgress(Math.round(((i + 1) / productIds.length) * 100))

          // Update AI job progress
          await prisma.aIProcessingJob.update({
            where: { id: aiJob.id },
            data: {
              processedItems: processed,
              failedItems: failed,
              cost: totalCost,
            },
          })
        }

        // Mark AI job as complete
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

        // Update import job status
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

        // Mark AI job as failed
        await prisma.aIProcessingJob.updateMany({
          where: { importJobId },
          data: {
            status: 'failed',
            errorMessage: error.message,
          },
        })

        // Update import job status
        await prisma.importJob.update({
          where: { id: importJobId },
          data: { aiProcessingStatus: 'failed' },
        })

        throw error
      }
    },
    {
      connection: getRedisClient(),
      concurrency: 2, // Process 2 AI jobs concurrently
      limiter: {
        max: 5,
        duration: 1000,
      },
    }
  )

  worker.on('completed', (job) => {
    console.log(`AI processing job ${job.id} completed`)
  })

  worker.on('failed', (job, err) => {
    console.error(`AI processing job ${job?.id} failed:`, err)
  })

  worker.on('error', (err) => {
    console.error('AI processing worker error:', err)
  })

  return worker
}

// Create worker instance (singleton)
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
