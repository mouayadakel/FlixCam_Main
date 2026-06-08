/**
 * Unit tests for whatsapp.service (Twilio)
 */

const mockMessagesCreate = jest.fn().mockResolvedValue({
  sid: 'SM_wa_123',
  status: 'sent',
  errorMessage: null,
  dateSent: new Date(),
})
jest.mock('twilio', () =>
  jest.fn().mockImplementation(() => ({
    messages: {
      create: (...args: unknown[]) => mockMessagesCreate(...args),
    },
  }))
)

const mockMessageLogCreate = jest.fn().mockResolvedValue({})
const mockMessageLogUpdateMany = jest.fn().mockResolvedValue({ count: 1 })

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    messagingChannelConfig: {
      findUnique: jest.fn().mockResolvedValue(null),
    },
    messageLog: {
      create: (...args: unknown[]) => mockMessageLogCreate(...args),
      updateMany: (...args: unknown[]) => mockMessageLogUpdateMany(...args),
    },
  },
}))

describe('whatsapp.service', () => {
  beforeAll(() => {
    process.env.TWILIO_ACCOUNT_SID = 'AC'
    process.env.TWILIO_AUTH_TOKEN = 'token'
    process.env.TWILIO_WHATSAPP_PHONE_NUMBER = 'whatsapp:+14155238886'
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockMessageLogCreate.mockResolvedValue({})
    mockMessageLogUpdateMany.mockResolvedValue({ count: 1 })
    mockMessagesCreate.mockResolvedValue({
      sid: 'SM_wa_123',
      status: 'sent',
      errorMessage: null,
      dateSent: new Date(),
    })
  })

  describe('normalizePhoneForWhatsApp', () => {
    it('formats E.164 with whatsapp prefix', async () => {
      const { normalizePhoneForWhatsApp } = await import('../whatsapp.service')
      expect(normalizePhoneForWhatsApp('+966501234567')).toBe('whatsapp:+966501234567')
    })
    it('adds 966 for local number', async () => {
      const { normalizePhoneForWhatsApp } = await import('../whatsapp.service')
      expect(normalizePhoneForWhatsApp('501234567')).toBe('whatsapp:+966501234567')
    })
    it('replaces leading 0 with 966', async () => {
      const { normalizePhoneForWhatsApp } = await import('../whatsapp.service')
      expect(normalizePhoneForWhatsApp('0501234567')).toBe('whatsapp:+966501234567')
    })
    it('strips spaces and dashes', async () => {
      const { normalizePhoneForWhatsApp } = await import('../whatsapp.service')
      expect(normalizePhoneForWhatsApp('050 123 4567')).toBe('whatsapp:+966501234567')
    })
  })

  describe('isWhatsAppConfigured', () => {
    it('returns false when ENABLE_WHATSAPP is false', async () => {
      process.env.ENABLE_WHATSAPP = 'false'
      const { isWhatsAppConfigured } = await import('../whatsapp.service')
      expect(isWhatsAppConfigured()).toBe(false)
      delete process.env.ENABLE_WHATSAPP
    })
    it('returns true when Twilio env set', async () => {
      const { isWhatsAppConfigured } = await import('../whatsapp.service')
      expect(isWhatsAppConfigured()).toBe(true)
    })
  })

  describe('sendWhatsAppText', () => {
    it('sends text and logs when configured', async () => {
      const { sendWhatsAppText } = await import('../whatsapp.service')
      const result = await sendWhatsAppText('966501234567', 'Hello')
      expect(result.ok).toBe(true)
      expect(result.messageId).toBe('SM_wa_123')
      expect(mockMessageLogCreate).toHaveBeenCalled()
    })
    it('returns error when Twilio throws', async () => {
      mockMessagesCreate.mockRejectedValueOnce(new Error('Invalid token'))
      const { sendWhatsAppText } = await import('../whatsapp.service')
      const result = await sendWhatsAppText('966501234567', 'Hi')
      expect(result.ok).toBe(false)
      expect(result.error).toBe('Invalid token')
    })
    it('skips log when logToMessageLog is false', async () => {
      const { sendWhatsAppText } = await import('../whatsapp.service')
      await sendWhatsAppText('966501234567', 'Hi', { logToMessageLog: false })
      expect(mockMessageLogCreate).not.toHaveBeenCalled()
    })
  })

  describe('sendWhatsAppTemplate', () => {
    it('sends template and logs', async () => {
      const { sendWhatsAppTemplate } = await import('../whatsapp.service')
      const result = await sendWhatsAppTemplate('966501234567', 'hello_world', 'en')
      expect(result.ok).toBe(true)
      expect(mockMessageLogCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            body: '[Template: hello_world]',
            recipientPhone: 'whatsapp:+966501234567',
          }),
        })
      )
    })
    it('sends template with components when provided', async () => {
      const { sendWhatsAppTemplate } = await import('../whatsapp.service')
      const result = await sendWhatsAppTemplate('966501234567', 'order_confirmation', 'en', [
        { type: 'body', parameters: [{ type: 'text', text: 'Order #123' }] },
      ])
      expect(result.ok).toBe(true)
      expect(mockMessagesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          body: 'Order #123',
        })
      )
    })
  })

  describe('sendWhatsAppInteractiveButtons', () => {
    it('returns error when more than 3 buttons', async () => {
      const { sendWhatsAppInteractiveButtons } = await import('../whatsapp.service')
      const result = await sendWhatsAppInteractiveButtons('966501234567', 'Choose', [
        { id: '1', title: 'A' },
        { id: '2', title: 'B' },
        { id: '3', title: 'C' },
        { id: '4', title: 'D' },
      ])
      expect(result.ok).toBe(false)
      expect(result.error).toBe('Maximum 3 buttons allowed')
    })
    it('sends buttons when 3 or fewer', async () => {
      const { sendWhatsAppInteractiveButtons } = await import('../whatsapp.service')
      const result = await sendWhatsAppInteractiveButtons('966501234567', 'Choose', [
        { id: '1', title: 'Option A' },
        { id: '2', title: 'Option B' },
      ])
      expect(result.ok).toBe(true)
      expect(mockMessagesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.stringContaining('Option A'),
        })
      )
    })
  })

  describe('sendWhatsAppDocument', () => {
    it('sends document with caption', async () => {
      const { sendWhatsAppDocument } = await import('../whatsapp.service')
      const result = await sendWhatsAppDocument('966501234567', 'https://example.com/doc.pdf', {
        caption: 'Your invoice',
      })
      expect(result.ok).toBe(true)
      expect(mockMessagesCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          body: 'Your invoice',
          mediaUrl: ['https://example.com/doc.pdf'],
        })
      )
    })
  })

  describe('updateMessageLogStatus', () => {
    it('updates message log by external id', async () => {
      const { MessageLogStatus } = await import('@prisma/client')
      const { updateMessageLogStatus } = await import('../whatsapp.service')
      await updateMessageLogStatus('SM_wa_123', MessageLogStatus.DELIVERED, {
        deliveredAt: new Date(),
      })
      expect(mockMessageLogUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { externalId: 'SM_wa_123' },
          data: expect.objectContaining({ status: 'DELIVERED' }),
        })
      )
    })
  })
})

export {}
