/**
 * @file import.queue.ts
 * @description BullMQ queue setup for product import jobs
 * @module lib/queue
 */

import { Queue } from 'bullmq'
import { getRedisClient } from './redis.client'

export const IMPORT_QUEUE_NAME = 'product-import'

let _importQueue: Queue | null = null

/** Lazily create the import queue so Redis is not contacted at import time (build safety). */
function getImportQueue(): Queue {
  if (!_importQueue) {
    _importQueue = new Queue(IMPORT_QUEUE_NAME, {
      connection: getRedisClient(),
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 2000,
        },
        removeOnComplete: {
          age: 24 * 3600,
          count: 1000,
        },
        removeOnFail: {
          age: 7 * 24 * 3600,
        },
      },
    })
  }
  return _importQueue
}

/**
 * Add import job to queue
 */
export type ApprovedSuggestion = {
  sheetName: string
  excelRowNumber: number
  aiSuggestions: {
    translations?: Record<
      string,
      { name: string; shortDescription: string; longDescription: string }
    >
    seo?: { metaTitle: string; metaDescription: string; metaKeywords: string }
    seoByLocale?: {
      ar?: { metaTitle: string; metaDescription: string; metaKeywords: string }
      zh?: { metaTitle: string; metaDescription: string; metaKeywords: string }
    }
    specifications?: Record<string, unknown>
    boxContents?: string
    tags?: string
    confidence?: number
  }
}

export async function addImportJob(
  jobId: string,
  data: {
    mapping: any[]
    selectedSheets?: string[]
    selectedRows?: number[] | Record<string, number[]>
    approvedSuggestions?: ApprovedSuggestion[]
  }
) {
  return await getImportQueue().add(
    'process-import',
    {
      jobId,
      ...data,
    },
    {
      jobId,
      priority: 1,
    }
  )
}

/**
 * Get job status from queue
 */
export async function getImportJobStatus(jobId: string) {
  const job = await getImportQueue().getJob(jobId)
  if (!job) {
    return null
  }

  const state = await job.getState()
  const progress = job.progress
  const returnValue = job.returnvalue
  const failedReason = job.failedReason

  return {
    id: job.id,
    state,
    progress,
    returnValue,
    failedReason,
    processedOn: job.processedOn,
    finishedOn: job.finishedOn,
  }
}

/**
 * Cancel import job
 */
export async function cancelImportJob(jobId: string) {
  const job = await getImportQueue().getJob(jobId)
  if (job) {
    await job.remove()
    return true
  }
  return false
}
