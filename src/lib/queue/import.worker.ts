/**
 * @file import.worker.ts
 * @description BullMQ worker for processing import jobs
 * @module lib/queue
 */

import { Worker, Job } from 'bullmq'
import { getRedisClient } from './redis.client'
import { IMPORT_QUEUE_NAME } from './import.queue'
import { processImportJob } from '@/lib/services/import-worker'

/**
 * Create import worker
 * Processes import jobs from the queue
 */
export function createImportWorker() {
  const worker = new Worker(
    IMPORT_QUEUE_NAME,
    async (job: Job) => {
      const { jobId } = job.data as { jobId: string }
      
      // Update job progress
      await job.updateProgress(0)
      
      try {
        // Process the import job
        await processImportJob(jobId)
        
        // Mark as complete
        await job.updateProgress(100)
        
        return { success: true, jobId }
      } catch (error: any) {
        console.error(`Import job ${jobId} failed:`, error)
        throw error
      }
    },
    {
      connection: getRedisClient(),
      concurrency: 10, // Process up to 10 imports concurrently
      limiter: {
        max: 10,
        duration: 1000,
      },
    }
  )

  worker.on('completed', (job) => {
    console.log(`Import job ${job.id} completed`)
  })

  worker.on('failed', (job, err) => {
    console.error(`Import job ${job?.id} failed:`, err)
  })

  worker.on('error', (err) => {
    console.error('Import worker error:', err)
  })

  return worker
}

// Create worker instance (singleton)
let importWorkerInstance: Worker | null = null

/**
 * Get or create import worker instance
 */
export function getImportWorker(): Worker {
  if (!importWorkerInstance) {
    importWorkerInstance = createImportWorker()
  }
  return importWorkerInstance
}
