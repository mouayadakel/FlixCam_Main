const mockSendWhatsAppOtp = jest.fn()
const mockSendSmsOtp = jest.fn()
const mockSendSmsText = jest.fn()

jest.mock('@/lib/services/whatsapp.service', () => ({
  WhatsAppService: {
    sendWhatsAppOtp: (...args: unknown[]) => mockSendWhatsAppOtp(...args),
  },
}))

jest.mock('@/lib/services/sms.service', () => ({
  SmsService: {
    sendSmsOtp: (...args: unknown[]) => mockSendSmsOtp(...args),
    sendSmsText: (...args: unknown[]) => mockSendSmsText(...args),
  },
}))

import { deliverOtpCode, deliverPasswordResetLink } from '@/lib/services/otp-delivery.service'

const originalEnv = process.env

describe('otp-delivery.service', () => {
  beforeEach(() => {
    process.env = { ...originalEnv }
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation(() => {})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  afterAll(() => {
    process.env = originalEnv
  })

  it('uses SMS first when dedicated SMS sender is configured', async () => {
    process.env = {
      ...process.env,
      NODE_ENV: 'production',
      ENABLE_WHATSAPP: 'true',
      ENABLE_SMS: 'true',
      TWILIO_SMS_PHONE_NUMBER: '+15551234567',
      OTP_TRY_WHATSAPP_FIRST: 'false',
    }
    mockSendSmsOtp.mockResolvedValue({ ok: true, messageId: 'SM456' })

    const result = await deliverOtpCode({
      phone: '966501234567',
      code: '123456',
    })

    expect(result).toEqual({ ok: true, channel: 'sms' })
    expect(mockSendSmsOtp).toHaveBeenCalled()
    expect(mockSendWhatsAppOtp).not.toHaveBeenCalled()
  })

  it('uses WhatsApp first when no TWILIO_SMS_PHONE_NUMBER but WhatsApp sender env is set', async () => {
    process.env = {
      ...process.env,
      NODE_ENV: 'production',
      ENABLE_WHATSAPP: 'true',
      ENABLE_SMS: 'true',
      TWILIO_WHATSAPP_PHONE_NUMBER: 'whatsapp:+14155238886',
    }
    delete process.env.TWILIO_SMS_PHONE_NUMBER
    delete process.env.OTP_TRY_WHATSAPP_FIRST
    mockSendWhatsAppOtp.mockResolvedValue({ ok: true, messageId: 'WA123' })

    const result = await deliverOtpCode({
      phone: '966501234567',
      code: '123456',
    })

    expect(result).toEqual({ ok: true, channel: 'whatsapp' })
    expect(mockSendWhatsAppOtp).toHaveBeenCalled()
    expect(mockSendSmsOtp).not.toHaveBeenCalled()
  })

  it('uses WhatsApp first when OTP_TRY_WHATSAPP_FIRST is true', async () => {
    process.env = {
      ...process.env,
      NODE_ENV: 'production',
      ENABLE_WHATSAPP: 'true',
      ENABLE_SMS: 'true',
      OTP_TRY_WHATSAPP_FIRST: 'true',
    }
    mockSendWhatsAppOtp.mockResolvedValue({ ok: true, messageId: 'WA123' })

    const result = await deliverOtpCode({
      phone: '966501234567',
      code: '123456',
    })

    expect(result).toEqual({ ok: true, channel: 'whatsapp' })
    expect(mockSendSmsOtp).not.toHaveBeenCalled()
  })

  it('falls back to WhatsApp when SMS fails (SMS-first order)', async () => {
    process.env = {
      ...process.env,
      NODE_ENV: 'production',
      ENABLE_WHATSAPP: 'true',
      ENABLE_SMS: 'true',
      TWILIO_SMS_PHONE_NUMBER: '+15551234567',
      OTP_TRY_WHATSAPP_FIRST: 'false',
    }
    mockSendSmsOtp.mockResolvedValue({ ok: false, error: 'SMS failed' })
    mockSendWhatsAppOtp.mockResolvedValue({ ok: true, messageId: 'WA123' })

    const result = await deliverOtpCode({
      phone: '966501234567',
      code: '123456',
    })

    expect(result).toEqual({ ok: true, channel: 'whatsapp' })
    expect(mockSendWhatsAppOtp).toHaveBeenCalled()
  })

  it('falls back to SMS with custom body when WhatsApp fails (legacy order)', async () => {
    process.env = {
      ...process.env,
      NODE_ENV: 'production',
      ENABLE_WHATSAPP: 'true',
      ENABLE_SMS: 'true',
      OTP_TRY_WHATSAPP_FIRST: 'true',
    }
    mockSendWhatsAppOtp.mockResolvedValue({ ok: false, error: 'WA failed' })
    mockSendSmsText.mockResolvedValue({ ok: true, messageId: 'SM123' })

    const result = await deliverOtpCode({
      phone: '966501234567',
      code: '123456',
      smsBody: 'Custom OTP body',
    })

    expect(result).toEqual({ ok: true, channel: 'sms' })
    expect(mockSendSmsText).toHaveBeenCalledWith('966501234567', 'Custom OTP body', {
      logToMessageLog: true,
    })
  })

  it('uses development fallback when providers fail outside production', async () => {
    process.env = {
      ...process.env,
      NODE_ENV: 'development',
      ENABLE_WHATSAPP: 'true',
      ENABLE_SMS: 'true',
      TWILIO_SMS_PHONE_NUMBER: '+15551234567',
      OTP_TRY_WHATSAPP_FIRST: 'false',
    }
    mockSendSmsOtp.mockResolvedValue({ ok: false, error: 'SMS failed' })
    mockSendWhatsAppOtp.mockResolvedValue({ ok: false, error: 'WA failed' })

    const result = await deliverOtpCode({
      phone: '966501234567',
      code: '123456',
    })

    expect(result).toEqual({
      ok: true,
      channel: 'development',
      error: 'WA failed',
    })
  })

  it('returns the Twilio configuration message in production when SMS sender is invalid', async () => {
    process.env = {
      ...process.env,
      NODE_ENV: 'production',
      ENABLE_WHATSAPP: 'false',
      ENABLE_SMS: 'true',
    }
    mockSendSmsOtp.mockResolvedValue({
      ok: false,
      error: 'From number invalid',
      fromNumberInvalid: true,
    })

    const result = await deliverOtpCode({
      phone: '966501234567',
      code: '123456',
    })

    expect(result).toEqual({
      ok: false,
      error: 'From number invalid',
      userMessage: 'SMS not configured correctly. Please contact support.',
    })
  })

  it('returns combined guidance when SMS From is invalid and WhatsApp also fails', async () => {
    process.env = {
      ...process.env,
      NODE_ENV: 'production',
      ENABLE_WHATSAPP: 'true',
      ENABLE_SMS: 'true',
      TWILIO_SMS_PHONE_NUMBER: '+15551234567',
      OTP_TRY_WHATSAPP_FIRST: 'false',
    }
    mockSendSmsOtp.mockResolvedValue({
      ok: false,
      error: 'From number invalid',
      fromNumberInvalid: true,
    })
    mockSendWhatsAppOtp.mockResolvedValue({ ok: false, error: 'Template missing' })

    const result = await deliverOtpCode({
      phone: '966501234567',
      code: '123456',
    })

    expect(result.ok).toBe(false)
    expect(result.userMessage).toContain('TWILIO_SMS_PHONE_NUMBER')
    expect(result.error).toBe('Template missing')
  })

  it('skips WhatsApp OTP template for password reset when no dedicated template is configured and uses SMS', async () => {
    process.env = {
      ...process.env,
      NODE_ENV: 'production',
      ENABLE_WHATSAPP: 'true',
      ENABLE_SMS: 'true',
    }
    mockSendSmsText.mockResolvedValue({ ok: true, messageId: 'SM123' })

    const result = await deliverPasswordResetLink({
      phone: '966501234567',
      resetUrl: 'https://flixcam.rent/reset-password?token=abc',
      smsBody: 'Reset your password',
    })

    expect(result).toEqual({ ok: true, channel: 'sms' })
    expect(mockSendWhatsAppOtp).not.toHaveBeenCalled()
    expect(mockSendSmsText).toHaveBeenCalledWith('966501234567', 'Reset your password', {
      logToMessageLog: true,
    })
  })

  it('uses dedicated WhatsApp template for password reset when configured', async () => {
    process.env = {
      ...process.env,
      NODE_ENV: 'production',
      ENABLE_WHATSAPP: 'true',
      ENABLE_SMS: 'true',
      TWILIO_WHATSAPP_PASSWORD_RESET_CONTENT_SID: 'HXreset123',
    }
    mockSendWhatsAppOtp.mockResolvedValue({ ok: true, messageId: 'WA123' })

    const result = await deliverPasswordResetLink({
      phone: '966501234567',
      resetUrl: 'https://flixcam.rent/reset-password?token=abc',
      smsBody: 'Reset your password',
    })

    expect(result).toEqual({ ok: true, channel: 'whatsapp' })
    expect(mockSendWhatsAppOtp).toHaveBeenCalledWith(
      '966501234567',
      'https://flixcam.rent/reset-password?token=abc',
      'HXreset123'
    )
    expect(mockSendSmsText).not.toHaveBeenCalled()
  })
})
