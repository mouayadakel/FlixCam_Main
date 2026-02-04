/**
 * @file image-processing.queue.ts
 * @description BullMQ queue for image processing jobs
 * @module lib/queue
 */

import { Queue } from 'bullmq'
import { getRedisClient } from './redis.client'

export const IMAGE_PROCESSING_QUEUE_NAME = 'image-processing'

/**
 * Image processing queue
 */
export const imageProcessingQueue = new Queue(IMAGE_PROCESSING_QUEUE_NAME, {
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

/**
 * Add image processing job to queue
 */
export async function addImageProcessingJob(importJobId: string, productIds: string[]) {
  return await imageProcessingQueue.add(
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
