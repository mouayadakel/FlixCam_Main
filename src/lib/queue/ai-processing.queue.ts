/**
 * @file ai-processing.queue.ts
 * @description BullMQ queue for AI processing jobs
 * @module lib/queue
 */

import { Queue } from 'bullmq'
import { getRedisClient } from './redis.client'

export const AI_PROCESSING_QUEUE_NAME = 'ai-processing'

/**
 * AI processing queue
 */
export const aiProcessingQueue = new Queue(AI_PROCESSING_QUEUE_NAME, {
  connection: getRedisClient(),
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 5000,
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
 * Add AI processing job to queue
 */
export async function addAIProcessingJob(
  importJobId: string,
  productIds: string[],
  provider?: 'openai' | 'gemini'
) {
  return await aiProcessingQueue.add(
    'process-ai',
    {
      importJobId,
      productIds,
      provider,
    },
    {
      jobId: `ai-${importJobId}`,
      priority: 2,
    }
  )
}
