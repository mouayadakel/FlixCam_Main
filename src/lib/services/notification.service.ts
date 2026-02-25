/**
 * @file notification.service.ts
 * @description Multi-channel notification service
 * @module lib/services/notification
 */

import { prisma } from '@/lib/db/prisma'
import { NotificationChannel } from '@prisma/client'
import { EmailService } from '@/lib/services/email.service'
import { WhatsAppService } from '@/lib/services/whatsapp.service'
import { SmsService } from '@/lib/services/sms.service'

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

/** Check if channel is enabled in MessagingChannelConfig (master toggle). Default true if no row. */
async function isChannelEnabled(channel: NotificationChannel): Promise<boolean> {
  const config = await prisma.messagingChannelConfig.findUnique({
    where: { channel },
  })
  return config?.isEnabled ?? true
}

/** Check if user has opted in for this channel/category. Default true if no preference. */
async function isOptedIn(userId: string | undefined, channel: NotificationChannel): Promise<boolean> {
  if (!userId) return true
  const pref = await prisma.notificationPreference.findUnique({
    where: {
      userId_channel_category: { userId, channel, category: 'TRANSACTIONAL' },
    },
  })
  return pref?.isOptedIn ?? true
}

export class NotificationService {
  /**
   * Send notification via specified channel
   */
  static async send(input: SendNotificationInput) {
    // Create notification record (in-app record)
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

    const channelEnabled = await isChannelEnabled(input.channel)
    if (!channelEnabled) return notification

    const optedIn = await isOptedIn(input.userId, input.channel)
    if (!optedIn) return notification

    switch (input.channel) {
      case NotificationChannel.IN_APP:
        break
      case NotificationChannel.EMAIL:
        await this.sendEmail(input)
        break
      case NotificationChannel.WHATSAPP:
        await this.sendWhatsApp(input)
        break
      case NotificationChannel.SMS:
        await this.sendSms(input)
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
  static getTemplate(type: string, data: Record<string, any>): NotificationTemplate {
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

    return (
      templates[type] || {
        type,
        title: 'Notification',
        message: data.message || 'You have a new notification',
        channels: [NotificationChannel.IN_APP],
      }
    )
  }

  /**
   * Send email notification
   */
  private static async sendEmail(input: SendNotificationInput) {
    if (!input.userId) return
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { email: true },
    })
    if (!user?.email) return

    const html = `<p>${input.title}</p><p>${(input.message || '').replace(/\n/g, '<br>')}</p>`
    await EmailService.send({
      to: user.email,
      subject: input.title,
      html,
      recipientUserId: input.userId,
      logToMessageLog: true,
    })
  }

  /**
   * Send WhatsApp notification via Meta Cloud API
   */
  private static async sendWhatsApp(input: SendNotificationInput) {
    if (!input.userId) return
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { phone: true },
    })
    if (!user?.phone) return

    const body = `${input.title}\n\n${input.message}`
    await WhatsAppService.sendWhatsAppText(user.phone, body, {
      recipientUserId: input.userId,
      logToMessageLog: true,
    })
  }

  /**
   * Send SMS notification
   */
  private static async sendSms(input: SendNotificationInput) {
    if (!input.userId) return
    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { phone: true },
    })
    if (!user?.phone) return

    const body = `${input.title}\n\n${input.message}`
    await SmsService.sendSmsText(user.phone, body, {
      recipientUserId: input.userId,
      logToMessageLog: true,
    })
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
