/**
 * @file dead-letter.queue.ts
 * @description Queue for permanently failed backfill jobs; admin reviews manually.
 * @module lib/queue
 */

import { Queue } from 'bullmq'
import { getRedisClient } from './redis.client'

export const DEAD_LETTER_QUEUE_NAME = 'dead-letter'

let _deadLetterQueue: Queue | null = null

/** Lazily create the dead-letter queue so Redis is not contacted at import time. */
function getDeadLetterQueue(): Queue {
  if (!_deadLetterQueue) {
    _deadLetterQueue = new Queue(DEAD_LETTER_QUEUE_NAME, {
      connection: getRedisClient(),
      defaultJobOptions: {
        removeOnComplete: false,
        removeOnFail: false,
      },
    })
  }
  return _deadLetterQueue
}

export interface DeadLetterJobData {
  originalQueue: string
  originalJobId: string
  productId?: string
  productIds?: string[]
  error: string
  payload: unknown
  failedAt: string
}

/**
 * Add a failed job to the dead-letter queue for later review.
 */
export async function sendToDeadLetter(data: DeadLetterJobData): Promise<string> {
  const job = await getDeadLetterQueue().add('dlq-item', data, {
    jobId: `dlq-${data.originalJobId}-${Date.now()}`,
  })
  return job.id ?? ''
}
