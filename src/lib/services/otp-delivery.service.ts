import type { SendSmsResult } from '@/lib/services/sms.service'

export interface DeliverOtpCodeOptions {
  phone: string
  code: string
  smsBody?: string
  logContext?: string
  /** When true, only use WhatsApp (no SMS fallback). Used for password reset to match sign-in OTP flow. */
  whatsappOnly?: boolean
}

export interface DeliverOtpCodeResult {
  ok: boolean
  channel?: 'whatsapp' | 'sms' | 'development'
  error?: string
  userMessage?: string
}

export interface DeliverPasswordResetLinkOptions {
  phone: string
  resetUrl: string
  smsBody: string
  logContext?: string
}

export interface DeliverPasswordResetLinkResult {
  ok: boolean
  channel?: 'whatsapp' | 'sms' | 'development'
  error?: string
  userMessage?: string
}

function getSmsUserMessage(result: Pick<SendSmsResult, 'error' | 'twilioCode' | 'fromNumberInvalid'>): string {
  if (result.fromNumberInvalid || result.error === 'SMS not configured') {
    return 'SMS not configured correctly. Please contact support.'
  }
  if (result.twilioCode === 21608) {
    return 'SMS trial: verify this number in Twilio Console. Otherwise contact support.'
  }
  if (result.twilioCode === 21211) {
    return 'Invalid phone number format. Use 05XXXXXXXX or +9665XXXXXXXX.'
  }
  return 'Failed to send OTP. Please try again.'
}

export async function deliverOtpCode({
  phone,
  code,
  smsBody,
  logContext = '[AUTH][otp]',
  whatsappOnly = false,
}: DeliverOtpCodeOptions): Promise<DeliverOtpCodeResult> {
  let lastError: string | undefined
  let smsFailure: SendSmsResult | undefined

  if (process.env.ENABLE_WHATSAPP === 'true') {
    const { WhatsAppService } = await import('@/lib/services/whatsapp.service')
    const result = await WhatsAppService.sendWhatsAppOtp(phone, code)
    if (result.ok) {
      return { ok: true, channel: 'whatsapp' }
    }
    lastError = result.error
    console.error(`${logContext} WhatsApp OTP failed`, {
      phone,
      error: result.error,
      timestamp: new Date().toISOString(),
    })
  }

  if (!whatsappOnly && process.env.ENABLE_SMS === 'true') {
    const { SmsService } = await import('@/lib/services/sms.service')
    const result = smsBody
      ? await SmsService.sendSmsText(phone, smsBody, { logToMessageLog: true })
      : await SmsService.sendSmsOtp(phone, code)

    if (result.ok) {
      return { ok: true, channel: 'sms' }
    }

    smsFailure = result
    lastError = result.error
    console.error(`${logContext} SMS OTP failed`, {
      phone,
      error: result.error,
      twilioCode: result.twilioCode,
      fromNumberInvalid: result.fromNumberInvalid,
      timestamp: new Date().toISOString(),
    })
  }

  if (process.env.NODE_ENV !== 'production') {
    console.warn(`${logContext} OTP delivery fallback used in non-production`, {
      phone,
      code,
      error: lastError ?? 'No provider enabled',
      timestamp: new Date().toISOString(),
    })
    return {
      ok: true,
      channel: 'development',
      error: lastError,
    }
  }

  return {
    ok: false,
    error: lastError,
    userMessage: smsFailure ? getSmsUserMessage(smsFailure) : 'Failed to send OTP. Please try again.',
  }
}

let _passwordResetEnvWarned = false
function warnPasswordResetEnv(): void {
  if (_passwordResetEnvWarned) return
  _passwordResetEnvWarned = true
  const checks: string[] = []
  if (process.env.ENABLE_WHATSAPP === 'true') {
    if (!process.env.TWILIO_WHATSAPP_PASSWORD_RESET_CONTENT_SID?.trim()) {
      checks.push('TWILIO_WHATSAPP_PASSWORD_RESET_CONTENT_SID (required when ENABLE_WHATSAPP=true)')
    }
    if (!process.env.TWILIO_ACCOUNT_SID?.trim() || !process.env.TWILIO_AUTH_TOKEN?.trim()) {
      checks.push('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN')
    }
    if (!process.env.TWILIO_PHONE_NUMBER?.trim()) {
      checks.push('TWILIO_PHONE_NUMBER')
    }
  }
  if (process.env.ENABLE_SMS === 'true') {
    if (!process.env.TWILIO_ACCOUNT_SID?.trim() || !process.env.TWILIO_AUTH_TOKEN?.trim()) {
      checks.push('TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN')
    }
    if (!process.env.TWILIO_PHONE_NUMBER?.trim()) {
      checks.push('TWILIO_PHONE_NUMBER')
    }
  }
  if (checks.length > 0) {
    console.warn(
      '[ForgotPassword] Missing or empty env vars for password reset delivery:',
      checks.join(', ')
    )
  }
}

export async function deliverPasswordResetLink({
  phone,
  resetUrl,
  smsBody,
  logContext = '[AUTH][forgot-password]',
}: DeliverPasswordResetLinkOptions): Promise<DeliverPasswordResetLinkResult> {
  warnPasswordResetEnv()
  let lastError: string | undefined
  let smsFailure: SendSmsResult | undefined

  if (process.env.ENABLE_WHATSAPP === 'true') {
    const passwordResetTemplateSid = process.env.TWILIO_WHATSAPP_PASSWORD_RESET_CONTENT_SID
    if (passwordResetTemplateSid) {
      const { WhatsAppService } = await import('@/lib/services/whatsapp.service')
      const result = await WhatsAppService.sendWhatsAppOtp(phone, resetUrl, passwordResetTemplateSid)
      if (result.ok) {
        return { ok: true, channel: 'whatsapp' }
      }
      lastError = result.error
      console.error(`${logContext} WhatsApp password reset failed`, {
        phone,
        error: result.error,
        templateSid: passwordResetTemplateSid,
        timestamp: new Date().toISOString(),
      })
    } else {
      lastError = 'WhatsApp password reset template not configured'
      console.warn(`${logContext} WhatsApp password reset skipped`, {
        phone,
        reason: lastError,
        timestamp: new Date().toISOString(),
      })
    }
  }

  if (process.env.ENABLE_SMS === 'true') {
    const { SmsService } = await import('@/lib/services/sms.service')
    const result = await SmsService.sendSmsText(phone, smsBody, { logToMessageLog: true })
    if (result.ok) {
      return { ok: true, channel: 'sms' }
    }

    smsFailure = result
    lastError = result.error
    console.error(`${logContext} SMS password reset failed`, {
      phone,
      error: result.error,
      twilioCode: result.twilioCode,
      fromNumberInvalid: result.fromNumberInvalid,
      timestamp: new Date().toISOString(),
    })
  }

  if (process.env.NODE_ENV !== 'production' && !lastError) {
    console.warn(`${logContext} No provider enabled – reset link for dev testing:`, resetUrl, {
      phone,
      timestamp: new Date().toISOString(),
    })
    return {
      ok: true,
      channel: 'development',
      error: 'No provider enabled',
    }
  }

  if (process.env.NODE_ENV !== 'production' && lastError) {
    console.warn(`${logContext} Delivery failed in non-production`, {
      phone,
      resetUrl,
      error: lastError,
      timestamp: new Date().toISOString(),
    })
  }

  return {
    ok: false,
    error: lastError,
    userMessage: smsFailure ? getSmsUserMessage(smsFailure) : 'Failed to send reset link. Please try again.',
  }
}
