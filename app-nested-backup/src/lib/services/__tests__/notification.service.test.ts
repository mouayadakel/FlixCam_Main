/**
 * Unit tests for notification.service
 */
import { NotificationService } from '../notification.service'
import { prisma } from '@/lib/db/prisma'
import { NotificationChannel } from '@prisma/client'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    messagingChannelConfig: { findUnique: jest.fn() },
    notificationPreference: { findUnique: jest.fn() },
    notification: { create: jest.fn() },
  },
}))
jest.mock('../email.service', () => ({ EmailService: { send: jest.fn() } }))
jest.mock('../whatsapp.service', () => ({ WhatsAppService: { send: jest.fn() } }))
jest.mock('../sms.service', () => ({ SmsService: { send: jest.fn() } }))

const mockNotificationCreate = prisma.notification.create as jest.Mock
const mockChannelConfig = prisma.messagingChannelConfig.findUnique as jest.Mock
const mockPref = prisma.notificationPreference.findUnique as jest.Mock

describe('NotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockNotificationCreate.mockResolvedValue({
      id: 'notif-1',
      userId: 'user-1',
      channel: NotificationChannel.EMAIL,
      type: 'test',
      title: 'Title',
      message: 'Message',
    })
    mockChannelConfig.mockResolvedValue({ isEnabled: true })
    mockPref.mockResolvedValue({ isOptedIn: true })
  })

  describe('send', () => {
    it('creates notification record and returns it for IN_APP', async () => {
      const result = await NotificationService.send({
        userId: 'user-1',
        channel: NotificationChannel.IN_APP,
        type: 'booking.confirmed',
        title: 'Booking confirmed',
        message: 'Your booking is confirmed',
      })
      expect(mockNotificationCreate).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          channel: NotificationChannel.IN_APP,
          type: 'booking.confirmed',
          title: 'Booking confirmed',
          message: 'Your booking is confirmed',
          data: {},
        },
      })
      expect(result.id).toBe('notif-1')
    })

    it('returns notification without sending when channel disabled', async () => {
      mockChannelConfig.mockResolvedValueOnce({ isEnabled: false })
      const result = await NotificationService.send({
        userId: 'user-1',
        channel: NotificationChannel.EMAIL,
        type: 'test',
        title: 'T',
        message: 'M',
      })
      expect(result.id).toBe('notif-1')
    })
  })
})
