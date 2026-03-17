/**
 * @file sms.service.ts
 * @description SMS sending via Twilio
 * @module lib/services/sms
 */

import Twilio from 'twilio'
import { prisma } from '@/lib/db/prisma'
import { MessageLogStatus, NotificationChannel } from '@prisma/client'

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
const fromNumber = process.env.TWILIO_PHONE_NUMBER

const twilioClient =
  accountSid && authToken ? Twilio(accountSid, authToken) : null

const DEFAULT_COUNTRY_CODE = '966'

/**
 * Normalize phone number for Saudi Arabia (and similar E.164).
 * Removes spaces/dashes, ensures country code.
 */
export function normalizePhoneForSms(phone: string): string {
  let normalized = phone.replace(/[\s\-()]/g, '')
  if (normalized.startsWith('0')) {
    normalized = DEFAULT_COUNTRY_CODE + normalized.slice(1)
  }
  if (!normalized.startsWith('+') && !normalized.startsWith(DEFAULT_COUNTRY_CODE)) {
    normalized = DEFAULT_COUNTRY_CODE + normalized
  }
  if (!normalized.startsWith('+')) {
    normalized = '+' + normalized
  }
  return normalized
}

/**
 * Check if SMS is configured and enabled.
 */
export function isSmsConfigured(): boolean {
  if (process.env.ENABLE_SMS === 'false') return false
  return !!(twilioClient && fromNumber)
}

export interface SendSmsResult {
  ok: boolean
  messageId?: string
  error?: string
  /** Twilio error code when available (e.g. 21608 = trial restriction) */
  twilioCode?: number
  /** True when TWILIO_PHONE_NUMBER is not a valid Twilio-owned number (21606/21659) */
  fromNumberInvalid?: boolean
}

/**
 * Send a plain text SMS.
 */
export async function sendSmsText(
  to: string,
  body: string,
  options?: { logToMessageLog?: boolean; recipientUserId?: string; templateId?: string }
): Promise<SendSmsResult> {
  if (!twilioClient || !fromNumber) {
    return { ok: false, error: 'SMS not configured' }
  }

  const toNormalized = normalizePhoneForSms(to)

  try {
    const message = await twilioClient.messages.create({
      body,
      from: fromNumber,
      to: toNormalized,
    })

    if (options?.logToMessageLog !== false) {
      await prisma.messageLog.create({
        data: {
          channel: NotificationChannel.SMS,
          recipientPhone: toNormalized,
          subject: null,
          body,
          status: message.status === 'failed' ? MessageLogStatus.FAILED : MessageLogStatus.SENT,
          externalId: message.sid,
          errorMessage: message.errorMessage ?? null,
          sentAt: message.dateSent ? new Date(message.dateSent) : new Date(),
          templateId: options?.templateId ?? null,
          recipientUserId: options?.recipientUserId ?? null,
        },
      })
    }

    return {
      ok: message.status !== 'failed',
      messageId: message.sid,
      error: message.errorMessage ?? undefined,
    }
  } catch (error) {
    const err = error as { message?: string; code?: number | string; status?: number; moreInfo?: string }
    const errorMessage = err?.message ?? (error instanceof Error ? error.message : 'Unknown error')
    const rawCode = err?.code ?? (err as { twilioCode?: number })?.twilioCode
    const code = typeof rawCode === 'number' ? rawCode : typeof rawCode === 'string' ? parseInt(rawCode, 10) : undefined
    const twilioDetails =
      typeof code === 'number' || typeof err?.status === 'number'
        ? { code, status: err.status, moreInfo: err.moreInfo }
        : {}
    const isFromNumberInvalid =
      /'From'.*is not a Twilio phone number|country mismatch/i.test(errorMessage) ||
      code === 21606 ||
      code === 21659
    if (isFromNumberInvalid) {
      console.error('[SMS] Twilio FROM number invalid – use a number from Twilio Console', {
        fromNumber: fromNumber,
        to: toNormalized,
        hint: 'Set TWILIO_PHONE_NUMBER to a number you own in Twilio Console (Phone Numbers). Trial accounts typically get US numbers.',
        ...twilioDetails,
        timestamp: new Date().toISOString(),
      })
    } else {
      console.error('[SMS] Twilio send failed', {
        to: toNormalized,
        toRaw: to,
        error: errorMessage,
        ...twilioDetails,
        timestamp: new Date().toISOString(),
      })
    }
    if (options?.logToMessageLog !== false) {
      await prisma.messageLog.create({
        data: {
          channel: NotificationChannel.SMS,
          recipientPhone: toNormalized,
          subject: null,
          body,
          status: MessageLogStatus.FAILED,
          errorMessage: errorMessage,
          templateId: options?.templateId ?? null,
          recipientUserId: options?.recipientUserId ?? null,
        },
      })
    }
    return {
      ok: false,
      error: errorMessage,
      twilioCode: typeof code === 'number' ? code : undefined,
      fromNumberInvalid: isFromNumberInvalid,
    }
  }
}

/**
 * Send OTP code via SMS (e.g. for login or password reset).
 */
export async function sendSmsOtp(
  to: string,
  code: string,
  options?: { recipientUserId?: string }
): Promise<SendSmsResult> {
  const body = `Your verification code is: ${code}. Do not share this code.`
  return sendSmsText(to, body, {
    ...options,
    logToMessageLog: true,
  })
}

/**
 * Send SMS from a template. Pass the pre-rendered body (rendered by TemplateRendererService by caller).
 * Use templateId so MessageLog can link to the template.
 */
export async function sendSmsFromTemplate(
  to: string,
  body: string,
  options?: { recipientUserId?: string; templateId?: string }
): Promise<SendSmsResult> {
  return sendSmsText(to, body, {
    ...options,
    templateId: options?.templateId,
  })
}

export const SmsService = {
  normalizePhoneForSms,
  isSmsConfigured,
  sendSmsText,
  sendSmsOtp,
  sendSmsFromTemplate,
}
