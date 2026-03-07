/**
 * @file ai-processing.queue.ts
 * @description BullMQ queue for AI processing jobs
 * @module lib/queue
 */

import { Queue } from 'bullmq'
import { getRedisClient } from './redis.client'

export const AI_PROCESSING_QUEUE_NAME = 'ai-processing'

let _aiProcessingQueue: Queue | null = null

/** Lazily create the AI processing queue so Redis is not contacted at import time. */
function getAIProcessingQueue(): Queue {
  if (!_aiProcessingQueue) {
    _aiProcessingQueue = new Queue(AI_PROCESSING_QUEUE_NAME, {
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
  }
  return _aiProcessingQueue
}

/**
 * Check if any worker is actively consuming the AI processing queue.
 * Returns false if no workers are connected (meaning jobs would sit idle).
 */
export async function hasActiveWorkers(): Promise<boolean> {
  try {
    const queue = getAIProcessingQueue()
    const workers = await queue.getWorkers()
    return workers.length > 0
  } catch {
    return false
  }
}

/**
 * Add AI processing job to queue.
 * Throws if no workers are connected so callers can fall back to synchronous processing.
 */
export async function addAIProcessingJob(
  importJobId: string,
  productIds: string[],
  provider?: 'openai' | 'gemini'
) {
  const workersActive = await hasActiveWorkers()
  if (!workersActive) {
    throw new Error('No AI processing workers connected — falling back to synchronous processing')
  }

  return await getAIProcessingQueue().add(
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
