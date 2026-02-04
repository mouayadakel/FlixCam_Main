/**
 * @file import.queue.ts
 * @description BullMQ queue setup for product import jobs
 * @module lib/queue
 */

import { Queue } from 'bullmq'
import { getRedisClient } from './redis.client'

export const IMPORT_QUEUE_NAME = 'product-import'

/**
 * Import job queue configuration
 */
export const importQueue = new Queue(IMPORT_QUEUE_NAME, {
  connection: getRedisClient(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000, // Keep last 1000 completed jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
    },
  },
})

/**
 * Add import job to queue
 */
export async function addImportJob(
  jobId: string,
  data: {
    fileBuffer: Buffer
    mapping: any[]
    selectedSheets?: string[]
    selectedRows?: number[] | Record<string, number[]>
  }
) {
  return await importQueue.add('process-import', {
    jobId,
    ...data,
  }, {
    jobId, // Use import job ID as BullMQ job ID for easy lookup
    priority: 1,
  })
}

/**
 * Get job status from queue
 */
export async function getImportJobStatus(jobId: string) {
  const job = await importQueue.getJob(jobId)
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
  const job = await importQueue.getJob(jobId)
  if (job) {
    await job.remove()
    return true
  }
  return false
}
