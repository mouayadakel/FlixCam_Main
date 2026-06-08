/**
 * WhatsApp service behavior when Twilio credentials are absent.
 */

const mockMessageLogCreate = jest.fn().mockResolvedValue({})

jest.mock('twilio', () =>
  jest.fn().mockImplementation(() => ({
    messages: { create: jest.fn() },
  }))
)
jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    messagingChannelConfig: { findUnique: jest.fn().mockResolvedValue(null) },
    messageLog: { create: (...args: unknown[]) => mockMessageLogCreate(...args) },
  },
}))

function clearWhatsAppEnv() {
  process.env.TWILIO_ACCOUNT_SID = ''
  process.env.TWILIO_AUTH_TOKEN = ''
  process.env.TWILIO_WHATSAPP_PHONE_NUMBER = ''
  process.env.TWILIO_WHATSAPP_NUMBER = ''
  process.env.ENABLE_WHATSAPP = ''
}

describe('whatsapp.service without Twilio credentials', () => {
  beforeEach(() => {
    clearWhatsAppEnv()
    jest.resetModules()
  })

  it('isWhatsAppConfigured returns false', () => {
    clearWhatsAppEnv()
    jest.resetModules()
    const modulePath = require.resolve('../whatsapp.service')
    delete require.cache[modulePath]
    const { isWhatsAppConfigured } = require('../whatsapp.service') as typeof import('../whatsapp.service')
    expect(isWhatsAppConfigured()).toBe(false)
  })

  it('sendWhatsAppText returns not configured error', async () => {
    clearWhatsAppEnv()
    jest.resetModules()
    const modulePath = require.resolve('../whatsapp.service')
    delete require.cache[modulePath]
    const { sendWhatsAppText } = require('../whatsapp.service') as typeof import('../whatsapp.service')
    const result = await sendWhatsAppText('966501234567', 'Hi')
    expect(result.ok).toBe(false)
    expect(result.error).toBe('WhatsApp (Twilio) not configured')
  })
})
