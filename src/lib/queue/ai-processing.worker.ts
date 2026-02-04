/**
 * @file ai-processing.worker.ts
 * @description BullMQ worker for AI processing (translations, SEO)
 * @module lib/queue
 */

import { Worker, Job } from 'bullmq'
import { getRedisClient } from './redis.client'
import { prisma } from '@/lib/db/prisma'
import { autofillMissingFields } from '@/lib/services/ai-autofill.service'
import { TranslationLocale } from '@prisma/client'

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

            if (needsSEO || needsArTranslation || needsZhTranslation) {
              // Autofill missing fields
              const autofillResult = await autofillMissingFields(
                productId,
                {
                  name: enTranslation?.name || '',
                  shortDescription: enTranslation?.shortDescription,
                  longDescription: enTranslation?.longDescription,
                  seoTitle: enTranslation?.seoTitle,
                  seoDescription: enTranslation?.seoDescription,
                  seoKeywords: enTranslation?.seoKeywords,
                  translations: existingTranslations,
                },
                {
                  category: product.category?.name,
                  brand: product.brand?.name,
                  specifications: enTranslation?.specifications as Record<string, any> | undefined,
                },
                provider
              )

              // Update product translations
              if (autofillResult.seo && (needsSEO || needsArTranslation || needsZhTranslation)) {
                // Update English translation with SEO
                if (enTranslation && autofillResult.seo.metaTitle) {
                  await prisma.productTranslation.updateMany({
                    where: {
                      productId,
                      locale: 'en',
                    },
                    data: {
                      seoTitle: autofillResult.seo.metaTitle || enTranslation.seoTitle,
                      seoDescription: autofillResult.seo.metaDescription || enTranslation.seoDescription,
                      seoKeywords: autofillResult.seo.metaKeywords || enTranslation.seoKeywords,
                    },
                  })
                }

                // Create/update Arabic translation
                if (needsArTranslation && autofillResult.translations?.ar) {
                  await prisma.productTranslation.upsert({
                    where: {
                      productId_locale: {
                        productId,
                        locale: 'ar',
                      },
                    },
                    create: {
                      productId,
                      locale: 'ar',
                      name: autofillResult.translations.ar.name,
                      shortDescription: autofillResult.translations.ar.shortDescription,
                      longDescription: autofillResult.translations.ar.longDescription,
                      seoTitle: autofillResult.seo.metaTitle,
                      seoDescription: autofillResult.seo.metaDescription,
                      seoKeywords: autofillResult.seo.metaKeywords,
                    },
                    update: {
                      name: autofillResult.translations.ar.name,
                      shortDescription: autofillResult.translations.ar.shortDescription,
                      longDescription: autofillResult.translations.ar.longDescription,
                      seoTitle: autofillResult.seo.metaTitle,
                      seoDescription: autofillResult.seo.metaDescription,
                      seoKeywords: autofillResult.seo.metaKeywords,
                    },
                  })
                }

                // Create/update Chinese translation
                if (needsZhTranslation && autofillResult.translations?.zh) {
                  await prisma.productTranslation.upsert({
                    where: {
                      productId_locale: {
                        productId,
                        locale: 'zh',
                      },
                    },
                    create: {
                      productId,
                      locale: 'zh',
                      name: autofillResult.translations.zh.name,
                      shortDescription: autofillResult.translations.zh.shortDescription,
                      longDescription: autofillResult.translations.zh.longDescription,
                      seoTitle: autofillResult.seo.metaTitle,
                      seoDescription: autofillResult.seo.metaDescription,
                      seoKeywords: autofillResult.seo.metaKeywords,
                    },
                    update: {
                      name: autofillResult.translations.zh.name,
                      shortDescription: autofillResult.translations.zh.shortDescription,
                      longDescription: autofillResult.translations.zh.longDescription,
                      seoTitle: autofillResult.seo.metaTitle,
                      seoDescription: autofillResult.seo.metaDescription,
                      seoKeywords: autofillResult.seo.metaKeywords,
                    },
                  })
                }

                if (autofillResult.cost) {
                  totalCost += autofillResult.cost
                }
              }
            }

            processed++
          } catch (error: any) {
            console.error(`AI processing failed for product ${productId}:`, error)
            failed++

            // Mark product for review (could add a "needsReview" field to Product model)
            // For now, we'll just log the error
          }

          // Update progress
          await job.updateProgress(Math.round((i + 1) / productIds.length * 100))

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
