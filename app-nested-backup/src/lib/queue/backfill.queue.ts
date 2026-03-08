/**
 * @file backfill.queue.ts
 * @description BullMQ queue for content backfill jobs (AI fill for products with gaps)
 * @module lib/queue
 */

import { Queue } from 'bullmq'
import { getRedisClient } from './redis.client'
import { prisma } from '@/lib/db/prisma'
import { AiJobType, JobStatus } from '@prisma/client'

export const BACKFILL_QUEUE_NAME = 'backfill'

let _backfillQueue: Queue | null = null

/** Lazily create the BullMQ queue so Redis is not contacted at import time (build safety). */
export function getBackfillQueue(): Queue {
  if (!_backfillQueue) {
    _backfillQueue = new Queue(BACKFILL_QUEUE_NAME, {
      connection: getRedisClient(),
      defaultJobOptions: {
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: {
          age: 24 * 3600,
          count: 100,
        },
        removeOnFail: {
          age: 7 * 24 * 3600,
          count: 50,
        },
      },
    })
  }
  return _backfillQueue
}

export interface BackfillJobData {
  aiJobId: string
  productIds: string[]
  types?: Array<'text' | 'photo' | 'spec'>
  createdBy?: string
  provider?: 'openai' | 'gemini'
  /** When true, create AiContentDraft instead of writing to Product (preview workflow) */
  previewMode?: boolean
}

export type BackfillTrigger =
  | 'manual'
  | 'cron'
  | 'scan'
  | 'single'
  | 'event'
  | 'scheduled'
  | 'import'

/**
 * Add a backfill job to the queue and create AiJob record (new schema: AiJobType, JobStatus, totalItems).
 */
export async function addBackfillJob(
  productIds: string[],
  options?: {
    types?: Array<'text' | 'photo' | 'spec'>
    trigger?: BackfillTrigger
    triggeredBy?: string
    createdBy?: string
    provider?: 'openai' | 'gemini'
    forceReprocess?: boolean
    previewMode?: boolean
  }
): Promise<{ jobId: string; queued: number; estimatedMinutes: number }> {
  if (productIds.length === 0) {
    return { jobId: '', queued: 0, estimatedMinutes: 0 }
  }

  const types = options?.types ?? ['text']
  const trigger = options?.trigger ?? 'manual'
  const triggeredByUserId = options?.triggeredBy ?? options?.createdBy

  const jobType: AiJobType =
    types.length === 3
      ? AiJobType.FULL_BACKFILL
      : types.includes('photo')
        ? AiJobType.PHOTO_BACKFILL
        : types.includes('spec')
          ? AiJobType.SPEC_BACKFILL
          : AiJobType.TEXT_BACKFILL

  const aiJob = await prisma.aiJob.create({
    data: {
      type: jobType,
      status: JobStatus.PENDING,
      triggeredBy: trigger,
      totalItems: productIds.length,
      metadata: triggeredByUserId ? { triggeredBy: triggeredByUserId } : undefined,
    },
  })

  await prisma.aiJobItem.createMany({
    data: productIds.map((productId) => ({
      jobId: aiJob.id,
      productId,
      itemType: types.join(','),
      status: 'pending',
    })),
  })

  await getBackfillQueue().add(
    'backfill-products',
    {
      aiJobId: aiJob.id,
      productIds,
      types,
      createdBy: triggeredByUserId ?? options?.createdBy,
      provider: options?.provider,
      previewMode: options?.previewMode,
    } satisfies BackfillJobData,
    {
      jobId: aiJob.id,
      priority: 1,
    }
  )

  const estimatedMinutes = Math.max(1, Math.ceil(productIds.length / 5))
  return {
    jobId: aiJob.id,
    queued: productIds.length,
    estimatedMinutes,
  }
}
