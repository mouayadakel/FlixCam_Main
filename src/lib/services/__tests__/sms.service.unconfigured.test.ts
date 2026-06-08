/**
 * SMS service behavior when Twilio credentials are absent.
 */

jest.mock('twilio', () =>
  jest.fn().mockImplementation(() => ({
    messages: { create: jest.fn() },
  }))
)
jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    messageLog: { create: jest.fn().mockResolvedValue({}) },
  },
}))

function clearTwilioEnv() {
  process.env.TWILIO_ACCOUNT_SID = ''
  process.env.TWILIO_AUTH_TOKEN = ''
  process.env.TWILIO_PHONE_NUMBER = ''
  process.env.TWILIO_SMS_PHONE_NUMBER = ''
  process.env.ENABLE_SMS = ''
}

function reloadSmsService() {
  const modulePath = require.resolve('../sms.service')
  delete require.cache[modulePath]
  return require('../sms.service') as typeof import('../sms.service')
}

describe('sms.service without Twilio credentials', () => {
  beforeEach(() => {
    clearTwilioEnv()
    jest.resetModules()
  })

  it('isSmsConfigured returns false', () => {
    clearTwilioEnv()
    const { isSmsConfigured } = reloadSmsService()
    expect(process.env.TWILIO_ACCOUNT_SID).toBe('')
    expect(isSmsConfigured()).toBe(false)
  })

  it('sendSmsText returns not configured error', async () => {
    clearTwilioEnv()
    const { sendSmsText } = reloadSmsService()
    const result = await sendSmsText('+966501234567', 'Test')
    expect(result.ok).toBe(false)
    expect(result.error).toBe('SMS not configured')
  })
})
