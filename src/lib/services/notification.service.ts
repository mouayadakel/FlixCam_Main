/**
 * @file notification.service.ts
 * @description Multi-channel notification service
 * @module lib/services/notification
 */

import { prisma } from '@/lib/db/prisma'
import { NotificationChannel } from '@prisma/client'

export interface SendNotificationInput {
  userId?: string
  channel: NotificationChannel
  type: string
  title: string
  message: string
  data?: Record<string, any>
}

export interface NotificationTemplate {
  type: string
  title: string
  message: string
  channels: NotificationChannel[]
}

export class NotificationService {
  /**
   * Send notification via specified channel
   */
  static async send(input: SendNotificationInput) {
    // Create notification record
    const notification = await prisma.notification.create({
      data: {
        userId: input.userId,
        channel: input.channel,
        type: input.type,
        title: input.title,
        message: input.message,
        data: input.data || {},
      },
    })

    // Send via appropriate channel
    switch (input.channel) {
      case NotificationChannel.IN_APP:
        // Already stored in database
        break
      case NotificationChannel.EMAIL:
        await this.sendEmail(input)
        break
      case NotificationChannel.WHATSAPP:
        await this.sendWhatsApp(input)
        break
      case NotificationChannel.SMS:
        // Phase 2
        break
    }

    return notification
  }

  /**
   * Send notification to multiple channels
   */
  static async sendMultiChannel(
    input: Omit<SendNotificationInput, 'channel'>,
    channels: NotificationChannel[]
  ) {
    const notifications = await Promise.all(
      channels.map((channel) =>
        this.send({
          ...input,
          channel,
        })
      )
    )

    return notifications
  }

  /**
   * Send notification using template
   */
  static async sendTemplate(
    templateType: string,
    userId: string | undefined,
    data: Record<string, any>,
    channels?: NotificationChannel[]
  ) {
    const template = this.getTemplate(templateType, data)
    const targetChannels = channels || template.channels

    return this.sendMultiChannel(
      {
        userId,
        type: templateType,
        title: template.title,
        message: template.message,
        data,
      },
      targetChannels
    )
  }

  /**
   * Get notification template
   */
  static getTemplate(
    type: string,
    data: Record<string, any>
  ): NotificationTemplate {
    const templates: Record<string, NotificationTemplate> = {
      'booking.confirmed': {
        type: 'booking.confirmed',
        title: 'Booking Confirmed',
        message: `Your booking #${data.bookingNumber || 'N/A'} has been confirmed.`,
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      },
      'booking.cancelled': {
        type: 'booking.cancelled',
        title: 'Booking Cancelled',
        message: `Your booking #${data.bookingNumber || 'N/A'} has been cancelled.`,
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      },
      'payment.success': {
        type: 'payment.success',
        title: 'Payment Successful',
        message: `Your payment of ${data.amount || 'N/A'} has been processed successfully.`,
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      },
      'payment.failed': {
        type: 'payment.failed',
        title: 'Payment Failed',
        message: `Your payment failed. Please try again.`,
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      },
      'contract.signed': {
        type: 'contract.signed',
        title: 'Contract Signed',
        message: `Contract for booking #${data.bookingNumber || 'N/A'} has been signed.`,
        channels: [NotificationChannel.IN_APP, NotificationChannel.EMAIL],
      },
    }

    return templates[type] || {
      type,
      title: 'Notification',
      message: data.message || 'You have a new notification',
      channels: [NotificationChannel.IN_APP],
    }
  }

  /**
   * Send email notification
   */
  private static async sendEmail(input: SendNotificationInput) {
    // TODO: Implement email sending via SMTP
    // This should use the configured SMTP settings from environment variables
    // For now, silently handle (email service will be implemented in Phase 4)
    // Email notification will be sent when email service is implemented
  }

  /**
   * Send WhatsApp notification
   */
  private static async sendWhatsApp(input: SendNotificationInput) {
    // TODO: Implement WhatsApp sending via Cloud API
    // This should use the configured WhatsApp API key
    const whatsappApiKey = process.env.WHATSAPP_API_KEY
    
    if (!whatsappApiKey) {
      // WhatsApp API key not configured - silently skip
      return
    }

    // Placeholder - implement actual WhatsApp API call
    // WhatsApp notification will be sent when WhatsApp service is implemented
  }

  /**
   * Get unread notification count for user
   */
  static async getUnreadCount(userId: string): Promise<number> {
    return prisma.notification.count({
      where: {
        userId,
        read: false,
        deletedAt: null,
      },
    })
  }

  /**
   * Get user notifications
   */
  static async getUserNotifications(
    userId: string,
    options?: {
      unreadOnly?: boolean
      limit?: number
      offset?: number
    }
  ) {
    return prisma.notification.findMany({
      where: {
        userId,
        deletedAt: null,
        ...(options?.unreadOnly && { read: false }),
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: options?.limit,
      skip: options?.offset,
    })
  }

  /**
   * Mark notification as read
   */
  static async markAsRead(notificationId: string, userId: string) {
    return prisma.notification.updateMany({
      where: {
        id: notificationId,
        userId,
        deletedAt: null,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    })
  }

  /**
   * Mark all notifications as read for user
   */
  static async markAllAsRead(userId: string) {
    return prisma.notification.updateMany({
      where: {
        userId,
        read: false,
        deletedAt: null,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    })
  }
}
