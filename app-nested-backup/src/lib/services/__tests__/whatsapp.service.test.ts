/**
 * Unit tests for whatsapp.service
 */

const mockMessageLogCreate = jest.fn().mockResolvedValue({})
const mockMessageLogUpdateMany = jest.fn().mockResolvedValue({ count: 1 })

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    messageLog: {
      create: (...args: unknown[]) => mockMessageLogCreate(...args),
      updateMany: (...args: unknown[]) => mockMessageLogUpdateMany(...args),
    },
  },
}))

const originalFetch = global.fetch

describe('whatsapp.service', () => {
  beforeAll(() => {
    process.env.WHATSAPP_ACCESS_TOKEN = 'token'
    process.env.WHATSAPP_PHONE_NUMBER_ID = 'phone_id'
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockMessageLogCreate.mockResolvedValue({})
    mockMessageLogUpdateMany.mockResolvedValue({ count: 1 })
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ messages: [{ id: 'wamid.123' }] }),
    }) as jest.Mock
  })

  afterAll(() => {
    global.fetch = originalFetch
  })

  describe('normalizePhoneForWhatsApp', () => {
    it('strips plus and normalizes to E.164 without plus', async () => {
      const { normalizePhoneForWhatsApp } = await import('../whatsapp.service')
      expect(normalizePhoneForWhatsApp('+966501234567')).toBe('966501234567')
    })
    it('adds 966 for local number', async () => {
      const { normalizePhoneForWhatsApp } = await import('../whatsapp.service')
      expect(normalizePhoneForWhatsApp('501234567')).toBe('966501234567')
    })
    it('replaces leading 0 with 966', async () => {
      const { normalizePhoneForWhatsApp } = await import('../whatsapp.service')
      expect(normalizePhoneForWhatsApp('0501234567')).toBe('966501234567')
    })
    it('strips spaces and dashes', async () => {
      const { normalizePhoneForWhatsApp } = await import('../whatsapp.service')
      expect(normalizePhoneForWhatsApp('050 123 4567')).toBe('966501234567')
    })
  })

  describe('isWhatsAppConfigured', () => {
    it('returns false when ENABLE_WHATSAPP is false', async () => {
      process.env.ENABLE_WHATSAPP = 'false'
      const { isWhatsAppConfigured } = await import('../whatsapp.service')
      expect(isWhatsAppConfigured()).toBe(false)
      delete process.env.ENABLE_WHATSAPP
    })
    it('returns true when token and phone id set', async () => {
      const { isWhatsAppConfigured } = await import('../whatsapp.service')
      expect(isWhatsAppConfigured()).toBe(true)
    })
  })

  describe('sendWhatsAppText', () => {
    it('returns error when not configured', async () => {
      const orig = process.env.WHATSAPP_ACCESS_TOKEN
      delete process.env.WHATSAPP_ACCESS_TOKEN
      jest.resetModules()
      const { sendWhatsAppText } = await import('../whatsapp.service')
      const result = await sendWhatsAppText('966501234567', 'Hi')
      expect(result.ok).toBe(false)
      expect(result.error).toBe('WhatsApp not configured')
      process.env.WHATSAPP_ACCESS_TOKEN = orig
    })
    it('sends text and logs when configured', async () => {
      const { sendWhatsAppText } = await import('../whatsapp.service')
      const result = await sendWhatsAppText('966501234567', 'Hello')
      expect(result.ok).toBe(true)
      expect(result.messageId).toBe('wamid.123')
      expect(mockMessageLogCreate).toHaveBeenCalled()
    })
    it('returns error when API returns non-ok response', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Unauthorized',
        json: () => Promise.resolve({ error: { message: 'Invalid token' } }),
      })
      const { sendWhatsAppText } = await import('../whatsapp.service')
      const result = await sendWhatsAppText('966501234567', 'Hi')
      expect(result.ok).toBe(false)
      expect(result.error).toBe('Invalid token')
    })
    it('falls back to statusText when API error has no message', async () => {
      ;(global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        statusText: 'Internal Server Error',
        json: () => Promise.resolve({}),
      })
      const { sendWhatsAppText } = await import('../whatsapp.service')
      const result = await sendWhatsAppText('966501234567', 'Hi')
      expect(result.ok).toBe(false)
      expect(result.error).toBe('Internal Server Error')
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
            recipientPhone: '+966501234567',
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
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('order_confirmation'),
        })
      )
    })
    it('returns error when not configured', async () => {
      const origToken = process.env.WHATSAPP_ACCESS_TOKEN
      const origPhone = process.env.WHATSAPP_PHONE_NUMBER_ID
      delete process.env.WHATSAPP_ACCESS_TOKEN
      delete process.env.WHATSAPP_PHONE_NUMBER_ID
      jest.resetModules()
      const { sendWhatsAppTemplate } = await import('../whatsapp.service')
      const result = await sendWhatsAppTemplate('966501234567', 'hello', 'en')
      expect(result.ok).toBe(false)
      expect(result.error).toBe('WhatsApp not configured')
      process.env.WHATSAPP_ACCESS_TOKEN = origToken
      process.env.WHATSAPP_PHONE_NUMBER_ID = origPhone
    })
  })

  describe('sendWhatsAppInteractiveButtons', () => {
    it('returns error when not configured', async () => {
      const orig = process.env.WHATSAPP_ACCESS_TOKEN
      delete process.env.WHATSAPP_ACCESS_TOKEN
      jest.resetModules()
      const { sendWhatsAppInteractiveButtons } = await import('../whatsapp.service')
      const result = await sendWhatsAppInteractiveButtons('966501234567', 'Choose', [
        { id: '1', title: 'A' },
      ])
      expect(result.ok).toBe(false)
      expect(result.error).toBe('WhatsApp not configured')
      process.env.WHATSAPP_ACCESS_TOKEN = orig
    })
    it('returns error when more than 3 buttons', async () => {
      const { sendWhatsAppInteractiveButtons } = await import('../whatsapp.service')
      const result = await sendWhatsAppInteractiveButtons(
        '966501234567',
        'Choose',
        [
          { id: '1', title: 'A' },
          { id: '2', title: 'B' },
          { id: '3', title: 'C' },
          { id: '4', title: 'D' },
        ]
      )
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
    })
  })

  describe('sendWhatsAppDocument', () => {
    it('returns error when not configured', async () => {
      const orig = process.env.WHATSAPP_ACCESS_TOKEN
      delete process.env.WHATSAPP_ACCESS_TOKEN
      jest.resetModules()
      const { sendWhatsAppDocument } = await import('../whatsapp.service')
      const result = await sendWhatsAppDocument('966501234567', 'https://example.com/doc.pdf')
      expect(result.ok).toBe(false)
      expect(result.error).toBe('WhatsApp not configured')
      process.env.WHATSAPP_ACCESS_TOKEN = orig
    })
    it('sends document with caption', async () => {
      const { sendWhatsAppDocument } = await import('../whatsapp.service')
      const result = await sendWhatsAppDocument('966501234567', 'https://example.com/doc.pdf', {
        caption: 'Your invoice',
      })
      expect(result.ok).toBe(true)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.stringContaining('document'),
        })
      )
    })
  })

  describe('updateMessageLogStatus', () => {
    it('updates message log by external id', async () => {
      const { MessageLogStatus } = await import('@prisma/client')
      const { updateMessageLogStatus } = await import('../whatsapp.service')
      await updateMessageLogStatus('wamid.123', MessageLogStatus.DELIVERED, {
        deliveredAt: new Date(),
      })
      expect(mockMessageLogUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { externalId: 'wamid.123' },
          data: expect.objectContaining({ status: 'DELIVERED' }),
        })
      )
    })
  })
})

export {}
