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

  it('uses WhatsApp first when available', async () => {
    process.env = {
      ...process.env,
      NODE_ENV: 'production',
      ENABLE_WHATSAPP: 'true',
      ENABLE_SMS: 'true',
    }
    mockSendWhatsAppOtp.mockResolvedValue({ ok: true, messageId: 'WA123' })

    const result = await deliverOtpCode({
      phone: '966501234567',
      code: '123456',
    })

    expect(result).toEqual({ ok: true, channel: 'whatsapp' })
    expect(mockSendSmsOtp).not.toHaveBeenCalled()
  })

  it('falls back to SMS when WhatsApp fails', async () => {
    process.env = {
      ...process.env,
      NODE_ENV: 'production',
      ENABLE_WHATSAPP: 'true',
      ENABLE_SMS: 'true',
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
    }
    mockSendWhatsAppOtp.mockResolvedValue({ ok: false, error: 'WA failed' })
    mockSendSmsOtp.mockResolvedValue({ ok: false, error: 'SMS failed' })

    const result = await deliverOtpCode({
      phone: '966501234567',
      code: '123456',
    })

    expect(result).toEqual({
      ok: true,
      channel: 'development',
      error: 'SMS failed',
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
