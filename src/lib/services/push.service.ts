/**
 * @file push.service.ts
 * @description Push Notification Service integration
 * @module lib/services/push
 */

import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'

export class PushService {
  /**
   * Register a new device token for a user
   */
  static async registerDeviceToken(userId: string, token: string, platform?: string): Promise<void> {
    try {
      await prisma.deviceToken.upsert({
        where: { token },
        update: {
          userId,
          platform,
          updatedAt: new Date(),
        },
        create: {
          userId,
          token,
          platform,
        },
      })
    } catch (error) {
      logger.error('Failed to register device token', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      })
      throw error
    }
  }

  /**
   * Remove a device token (e.g. on logout or token expiration)
   */
  static async removeDeviceToken(token: string): Promise<void> {
    try {
      await prisma.deviceToken.deleteMany({
        where: { token },
      })
    } catch (error) {
      logger.error('Failed to remove device token', {
        error: error instanceof Error ? error.message : String(error),
      })
    }
  }

  /**
   * Send a push notification to a specific user
   */
  static async sendToUser(userId: string, title: string, body: string, data?: Record<string, string>): Promise<void> {
    const tokens = await prisma.deviceToken.findMany({
      where: { userId },
      select: { token: true },
    })

    if (tokens.length === 0) {
      logger.info('No device tokens found for user, skipping push notification', { userId })
      return
    }

    const { sendPushToUser } = await import('@/lib/push/send-push')
    const result = await sendPushToUser(userId, {
      title,
      body,
      url: data?.url,
      tag: data?.tag,
    })

    if (result.skipped) {
      logger.info('Push skipped (VAPID not configured)', {
        userId,
        tokenCount: tokens.length,
      })
      return
    }

    logger.info('Web push notification sent', {
      userId,
      sent: result.sent,
      failed: result.failed,
    })
  }
}
