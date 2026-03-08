/**
 * Unit tests for sms.service
 */

const mockMessagesCreate = jest.fn().mockResolvedValue({
  sid: 'SM123',
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
jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    messageLog: { create: (...args: unknown[]) => mockMessageLogCreate(...args) },
  },
}))

const originalEnv = process.env

describe('sms.service', () => {
  beforeAll(() => {
    process.env.TWILIO_ACCOUNT_SID = 'AC'
    process.env.TWILIO_AUTH_TOKEN = 'token'
    process.env.TWILIO_PHONE_NUMBER = '+966501234567'
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('normalizePhoneForSms', () => {
    it('adds +966 for local numbers', async () => {
      const { normalizePhoneForSms } = await import('../sms.service')
      expect(normalizePhoneForSms('501234567')).toBe('+966501234567')
    })
    it('replaces leading 0 with 966', async () => {
      const { normalizePhoneForSms } = await import('../sms.service')
      expect(normalizePhoneForSms('0501234567')).toBe('+966501234567')
    })
    it('keeps +966 as is', async () => {
      const { normalizePhoneForSms } = await import('../sms.service')
      expect(normalizePhoneForSms('+966501234567')).toBe('+966501234567')
    })
    it('strips spaces and dashes', async () => {
      const { normalizePhoneForSms } = await import('../sms.service')
      expect(normalizePhoneForSms('050 123 4567')).toBe('+966501234567')
    })
  })

  describe('isSmsConfigured', () => {
    it('returns true when Twilio env set', async () => {
      const { isSmsConfigured } = await import('../sms.service')
      expect(isSmsConfigured()).toBe(true)
    })
    it('returns false when ENABLE_SMS is false', async () => {
      process.env.ENABLE_SMS = 'false'
      const { isSmsConfigured } = await import('../sms.service')
      expect(isSmsConfigured()).toBe(false)
      delete process.env.ENABLE_SMS
    })
  })

  describe('sendSmsText', () => {
    it('sends and returns ok when configured', async () => {
      const { sendSmsText } = await import('../sms.service')
      const result = await sendSmsText('+966501234567', 'Test message')
      expect(result.ok).toBe(true)
      expect(result.messageId).toBe('SM123')
    })
    it('returns ok false when Twilio returns status failed', async () => {
      mockMessagesCreate.mockResolvedValueOnce({
        sid: 'SM123',
        status: 'failed',
        errorMessage: 'Carrier error',
        dateSent: null,
      })
      const { sendSmsText } = await import('../sms.service')
      const result = await sendSmsText('+966501234567', 'Test')
      expect(result.ok).toBe(false)
      expect(result.error).toBe('Carrier error')
      expect(mockMessageLogCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'FAILED',
            errorMessage: 'Carrier error',
          }),
        })
      )
    })
    it('returns error and logs when Twilio throws', async () => {
      mockMessagesCreate.mockRejectedValueOnce(new Error('Twilio network error'))
      const { sendSmsText } = await import('../sms.service')
      const result = await sendSmsText('+966501234567', 'Test')
      expect(result.ok).toBe(false)
      expect(result.error).toBe('Twilio network error')
      expect(mockMessageLogCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'FAILED',
            errorMessage: 'Twilio network error',
          }),
        })
      )
    })
    it('returns Unknown error when non-Error thrown', async () => {
      mockMessagesCreate.mockRejectedValueOnce('string error')
      const { sendSmsText } = await import('../sms.service')
      const result = await sendSmsText('+966501234567', 'Test')
      expect(result.ok).toBe(false)
      expect(result.error).toBe('Unknown error')
    })
    it('skips log when logToMessageLog false and Twilio throws', async () => {
      mockMessagesCreate.mockRejectedValueOnce(new Error('Err'))
      const { sendSmsText } = await import('../sms.service')
      const result = await sendSmsText('+966501234567', 'Test', {
        logToMessageLog: false,
      })
      expect(result.ok).toBe(false)
      expect(mockMessageLogCreate).not.toHaveBeenCalled()
    })
    it('returns error when not configured', async () => {
      const origSid = process.env.TWILIO_ACCOUNT_SID
      delete process.env.TWILIO_ACCOUNT_SID
      jest.resetModules()
      const { sendSmsText } = await import('../sms.service')
      const result = await sendSmsText('+966501234567', 'Test')
      expect(result.ok).toBe(false)
      expect(result.error).toBe('SMS not configured')
      process.env.TWILIO_ACCOUNT_SID = origSid
      jest.resetModules()
    })
  })

  describe('sendSmsOtp', () => {
    it('sends OTP message with code', async () => {
      const { sendSmsOtp } = await import('../sms.service')
      const result = await sendSmsOtp('+966501234567', '123456')
      expect(result.ok).toBe(true)
      expect(result.messageId).toBe('SM123')
    })
  })

  describe('sendSmsFromTemplate', () => {
    it('sends pre-rendered template body', async () => {
      const { sendSmsFromTemplate } = await import('../sms.service')
      const result = await sendSmsFromTemplate('+966501234567', 'Hello {{name}}', {
        templateId: 'tpl_1',
      })
      expect(result.ok).toBe(true)
    })
  })
})

export {}
