/**
 * @file image-processing.queue.ts
 * @description BullMQ queue for image processing jobs
 * @module lib/queue
 */

import { Queue } from 'bullmq'
import { getRedisClient } from './redis.client'

export const IMAGE_PROCESSING_QUEUE_NAME = 'image-processing'

let _imageProcessingQueue: Queue | null = null

/** Lazily create the image processing queue so Redis is not contacted at import time. */
function getImageProcessingQueue(): Queue {
  if (!_imageProcessingQueue) {
    _imageProcessingQueue = new Queue(IMAGE_PROCESSING_QUEUE_NAME, {
      connection: getRedisClient(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 3000,
        },
        removeOnComplete: {
          age: 24 * 3600,
          count: 500,
        },
        removeOnFail: {
          age: 7 * 24 * 3600,
        },
      },
    })
  }
  return _imageProcessingQueue
}

/**
 * Add image processing job to queue
 */
export async function addImageProcessingJob(importJobId: string, productIds: string[]) {
  return await getImageProcessingQueue().add(
    'process-images',
    {
      importJobId,
      productIds,
    },
    {
      jobId: `images-${importJobId}`,
      priority: 3,
    }
  )
}
