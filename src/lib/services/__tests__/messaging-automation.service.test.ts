/**
 * Unit tests for messaging-automation.service
 */

import { prisma } from '@/lib/db/prisma'
import { processEventForMessaging } from '../messaging-automation.service'
import { NotificationService } from '../notification.service'
import { enqueueNotification } from '../notification-queue.service'
import { renderTemplate } from '../template-renderer.service'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    automationRule: {
      findMany: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    booking: {
      aggregate: jest.fn(),
      findFirst: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    businessRecipient: {
      findMany: jest.fn(),
    },
    notificationTemplate: {
      findFirst: jest.fn(),
    },
  },
}))

jest.mock('../notification.service', () => ({
  NotificationService: {
    send: jest.fn(),
    sendMultiChannel: jest.fn(),
  },
}))

jest.mock('../notification-queue.service', () => ({
  enqueueNotification: jest.fn(),
}))

jest.mock('../template-renderer.service', () => ({
  renderTemplate: jest.fn(),
}))

jest.mock('../coupon.service', () => ({
  CouponService: {
    generateReferralCoupon: jest.fn(),
  },
}))

const mockAutomationRuleFindMany = prisma.automationRule.findMany as jest.Mock
const mockAutomationRuleUpdate = prisma.automationRule.update as jest.Mock
const mockBookingAggregate = prisma.booking.aggregate as jest.Mock
const mockBookingFindFirst = prisma.booking.findFirst as jest.Mock
const mockBusinessRecipientFindMany = prisma.businessRecipient.findMany as jest.Mock
const mockNotificationTemplateFindFirst = prisma.notificationTemplate.findFirst as jest.Mock
const mockEnqueueNotification = enqueueNotification as jest.Mock
const mockRenderTemplate = renderTemplate as jest.Mock
const mockNotificationSend = NotificationService.send as jest.Mock

describe('messaging-automation.service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockAutomationRuleFindMany.mockResolvedValue([])
    mockAutomationRuleUpdate.mockResolvedValue(undefined)
    mockBookingAggregate.mockResolvedValue({ _sum: { totalAmount: 0 } })
    mockBookingFindFirst.mockResolvedValue(null)
    mockBusinessRecipientFindMany.mockResolvedValue([])
    mockNotificationTemplateFindFirst.mockResolvedValue(null)
    mockRenderTemplate.mockResolvedValue(null)
  })

  it('returns early when trigger is not mapped', async () => {
    await processEventForMessaging('unknown.event', {})
    expect(mockAutomationRuleFindMany).not.toHaveBeenCalled()
  })

  it('skips booking.created while checkout is unpaid', async () => {
    await processEventForMessaging('booking.created', {
      booking: { status: 'PAYMENT_PENDING', customerId: 'u1' },
    })

    expect(mockAutomationRuleFindMany).not.toHaveBeenCalled()
  })

  it('uses exact internal recipients and enriched booking data for payment.success rules', async () => {
    mockAutomationRuleFindMany.mockResolvedValue([
      {
        id: 'rule-1',
        trigger: 'PAYMENT_RECEIVED',
        channels: ['EMAIL', 'WHATSAPP'],
        templateId: 'tpl-1',
        recipientType: 'ALL',
        specificRecipients: ['recipient-1'],
        priority: 100,
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ])

    mockBookingFindFirst.mockResolvedValue({
      id: 'booking-1',
      bookingNumber: 'BK-001',
      status: 'CONFIRMED',
      startDate: new Date('2026-06-01T10:00:00.000Z'),
      endDate: new Date('2026-06-03T10:00:00.000Z'),
      totalAmount: 2500,
      vatAmount: 375,
      depositAmount: null,
      customerId: 'customer-1',
      receiverName: 'Receiver One',
      receiverPhone: '0500000009',
      deliveryAddress: 'Riyadh',
      preferredTimeSlot: 'Morning',
      notes: 'Handle with care',
      customer: {
        id: 'customer-1',
        name: 'Customer One',
        email: 'customer@flixcam.rent',
        phone: '0500000001',
      },
      equipment: [],
    })

    mockNotificationTemplateFindFirst.mockResolvedValue({
      slug: 'payment-received-customer',
      language: 'ar',
    })

    mockRenderTemplate.mockResolvedValue({
      subject: 'تم استلام الدفع',
      bodyText: 'body text',
      bodyHtml: '<p>body html</p>',
    })

    mockBusinessRecipientFindMany.mockResolvedValue([
      {
        id: 'recipient-1',
        name: 'Admin',
        role: 'CUSTOM',
        email: 'admin@flixcam.rent',
        alternateEmail: null,
        phone: '0500000002',
        alternatePhone: null,
        whatsappNumber: '0500000002',
        preferredChannel: 'EMAIL',
        receiveTriggers: ['PAYMENT_RECEIVED'],
        excludeTriggers: [],
      },
    ])

    await processEventForMessaging('payment.success', {
      paymentId: 'pay-1',
      bookingId: 'booking-1',
      amount: '2500',
      customerId: 'customer-1',
      bookingNumber: 'BK-001',
      userId: 'customer-1',
      timestamp: new Date('2026-05-01T00:00:00.000Z'),
    })

    expect(mockRenderTemplate).toHaveBeenCalledWith(
      'payment-received-customer',
      'ar',
      expect.objectContaining({
        bookingNumber: 'BK-001',
        customerName: 'Customer One',
        confirmationUrl: expect.stringContaining('/booking/confirmation/booking-1'),
        portalBookingUrl: expect.stringContaining('/portal/bookings/booking-1'),
      })
    )

    expect(mockBusinessRecipientFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { in: ['recipient-1'] },
          isActive: true,
        }),
      })
    )

    expect(mockEnqueueNotification).toHaveBeenCalledTimes(3)
    expect(mockEnqueueNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'email',
        recipient: 'customer@flixcam.rent',
        recipientUserId: 'customer-1',
      })
    )
    expect(mockEnqueueNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'whatsapp',
        recipient: '0500000001',
        recipientUserId: 'customer-1',
      })
    )
    expect(mockEnqueueNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        channel: 'email',
        recipient: 'admin@flixcam.rent',
      })
    )

    expect(mockNotificationSend).not.toHaveBeenCalled()
    expect(mockAutomationRuleUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'rule-1' },
        data: expect.objectContaining({
          sentCount: { increment: 3 },
        }),
      })
    )
  })
})
