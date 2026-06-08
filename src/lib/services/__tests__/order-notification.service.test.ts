import { prisma } from '@/lib/db/prisma'
import { EmailService } from '../email.service'
import { OrderNotificationService } from '../order-notification.service'
import { WhatsAppService } from '../whatsapp.service'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    booking: { findFirst: jest.fn() },
    businessRecipient: { findMany: jest.fn() },
    user: { findMany: jest.fn(), update: jest.fn() },
    event: { findFirst: jest.fn(), create: jest.fn() },
  },
}))

jest.mock('../email.service', () => ({
  EmailService: { send: jest.fn() },
}))

jest.mock('../whatsapp.service', () => ({
  WhatsAppService: {
    isWhatsAppConfigured: jest.fn(),
    sendWhatsAppText: jest.fn(),
  },
}))

jest.mock('../sms.service', () => ({
  SmsService: {
    isSmsConfigured: jest.fn(() => false),
    sendSmsText: jest.fn(),
  },
}))

jest.mock('@/lib/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

const mockBookingFindFirst = prisma.booking.findFirst as jest.Mock
const mockBusinessRecipientFindMany = prisma.businessRecipient.findMany as jest.Mock
const mockUserFindMany = prisma.user.findMany as jest.Mock
const mockEventFindFirst = prisma.event.findFirst as jest.Mock
const mockEventCreate = prisma.event.create as jest.Mock
const mockSendEmail = EmailService.send as jest.Mock
const mockIsWhatsAppConfigured = WhatsAppService.isWhatsAppConfigured as jest.Mock
const mockSendWhatsAppText = WhatsAppService.sendWhatsAppText as jest.Mock

describe('OrderNotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIsWhatsAppConfigured.mockReturnValue(true)
    mockSendWhatsAppText.mockResolvedValue({ ok: true, messageId: 'wa-1' })
    mockSendEmail.mockResolvedValue({ ok: true })
    mockEventFindFirst.mockResolvedValue(null)
    mockEventCreate.mockResolvedValue({ id: 'evt-1' })
    process.env.ORDER_COMPLETED_NOTIFY_EMAILS = ''
  })

  it('sends payment confirmation to customer, owner, admin, and warehouse manager', async () => {
    process.env.ORDER_COMPLETED_NOTIFY_EMAILS = 'moayadakel@gmail.com, moayadalakel16@gmail.com'

    mockBookingFindFirst.mockResolvedValue({
      id: 'booking-1',
      bookingNumber: 'BK-001',
      status: 'CONFIRMED',
      startDate: new Date('2026-06-01T10:00:00.000Z'),
      endDate: new Date('2026-06-03T10:00:00.000Z'),
      createdAt: new Date('2026-05-01T10:00:00.000Z'),
      deliveryAddress: null,
      equipment: [],
      totalAmount: 2500,
      vatAmount: 375,
      customerId: 'customer-1',
      checkoutFormData: { whatsapp_confirmation_opt_in: true },
      customer: {
        id: 'customer-1',
        name: 'Customer One',
        email: 'customer@flixcam.rent',
        phone: '0500000001',
        whatsappOptIn: false,
      },
    })

    mockBusinessRecipientFindMany.mockResolvedValue([
      {
        id: 'biz-owner',
        name: 'Owner',
        role: 'OWNER',
        whatsappNumber: '0500000002',
        phone: null,
        alternatePhone: null,
        email: 'owner@flixcam.rent',
        alternateEmail: null,
      },
      {
        id: 'biz-warehouse',
        name: 'Warehouse Manager',
        role: 'WAREHOUSE_MANAGER',
        whatsappNumber: '0500000004',
        phone: null,
        alternatePhone: null,
        email: 'warehouse@flixcam.rent',
        alternateEmail: null,
      },
    ])

    mockUserFindMany.mockResolvedValue([
      {
        id: 'admin-1',
        name: 'Admin User',
        email: 'admin@flixcam.rent',
        phone: '0500000003',
        role: 'ADMIN',
      },
    ])

    await OrderNotificationService.notifyPaymentConfirmed('booking-1', 2500)

    const whatsappTargets = mockSendWhatsAppText.mock.calls.map(([to]) => to).sort()
    expect(whatsappTargets).toEqual(
      ['0500000001', '0500000002', '0500000003', '0500000004'].sort()
    )

    const emailTargets = mockSendEmail.mock.calls.map(([input]) => input.to).sort()
    expect(emailTargets).toEqual(
      [
        'customer@flixcam.rent',
        'owner@flixcam.rent',
        'admin@flixcam.rent',
        'warehouse@flixcam.rent',
        'moayadakel@gmail.com',
        'moayadalakel16@gmail.com',
      ].sort()
    )

    expect(mockSendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'customer@flixcam.rent',
        recipientUserId: 'customer-1',
        subject: expect.stringContaining('BK-001'),
      })
    )
  })
})
