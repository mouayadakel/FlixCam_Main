/**
 * @file backfill.worker.ts
 * @description BullMQ worker for content backfill (AI fill for products with gaps)
 * @module lib/queue
 */

import { Worker, Job } from 'bullmq'
import { getRedisClient } from './redis.client'
import { prisma } from '@/lib/db/prisma'
import { AiJobType, JobStatus } from '@prisma/client'
import { generateMasterFill } from '@/lib/services/ai-content-generation.service'
import { scanAndQueue } from '@/lib/services/catalog-scanner.service'
import { researchProduct, isWebResearchAvailable } from '@/lib/services/web-researcher.service'
import { rebuildRelatedProducts } from '@/lib/services/product-similarity.service'
import { getProductIdsWithGaps } from '@/lib/services/content-health.service'
import { inferMissingSpecs } from '@/lib/services/ai-spec-parser.service'
import { sourceImages } from '@/lib/services/photo-sourcing.service'
import { recordCost, canSpend } from '@/lib/utils/cost-tracker'
import { captureQualitySnapshot } from '@/lib/services/quality-scorer.service'
import { sendToDeadLetter } from './dead-letter.queue'
import type { BackfillJobData } from './backfill.queue'

export const BACKFILL_QUEUE_NAME = 'backfill'
const NIGHTLY_BATCH_SIZE = 50

let isClosing = false
function checkClosing(): boolean {
  return isClosing
}

function getBackfillConcurrency(): number {
  const raw = process.env.BACKFILL_CONCURRENCY
  if (raw == null || raw === '') return 10
  const n = parseInt(raw, 10)
  if (Number.isNaN(n) || n < 1) return 10
  return Math.min(n, 50)
}

function getBackfillRateLimitMs(): number {
  const raw = process.env.BACKFILL_RATE_LIMIT_MS
  if (raw == null || raw === '') return 500
  const n = parseInt(raw, 10)
  if (Number.isNaN(n) || n < 0) return 500
  return Math.min(Math.max(n, 100), 10_000)
}

function createBackfillWorker() {
  const worker = new Worker(
    BACKFILL_QUEUE_NAME,
    async (job: Job<BackfillJobData | Record<string, never>>) => {
      if (job.name === 'nightly-scan') {
        await scanAndQueue({
          types: ['text', 'photo', 'spec'],
          trigger: 'scheduled',
        })
        return
      }

      let aiJobId: string
      let productIds: string[]
      let provider: 'openai' | 'gemini'
      let types: Array<'text' | 'photo' | 'spec'>

      if (job.name === 'nightly-backfill') {
        const ids = await getProductIdsWithGaps()
        productIds = ids.slice(0, NIGHTLY_BATCH_SIZE)
        if (productIds.length === 0) return
        const aiJob = await prisma.aiJob.create({
          data: {
            type: AiJobType.TEXT_BACKFILL,
            status: JobStatus.PENDING,
            triggeredBy: 'cron',
            totalItems: productIds.length,
          },
        })
        aiJobId = aiJob.id
        provider = 'gemini'
        types = ['text']
      } else {
        const data = job.data as BackfillJobData
        aiJobId = data.aiJobId
        productIds = data.productIds ?? []
        provider = data.provider ?? 'gemini'
        types = data.types ?? ['text']
      }

      if (!aiJobId || !productIds?.length) return
      const runText = !types || types.includes('text')
      const runSpec = types?.includes('spec')
      const runPhoto = types?.includes('photo')

      await prisma.aiJob.update({
        where: { id: aiJobId },
        data: { status: JobStatus.RUNNING, startedAt: new Date() },
      })

      const estimatedCostPerProduct = runPhoto ? 0.15 : runSpec ? 0.08 : 0.05
      const estimatedCost = Math.ceil(productIds.length * estimatedCostPerProduct * 100) / 100
      const allowed = await canSpend(provider, estimatedCost)
      if (!allowed) {
        await prisma.aiJob.update({
          where: { id: aiJobId },
          data: {
            status: JobStatus.FAILED,
            completedAt: new Date(),
            errorLog: [
              {
                error:
                  'Budget limit reached (daily or monthly). Increase limit in AI Settings > التكاليف.',
                timestamp: new Date().toISOString(),
              },
            ] as object,
          },
        })
        return
      }

      let processed = 0
      let succeeded = 0
      let failed = 0
      const succeededProductIds: string[] = []
      const errorLog: Array<{ productId: string; error: string; timestamp: string }> = []

      const concurrency = getBackfillConcurrency()
      const batchDelayMs = getBackfillRateLimitMs()
      for (let i = 0; i < productIds.length; i++) {
        if (checkClosing()) {
          errorLog.push({
            productId: '',
            error: 'Worker shutdown (SIGTERM/SIGINT). Partial progress saved.',
            timestamp: new Date().toISOString(),
          })
          await prisma.aiJob.update({
            where: { id: aiJobId },
            data: {
              status: JobStatus.FAILED,
              processed,
              succeeded,
              failed,
              completedAt: new Date(),
              errorLog: errorLog.slice(-50) as object,
            },
          })
          return
        }
        if (i > 0 && i % concurrency === 0) {
          await new Promise((r) => setTimeout(r, batchDelayMs))
        }
        const productId = productIds[i]
        try {
          const product = await prisma.product.findUnique({
            where: { id: productId, deletedAt: null },
            include: {
              translations: { where: { deletedAt: null } },
              category: true,
              brand: true,
            },
          })

          if (!product) {
            failed++
            processed++
            errorLog.push({
              productId,
              error: 'Product not found',
              timestamp: new Date().toISOString(),
            })
            await job.updateProgress({ processed, total: productIds.length, succeeded, failed })
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

          if (runText) {
            try {
              const name = enTranslation?.name ?? product.sku ?? productId
              const category = product.category?.name ?? 'Equipment'
              const brand = product.brand?.name ?? ''
              const specs = (enTranslation?.specifications ?? null) as
                | Record<string, unknown>
                | undefined
              const existingDesc =
                enTranslation?.longDescription ?? enTranslation?.shortDescription ?? undefined

              let webResearchSpecs: Record<string, string> | undefined
              let webBoxContents: string[] | undefined
              let webHighlights: string[] | undefined
              let webSources: string[] | undefined
              if (isWebResearchAvailable() && (await canSpend(provider, 0.02))) {
                try {
                  const research = await researchProduct(name, brand, category)
                  if (research.specs && Object.keys(research.specs).length > 0) {
                    webResearchSpecs = research.specs
                    webBoxContents = research.boxContents?.length ? research.boxContents : undefined
                    webHighlights = research.marketingHighlights?.length
                      ? research.marketingHighlights
                      : undefined
                    webSources =
                      research.sources?.map((s) => s.provider + (s.url ? `:${s.url}` : '')) ??
                      undefined
                  }
                } catch {
                  // fallback without web research
                }
              }

              const masterInput = {
                name,
                brand,
                category,
                specifications: specs ?? undefined,
                existingDescription: existingDesc ?? undefined,
                ...(webResearchSpecs && {
                  webResearchSpecs,
                  webBoxContents,
                  webHighlights,
                  webSources,
                }),
              }

              const masterResult = await generateMasterFill(provider, masterInput)
              if (masterResult) {
                const draftData = {
                  generatedEnDescription: {
                    shortDescription: masterResult.short_desc_en,
                    longDescription: masterResult.long_desc_en,
                  },
                  seo: {
                    metaTitle: masterResult.seo_title_en,
                    metaDescription: masterResult.seo_desc_en,
                    metaKeywords: masterResult.seo_keywords_en,
                  },
                  seoByLocale: {
                    ar: {
                      metaTitle: masterResult.seo_title_ar,
                      metaDescription: masterResult.seo_desc_ar,
                      metaKeywords: masterResult.seo_keywords_ar,
                    },
                    zh: {
                      metaTitle: masterResult.seo_title_zh,
                      metaDescription: masterResult.seo_desc_zh,
                      metaKeywords: masterResult.seo_keywords_zh,
                    },
                  },
                  translations: {
                    ar: {
                      name: masterResult.name_ar,
                      shortDescription: masterResult.short_desc_ar,
                      longDescription: masterResult.long_desc_ar,
                      seoTitle: masterResult.seo_title_ar,
                      seoDescription: masterResult.seo_desc_ar,
                      seoKeywords: masterResult.seo_keywords_ar,
                    },
                    en: {
                      name,
                      shortDescription: masterResult.short_desc_en,
                      longDescription: masterResult.long_desc_en,
                      seoTitle: masterResult.seo_title_en,
                      seoDescription: masterResult.seo_desc_en,
                      seoKeywords: masterResult.seo_keywords_en,
                    },
                    zh: {
                      name: masterResult.name_zh,
                      shortDescription: masterResult.short_desc_zh,
                      longDescription: masterResult.long_desc_zh,
                      seoTitle: masterResult.seo_title_zh,
                      seoDescription: masterResult.seo_desc_zh,
                      seoKeywords: masterResult.seo_keywords_zh,
                    },
                  },
                  boxContents: masterResult.box_contents ?? undefined,
                  tags: masterResult.tags ?? undefined,
                }
                await prisma.aiContentDraft.create({
                  data: {
                    productId,
                    type: 'text',
                    suggestedData: JSON.parse(JSON.stringify(draftData)),
                    status: 'pending',
                  },
                })
              }
            } catch (textErr) {
              errorLog.push({
                productId,
                error: `Master fill: ${textErr instanceof Error ? textErr.message : String(textErr)}`,
                timestamp: new Date().toISOString(),
              })
            }
          }

          if (runPhoto) {
            try {
              const productForSourcing = {
                ...product,
                name:
                  enTranslation?.name ?? product.translations[0]?.name ?? product.sku ?? product.id,
              }
              const sourced = await sourceImages(productForSourcing, 4)
              if (sourced.length > 0) {
                const existingGallery = (product.galleryImages as string[] | null) ?? []
                const newUrls = sourced
                  .filter((s) => s.cloudinaryUrl)
                  .map((s) => s.cloudinaryUrl as string)
                const combined = [...existingGallery, ...newUrls].slice(0, 10)
                await prisma.aiContentDraft.create({
                  data: {
                    productId,
                    type: 'photo',
                    suggestedData: JSON.parse(JSON.stringify({ galleryImages: combined, sourced })),
                    status: 'pending',
                  },
                })
              }
            } catch (photoErr) {
              errorLog.push({
                productId,
                error: `Photo sourcing: ${photoErr instanceof Error ? photoErr.message : String(photoErr)}`,
                timestamp: new Date().toISOString(),
              })
            }
          }

          if (runSpec) {
            try {
              const specResult = await inferMissingSpecs(product)
              if (specResult.cost > 0) {
                await recordCost({
                  jobId: aiJobId,
                  feature: 'spec_inference',
                  costUsd: specResult.cost,
                })
              }
              const toMerge = specResult.specs.filter((s) => {
                const val = String(s.value ?? '').trim()
                return val !== '' && val.toLowerCase() !== 'unknown' && val.toLowerCase() !== 'n/a'
              })
              const firstTrans = product.translations[0]
              if (toMerge.length > 0 && firstTrans) {
                const current = (firstTrans.specifications as Record<string, unknown>) ?? {}
                const next = { ...current }
                for (const s of toMerge) {
                  if (current[s.key] == null || String(current[s.key]).trim() === '') {
                    next[s.key] = s.value
                  }
                }
                await prisma.aiContentDraft.create({
                  data: {
                    productId,
                    type: 'spec',
                    suggestedData: JSON.parse(
                      JSON.stringify({
                        specifications: next,
                        specResults: toMerge.map((s) => ({
                          key: s.key,
                          value: s.value,
                          confidence: s.confidence,
                        })),
                      })
                    ),
                    status: 'pending',
                  },
                })
              }
            } catch (specErr) {
              errorLog.push({
                productId,
                error: `Spec inference: ${specErr instanceof Error ? specErr.message : String(specErr)}`,
                timestamp: new Date().toISOString(),
              })
            }
          }

          await prisma.product.update({
            where: { id: productId },
            data: {
              lastAiRunAt: new Date(),
              aiRunCount: { increment: 1 },
              needsAiReview: true,
              aiReviewReason: 'AI content pending approval',
            },
          })

          succeeded++
          processed++
          succeededProductIds.push(productId)
        } catch (err) {
          failed++
          processed++
          const errorMessage = err instanceof Error ? err.message : String(err)
          errorLog.push({
            productId,
            error: errorMessage,
            timestamp: new Date().toISOString(),
          })
          try {
            await sendToDeadLetter({
              originalQueue: BACKFILL_QUEUE_NAME,
              originalJobId: aiJobId,
              productId,
              error: errorMessage,
              payload: { types, productIds: [productId] },
              failedAt: new Date().toISOString(),
            })
            console.error('[backfill.worker] Product sent to DLQ:', {
              productId,
              error: errorMessage,
            })
          } catch (dlqErr) {
            console.error('[backfill.worker] Failed to send to DLQ:', dlqErr)
          }
        }

        await job.updateProgress({ processed, total: productIds.length, succeeded, failed })
        await prisma.aiJob.update({
          where: { id: aiJobId },
          data: { processed, succeeded, failed, errorLog: errorLog.slice(-50) as object },
        })
      }

      await prisma.aiJob.update({
        where: { id: aiJobId },
        data: {
          status: failed === productIds.length ? JobStatus.FAILED : JobStatus.COMPLETED,
          processed,
          succeeded,
          failed,
          completedAt: new Date(),
          errorLog: errorLog.length ? (errorLog.slice(-50) as object) : undefined,
        },
      })

      if (succeededProductIds.length > 0) {
        try {
          await rebuildRelatedProducts(succeededProductIds, 5)
        } catch (e) {
          console.error('[backfill.worker] rebuildRelatedProducts failed:', e)
        }
      }

      try {
        await captureQualitySnapshot()
      } catch (e) {
        console.error('[BackfillWorker] captureQualitySnapshot failed:', e)
      }
    },
    {
      connection: getRedisClient(),
      concurrency: 1,
    }
  )

  worker.on('failed', async (job, err) => {
    if (job?.data?.aiJobId) {
      await prisma.aiJob.update({
        where: { id: job.data.aiJobId },
        data: {
          status: JobStatus.FAILED,
          completedAt: new Date(),
          errorLog: [
            { error: err?.message ?? 'Worker failed', timestamp: new Date().toISOString() },
          ] as object,
        },
      })
    }
  })

  return worker
}

let backfillWorkerInstance: Worker | null = null

function gracefulShutdown(): void {
  isClosing = true
  if (backfillWorkerInstance) {
    backfillWorkerInstance
      .close()
      .then(() => {
        console.info('[backfill.worker] Closed gracefully')
        process.exit(0)
      })
      .catch((err) => {
        console.error('[backfill.worker] Error during close:', err)
        process.exit(1)
      })
  } else {
    process.exit(0)
  }
}

process.on('SIGTERM', gracefulShutdown)
process.on('SIGINT', gracefulShutdown)

export function getBackfillWorker(): Worker {
  if (!backfillWorkerInstance) {
    backfillWorkerInstance = createBackfillWorker()
  }
  return backfillWorkerInstance
}
