/**
 * Unit tests for email.service
 */
const mockSend = jest.fn()
const mockSendMail = jest.fn()

jest.mock('resend', () => {
  process.env.RESEND_API_KEY = process.env.RESEND_API_KEY || 'test-key'
  return {
    Resend: jest.fn().mockImplementation(() => ({
      emails: { send: mockSend },
    })),
  }
})

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: mockSendMail,
  })),
}), { virtual: true })

import { EmailService } from '../email.service'
import { prisma } from '@/lib/db/prisma'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    messagingChannelConfig: { findUnique: jest.fn().mockResolvedValue(null) },
    messageLog: { create: jest.fn() },
  },
}))

const mockMessagingChannelConfigFindUnique = prisma.messagingChannelConfig.findUnique as jest.Mock
const mockMessageLogCreate = prisma.messageLog.create as jest.Mock

describe('EmailService', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env.RESEND_API_KEY = 'test-key'
    mockSend.mockResolvedValue({ data: { id: 'msg-1' }, error: null })
    mockSendMail.mockResolvedValue({})
    mockMessagingChannelConfigFindUnique.mockResolvedValue(null)
    mockMessageLogCreate.mockResolvedValue({})
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('sendPasswordReset', () => {
    it('sends email and returns ok true when Resend succeeds', async () => {
      const result = await EmailService.sendPasswordReset('user@test.com', 'token123')
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          to: ['user@test.com'],
          subject: 'Reset your password – FlixCam.rent',
        })
      )
      expect(result).toEqual({ ok: true })
    })

    it('returns ok false when Resend fails', async () => {
      mockSend.mockResolvedValueOnce({ data: null, error: { message: 'Rate limited' } })
      mockSendMail.mockRejectedValueOnce(new Error('SMTP down'))
      const result = await EmailService.sendPasswordReset('user@test.com', 'token123')
      expect(result.ok).toBe(false)
      expect(result.error).toContain('SMTP down')
    })
  })

  describe('sendContactFormNotification', () => {
    it('sends to admin with escaped content', async () => {
      await EmailService.sendContactFormNotification({
        name: 'User',
        email: 'user@test.com',
        subject: 'Contact',
        message: 'Message',
      })
      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          replyTo: 'user@test.com',
          subject: expect.stringContaining('Contact'),
        })
      )
    })
  })

  describe('sendBookingConfirmation', () => {
    it('sends confirmation and returns ok true', async () => {
      const result = await EmailService.sendBookingConfirmation({
        to: 'customer@test.com',
        customerName: 'Customer',
        bookingNumber: 'BK-001',
        bookingId: 'book-1',
        startDate: new Date('2026-03-01'),
        endDate: new Date('2026-03-05'),
        totalAmount: 1000,
      })
      expect(mockSend).toHaveBeenCalled()
      expect(result).toEqual({ ok: true })
    })
  })

  describe('send', () => {
    it('sends and logs to MessageLog', async () => {
      await EmailService.send({
        to: 'u@test.com',
        subject: 'Test',
        html: '<p>Hi</p>',
        logToMessageLog: true,
      })
      expect(mockSend).toHaveBeenCalled()
      expect(mockMessageLogCreate).toHaveBeenCalled()
    })

    it('returns ok false when Resend returns error', async () => {
      mockSend.mockResolvedValueOnce({ data: null, error: { message: 'Bounce' } })
      mockSendMail.mockRejectedValueOnce(new Error('SMTP down'))
      const result = await EmailService.send({
        to: 'u@test.com',
        subject: 'Test',
        html: '<p>Hi</p>',
      })
      expect(result.ok).toBe(false)
      expect(result.error).toContain('SMTP down')
    })

    it('uses admin-configured sender fields when present', async () => {
      mockMessagingChannelConfigFindUnique.mockResolvedValueOnce({
        config: {
          fromAddress: 'ops@flixcam.rent',
          fromName: 'FlixCam Ops',
          replyTo: 'support@flixcam.rent',
        },
      })

      await EmailService.send({
        to: 'u@test.com',
        subject: 'Configured Sender',
        html: '<p>Hi</p>',
      })

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: 'FlixCam Ops <ops@flixcam.rent>',
          replyTo: 'support@flixcam.rent',
        })
      )
    })
  })
})
