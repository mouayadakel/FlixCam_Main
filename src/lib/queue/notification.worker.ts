/**
 * BullMQ worker — durable notification delivery.
 */

import { Worker, Job } from 'bullmq'
import { getRedisClient } from './redis.client'
import { sendQueuedNotification } from '@/lib/services/notification-queue.service'
import { sendToDeadLetter } from './dead-letter.queue'
import type { NotificationJobData } from './notification.queue'
import { NOTIFICATION_QUEUE_NAME } from './notification.queue'

let isClosing = false

export function getNotificationWorker(): Worker {
  const worker = new Worker(
    NOTIFICATION_QUEUE_NAME,
    async (job: Job<NotificationJobData>) => {
      if (isClosing) return
      await sendQueuedNotification(job.data)
    },
    {
      connection: getRedisClient(),
      concurrency: Number(process.env.NOTIFICATION_WORKER_CONCURRENCY || 5),
    }
  )

  worker.on('failed', async (job, err) => {
    if (!job || job.attemptsMade < (job.opts.attempts ?? 4)) return
    await sendToDeadLetter({
      originalQueue: NOTIFICATION_QUEUE_NAME,
      originalJobId: job.id ?? 'unknown',
      error: err.message,
      payload: job.data,
      failedAt: new Date().toISOString(),
    }).catch(() => undefined)
  })

  return worker
}

export function closeNotificationWorker(worker: Worker): Promise<void> {
  isClosing = true
  return worker.close()
}
