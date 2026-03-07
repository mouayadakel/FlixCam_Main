/**
 * Async Notification Queue Service – decouples notification sending from request handlers.
 * Uses an in-process queue with configurable batch processing.
 * For production scale, swap the in-memory queue for Redis/BullMQ.
 */

import { prisma } from '@/lib/db/prisma'
import { NotificationChannel as PrismaChannel } from '@prisma/client'
import { EmailService } from '@/lib/services/email.service'
import { SmsService } from '@/lib/services/sms.service'
import { WhatsAppService } from '@/lib/services/whatsapp.service'

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

  // Insert by priority: high first
  if (notification.priority === 'high') {
    queue.unshift(notification)
  } else {
    queue.push(notification)
  }

  // Trigger processing if not already running
  if (!processing) {
    scheduleProcessing()
  }

  return id
}

/**
 * Get current queue stats.
 */
export function getQueueStats() {
  return {
    pending: queue.length,
    highPriority: queue.filter((n) => n.priority === 'high').length,
    normalPriority: queue.filter((n) => n.priority === 'normal').length,
    lowPriority: queue.filter((n) => n.priority === 'low').length,
  }
}

function scheduleProcessing() {
  setTimeout(processQueue, PROCESS_INTERVAL_MS)
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
      // Push not implemented
      break
    default:
      throw new Error(`Unsupported channel: ${notification.channel}`)
  }
}
