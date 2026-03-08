/**
 * @file image-processing.worker.ts
 * @description BullMQ worker for image processing
 * @module lib/queue
 */

import { Worker, Job } from 'bullmq'
import { getRedisClient } from './redis.client'
import { prisma } from '@/lib/db/prisma'
import { processImageFromUrl, processImagesBatch } from '@/lib/services/image-processing.service'

export const IMAGE_PROCESSING_QUEUE_NAME = 'image-processing'

/**
 * Create image processing worker
 */
export function createImageProcessingWorker() {
  const worker = new Worker(
    IMAGE_PROCESSING_QUEUE_NAME,
    async (job: Job) => {
      const { importJobId, productIds } = job.data as {
        importJobId: string
        productIds: string[]
      }

      await job.updateProgress(0)

      try {
        // Update import job status
        await prisma.importJob.update({
          where: { id: importJobId },
          data: { imageProcessingStatus: 'processing' },
        })

        let processed = 0
        let failed = 0

        // Process each product
        for (let i = 0; i < productIds.length; i++) {
          const productId = productIds[i]

          try {
            // Get product
            const product = await prisma.product.findUnique({
              where: { id: productId },
            })

            if (!product) {
              failed++
              continue
            }

            // Process featured image
            if (product.featuredImage && product.featuredImage.startsWith('http')) {
              const result = await processImageFromUrl(product.featuredImage, 'products')

              if (result.success) {
                await prisma.product.update({
                  where: { id: productId },
                  data: { featuredImage: result.url },
                })
              }
            }

            // Process gallery images
            if (product.galleryImages) {
              const galleryImages = product.galleryImages as string[]
              if (Array.isArray(galleryImages) && galleryImages.length > 0) {
                const imageUrls = galleryImages.filter(
                  (url) => typeof url === 'string' && url.startsWith('http')
                )

                if (imageUrls.length > 0) {
                  const results = await processImagesBatch(imageUrls, 'products')
                  const processedUrls = results.map((r) => r.url)

                  await prisma.product.update({
                    where: { id: productId },
                    data: { galleryImages: processedUrls },
                  })
                }
              }
            }

            processed++
          } catch (error: any) {
            console.error(`Image processing failed for product ${productId}:`, error)
            failed++
          }

          // Update progress
          await job.updateProgress(Math.round(((i + 1) / productIds.length) * 100))
        }

        // Update import job status
        await prisma.importJob.update({
          where: { id: importJobId },
          data: { imageProcessingStatus: 'completed' },
        })

        await job.updateProgress(100)

        return {
          success: true,
          importJobId,
          processed,
          failed,
        }
      } catch (error: any) {
        console.error(`Image processing job ${importJobId} failed:`, error)

        // Update import job status
        await prisma.importJob.update({
          where: { id: importJobId },
          data: { imageProcessingStatus: 'failed' },
        })

        throw error
      }
    },
    {
      connection: getRedisClient(),
      concurrency: 5, // Process 5 image jobs concurrently
      limiter: {
        max: 10,
        duration: 1000,
      },
    }
  )

  worker.on('completed', (job) => {
    console.log(`Image processing job ${job.id} completed`)
  })

  worker.on('failed', (job, err) => {
    console.error(`Image processing job ${job?.id} failed:`, err)
  })

  worker.on('error', (err) => {
    console.error('Image processing worker error:', err)
  })

  return worker
}

// Create worker instance (singleton)
let imageWorkerInstance: Worker | null = null

/**
 * Get or create image processing worker instance
 */
export function getImageProcessingWorker(): Worker {
  if (!imageWorkerInstance) {
    imageWorkerInstance = createImageProcessingWorker()
  }
  return imageWorkerInstance
}
