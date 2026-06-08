/**
 * @file whatsapp-reminder.service.test.ts
 * @description Unit tests for automated WhatsApp notifications scheduling and sending
 * @module lib/services/__tests__/whatsapp-reminder.service.test
 */

import { WhatsAppReminderService } from '../whatsapp-reminder.service'
import { prisma } from '@/lib/db/prisma'
import { WhatsAppService } from '../whatsapp.service'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    booking: {
      findMany: jest.fn(),
    },
    messageLog: {
      findFirst: jest.fn(),
    },
  },
}))

jest.mock('../whatsapp.service', () => ({
  WhatsAppService: {
    sendWhatsAppText: jest.fn(() => Promise.resolve({ ok: true, messageId: 'msg_987' })),
  },
}))

describe('WhatsAppReminderService', () => {
  const optedInCustomer = {
    whatsappOptIn: true,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('sendPickupReminders', () => {
    it('should skip bookings without a customer phone number', async () => {
      ;(prisma.booking.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'booking_1',
          bookingNumber: 'FLX-1',
          startDate: new Date(),
          customer: { id: 'cust_1', name: 'John Doe', phone: null },
        },
      ])

      const result = await WhatsAppReminderService.sendPickupReminders()
      expect(result.sent).toBe(0)
      expect(result.skipped).toBe(1)
      expect(WhatsAppService.sendWhatsAppText).not.toHaveBeenCalled()
    })

    it('should skip bookings that already received a pickup reminder', async () => {
      ;(prisma.booking.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'booking_2',
          bookingNumber: 'FLX-2',
          startDate: new Date(),
          customer: { id: 'cust_2', name: 'Jane Doe', phone: '0500000000' },
        },
      ])

      ;(prisma.messageLog.findFirst as jest.Mock).mockResolvedValue({ id: 'log_1' })

      const result = await WhatsAppReminderService.sendPickupReminders()
      expect(result.sent).toBe(0)
      expect(result.skipped).toBe(1)
      expect(WhatsAppService.sendWhatsAppText).not.toHaveBeenCalled()
    })

    it('should skip bookings without WhatsApp opt-in', async () => {
      ;(prisma.booking.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'booking_optout',
          bookingNumber: 'FLX-0',
          startDate: new Date(),
          checkoutFormData: null,
          customer: { id: 'cust_0', name: 'No Opt In', phone: '0500000001', whatsappOptIn: false },
        },
      ])

      const result = await WhatsAppReminderService.sendPickupReminders()
      expect(result.sent).toBe(0)
      expect(result.skipped).toBe(1)
      expect(WhatsAppService.sendWhatsAppText).not.toHaveBeenCalled()
    })

    it('should send pickup reminder successfully when not already sent', async () => {
      ;(prisma.booking.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'booking_3',
          bookingNumber: 'FLX-3',
          startDate: new Date(),
          customer: { id: 'cust_3', name: 'Mouayad Akel', phone: '0511111111', ...optedInCustomer },
          checkoutFormData: null,
        },
      ])

      ;(prisma.messageLog.findFirst as jest.Mock).mockResolvedValue(null)

      const result = await WhatsAppReminderService.sendPickupReminders()
      expect(result.sent).toBe(1)
      expect(result.skipped).toBe(0)
      expect(WhatsAppService.sendWhatsAppText).toHaveBeenCalledWith(
        '0511111111',
        expect.stringContaining('تذكير استلام الحجز'),
        expect.objectContaining({ recipientUserId: 'cust_3' })
      )
    })
  })

  describe('sendReturnReminders', () => {
    it('should send return reminders for active bookings', async () => {
      ;(prisma.booking.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'booking_4',
          bookingNumber: 'FLX-4',
          endDate: new Date(),
          customer: { id: 'cust_4', name: 'Ahmed', phone: '0522222222', ...optedInCustomer },
          checkoutFormData: null,
        },
      ])

      ;(prisma.messageLog.findFirst as jest.Mock).mockResolvedValue(null)

      const result = await WhatsAppReminderService.sendReturnReminders()
      expect(result.sent).toBe(1)
      expect(result.skipped).toBe(0)
      expect(WhatsAppService.sendWhatsAppText).toHaveBeenCalledWith(
        '0522222222',
        expect.stringContaining('تذكير إرجاع المعدات'),
        expect.objectContaining({ recipientUserId: 'cust_4' })
      )
    })
  })

  describe('sendOverdueAlerts', () => {
    it('should send overdue alerts for bookings past their endDate', async () => {
      ;(prisma.booking.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'booking_5',
          bookingNumber: 'FLX-5',
          endDate: new Date(Date.now() - 3600000), // 1 hour ago
          customer: { id: 'cust_5', name: 'Sami', phone: '0533333333', ...optedInCustomer },
          checkoutFormData: null,
        },
      ])

      ;(prisma.messageLog.findFirst as jest.Mock).mockResolvedValue(null)

      const result = await WhatsAppReminderService.sendOverdueAlerts()
      expect(result.sent).toBe(1)
      expect(result.skipped).toBe(0)
      expect(WhatsAppService.sendWhatsAppText).toHaveBeenCalledWith(
        '0533333333',
        expect.stringContaining('تنبيه عاجل: تأخر إرجاع المعدات'),
        expect.objectContaining({ recipientUserId: 'cust_5' })
      )
    })
  })
})
