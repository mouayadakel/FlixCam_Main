/**
 * BullMQ queue for durable notification delivery.
 */

import { Queue } from 'bullmq'
import { getRedisClient } from './redis.client'
import type { NotificationChannel, NotificationPriority } from '@/lib/services/notification-queue.service'

export const NOTIFICATION_QUEUE_NAME = 'notifications'

let _queue: Queue | null = null

export interface NotificationJobData {
  id: string
  channel: NotificationChannel
  recipient: string
  subject?: string
  body: string
  templateId?: string
  templateData?: Record<string, unknown>
  priority: NotificationPriority
  recipientUserId?: string
}

export function getNotificationQueue(): Queue {
  if (!_queue) {
    _queue = new Queue(NOTIFICATION_QUEUE_NAME, {
      connection: getRedisClient(),
      defaultJobOptions: {
        attempts: 4,
        backoff: { type: 'exponential', delay: 15_000 },
        removeOnComplete: { age: 24 * 3600, count: 500 },
        removeOnFail: { age: 7 * 24 * 3600, count: 200 },
      },
    })
  }
  return _queue
}

export function isBullMqNotificationsEnabled(): boolean {
  if (process.env.NOTIFICATION_QUEUE_MODE === 'memory') return false
  if (process.env.NOTIFICATION_QUEUE_MODE === 'bullmq') return true
  return Boolean(process.env.REDIS_URL?.trim())
}

export async function addNotificationJob(
  data: NotificationJobData,
  opts?: { delay?: number }
): Promise<void> {
  const priority =
    data.priority === 'high' ? 1 : data.priority === 'low' ? 3 : 2

  await getNotificationQueue().add('send', data, {
    jobId: data.id,
    priority,
    delay: opts?.delay,
  })
}
