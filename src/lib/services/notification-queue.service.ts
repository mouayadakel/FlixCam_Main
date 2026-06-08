/**
 * Async Notification Queue Service – decouples notification sending from request handlers.
 * Uses BullMQ when Redis is available; falls back to in-process queue.
 */

import { prisma } from '@/lib/db/prisma'
import {
  addNotificationJob,
  isBullMqNotificationsEnabled,
} from '@/lib/queue/notification.queue'
import { NotificationChannel as PrismaChannel } from '@prisma/client'
import { EmailService } from '@/lib/services/email.service'
import { SmsService } from '@/lib/services/sms.service'
import { WhatsAppService } from '@/lib/services/whatsapp.service'
import { PushService } from '@/lib/services/push.service'

export type NotificationChannel = 'email' | 'sms' | 'whatsapp' | 'push'
export type NotificationPriority = 'high' | 'normal' | 'low'

export interface QueuedNotification {
  id: string
  channel: NotificationChannel
  recipient: string
  subject?: string
  body: string
  templateId?: string
  templateData?: Record<string, unknown>
  priority: NotificationPriority
  scheduledAt?: Date
  createdAt: Date
  attempts: number
  lastError?: string
  recipientUserId?: string
}

async function isChannelEnabled(queueChannel: NotificationChannel): Promise<boolean> {
  const map: Record<NotificationChannel, PrismaChannel | null> = {
    email: PrismaChannel.EMAIL,
    sms: PrismaChannel.SMS,
    whatsapp: PrismaChannel.WHATSAPP,
    push: null,
  }
  const channel = map[queueChannel]
  if (!channel) return true
  const config = await prisma.messagingChannelConfig.findUnique({ where: { channel } })
  return config?.isEnabled ?? true
}

const queue: QueuedNotification[] = []
let processing = false
const MAX_RETRIES = 3
const BATCH_SIZE = 10
const PROCESS_INTERVAL_MS = 2000

/**
 * Enqueue a notification for async delivery.
 */
export function enqueueNotification(params: {
  channel: NotificationChannel
  recipient: string
  subject?: string
  body: string
  templateId?: string
  templateData?: Record<string, unknown>
  priority?: NotificationPriority
  scheduledAt?: Date
  recipientUserId?: string
}): string {
  const id = `notif_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const notification: QueuedNotification = {
    id,
    channel: params.channel,
    recipient: params.recipient,
    subject: params.subject,
    body: params.body,
    templateId: params.templateId,
    templateData: params.templateData,
    priority: params.priority ?? 'normal',
    scheduledAt: params.scheduledAt,
    createdAt: new Date(),
    attempts: 0,
    recipientUserId: params.recipientUserId,
  }

  if (isBullMqNotificationsEnabled()) {
    const delay = params.scheduledAt
      ? Math.max(0, params.scheduledAt.getTime() - Date.now())
      : undefined
    void addNotificationJob(
      {
        id: notification.id,
        channel: notification.channel,
        recipient: notification.recipient,
        subject: notification.subject,
        body: notification.body,
        templateId: notification.templateId,
        templateData: notification.templateData,
        priority: notification.priority,
        recipientUserId: notification.recipientUserId,
      },
      { delay }
    ).catch((err) => {
      console.error('[NotificationQueue] BullMQ enqueue failed, using memory fallback', err)
      pushToMemoryQueue(notification)
    })
    return id
  }

  pushToMemoryQueue(notification)
  return id
}

function pushToMemoryQueue(notification: QueuedNotification) {
  if (notification.priority === 'high') {
    queue.unshift(notification)
  } else {
    queue.push(notification)
  }
  if (!processing) scheduleProcessing()
}

/**
 * Get current queue stats.
 */
export function getQueueStats() {
  return {
    mode: isBullMqNotificationsEnabled() ? 'bullmq' : 'memory',
    pending: queue.length,
    highPriority: queue.filter((n) => n.priority === 'high').length,
    normalPriority: queue.filter((n) => n.priority === 'normal').length,
    lowPriority: queue.filter((n) => n.priority === 'low').length,
  }
}

function scheduleProcessing() {
  setTimeout(processQueue, PROCESS_INTERVAL_MS)
}

/**
 * Process up to `limit` queued notifications (for cron / worker batch drain).
 */
export async function processNotificationQueueBatch(limit = 50): Promise<number> {
  if (queue.length === 0) return 0

  let processed = 0
  const now = new Date()

  while (processed < limit && queue.length > 0) {
    const batch = queue.filter((n) => !n.scheduledAt || n.scheduledAt <= now).slice(0, BATCH_SIZE)
    if (batch.length === 0) break

    for (const notification of batch) {
      if (processed >= limit) break
      try {
        await sendNotification(notification)
        const idx = queue.indexOf(notification)
        if (idx !== -1) queue.splice(idx, 1)
        processed++
      } catch (error) {
        notification.attempts++
        notification.lastError = error instanceof Error ? error.message : 'Unknown error'
        if (notification.attempts >= MAX_RETRIES) {
          const idx = queue.indexOf(notification)
          if (idx !== -1) queue.splice(idx, 1)
          try {
            await prisma.auditLog.create({
              data: {
                action: 'NOTIFICATION_FAILED',
                resourceType: 'Notification',
                resourceId: notification.id,
                metadata: {
                  channel: notification.channel,
                  recipient: notification.recipient,
                  error: notification.lastError,
                  attempts: notification.attempts,
                },
              },
            })
          } catch {
            // ignore
          }
        }
      }
    }
  }

  return processed
}

async function processQueue() {
  if (processing || queue.length === 0) return
  processing = true

  try {
    const now = new Date()
    const batch = queue.filter((n) => !n.scheduledAt || n.scheduledAt <= now).slice(0, BATCH_SIZE)

    for (const notification of batch) {
      try {
        await sendNotification(notification)
        // Remove from queue on success
        const idx = queue.indexOf(notification)
        if (idx !== -1) queue.splice(idx, 1)
      } catch (error) {
        notification.attempts++
        notification.lastError = error instanceof Error ? error.message : 'Unknown error'

        if (notification.attempts >= MAX_RETRIES) {
          // Move to dead letter (log and remove)
          console.error(
            `[NotificationQueue] Failed after ${MAX_RETRIES} attempts:`,
            notification.id,
            notification.lastError
          )
          const idx = queue.indexOf(notification)
          if (idx !== -1) queue.splice(idx, 1)

          // Persist failure to DB for admin review
          try {
            await prisma.auditLog.create({
              data: {
                action: 'NOTIFICATION_FAILED',
                resourceType: 'Notification',
                resourceId: notification.id,
                metadata: {
                  channel: notification.channel,
                  recipient: notification.recipient,
                  error: notification.lastError,
                  attempts: notification.attempts,
                },
              },
            })
          } catch {
            // Audit log failure should not crash the queue
          }
        }
      }
    }
  } finally {
    processing = false
    if (queue.length > 0) scheduleProcessing()
  }
}

/** Send one notification (used by in-memory processor and BullMQ worker). */
export async function sendQueuedNotification(
  notification: Pick<
    QueuedNotification,
    | 'channel'
    | 'recipient'
    | 'subject'
    | 'body'
    | 'templateId'
    | 'templateData'
    | 'recipientUserId'
  >
): Promise<void> {
  await sendNotification(notification as QueuedNotification)
}

async function sendNotification(notification: QueuedNotification): Promise<void> {
  const enabled = await isChannelEnabled(notification.channel)
  if (!enabled) return

  switch (notification.channel) {
    case 'email':
      await EmailService.send({
        to: notification.recipient,
        subject: notification.subject ?? 'Notification',
        html: notification.body.replace(/\n/g, '<br>'),
        recipientUserId: notification.recipientUserId,
        templateId: notification.templateId,
        logToMessageLog: true,
      })
      break
    case 'sms':
      await SmsService.sendSmsText(notification.recipient, notification.body, {
        recipientUserId: notification.recipientUserId,
        templateId: notification.templateId,
        logToMessageLog: true,
      })
      break
    case 'whatsapp':
      await WhatsAppService.sendWhatsAppText(notification.recipient, notification.body, {
        recipientUserId: notification.recipientUserId,
        templateId: notification.templateId,
        logToMessageLog: true,
      })
      break
    case 'push':
      if (notification.recipientUserId) {
        await PushService.sendToUser(
          notification.recipientUserId,
          notification.subject ?? 'FlixCam Notification',
          notification.body,
          notification.templateData as Record<string, string>
        )
      } else {
        throw new Error('recipientUserId is required for push notifications')
      }
      break
    default:
      throw new Error(`Unsupported channel: ${notification.channel}`)
  }
}
