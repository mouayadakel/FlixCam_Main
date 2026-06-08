/**
 * @file whatsapp.service.ts
 * @description WhatsApp sending via Meta Cloud API (Business API)
 * @module lib/services/whatsapp
 */

import Twilio from 'twilio'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { MessageLogStatus, NotificationChannel } from '@prisma/client'

const accountSid = process.env.TWILIO_ACCOUNT_SID
const authToken = process.env.TWILIO_AUTH_TOKEN
// WhatsApp sender: sandbox `whatsapp:+14155238886` or production approved sender.
// Do NOT use TWILIO_PHONE_NUMBER here — that is the SMS "From" and causes 63031 if it matches a recipient.
// DB MessagingChannelConfig.businessPhone can still supply the WhatsApp sender at send time.
const twilioPhoneNumber =
  process.env.TWILIO_WHATSAPP_PHONE_NUMBER?.trim() ||
  process.env.TWILIO_WHATSAPP_NUMBER?.trim() ||
  ''

const twilioClient = accountSid && authToken ? Twilio(accountSid, authToken) : null
const DEFAULT_COUNTRY_CODE = '966'

/**
 * Format phone number for Twilio WhatsApp API.
 * Ensures it starts with "whatsapp:+"
 */
export function normalizePhoneForWhatsApp(phone: string): string {
  let normalized = phone.replace(/[\s\-()]/g, '')

  // Remove 'whatsapp:' prefix if it was randomly passed in
  if (normalized.startsWith('whatsapp:')) {
    normalized = normalized.slice(9)
  }

  // Handle local numbers starting with 0
  if (normalized.startsWith('0')) {
    normalized = DEFAULT_COUNTRY_CODE + normalized.slice(1)
  }

  // Ensure country code is present
  if (!normalized.startsWith('+') && !normalized.startsWith(DEFAULT_COUNTRY_CODE)) {
    normalized = DEFAULT_COUNTRY_CODE + normalized
  }

  // Ensure + is present
  if (!normalized.startsWith('+')) {
    normalized = '+' + normalized
  }

  // Twilio requires the 'whatsapp:' prefix for the 'to' number
  return `whatsapp:${normalized}`
}

function getSenderNumber(): string {
  if (!twilioPhoneNumber) return ''
  return twilioPhoneNumber.startsWith('whatsapp:')
    ? twilioPhoneNumber
    : `whatsapp:${twilioPhoneNumber}`
}

async function getConfiguredSenderNumber(): Promise<string> {
  const fallback = getSenderNumber()

  // When TWILIO_WHATSAPP_PHONE_NUMBER is set, it must win over CMS/DB.
  // DB sometimes stores a personal mobile — Twilio then rejects WhatsApp (63031 / invalid sender) and OTP breaks.
  if (fallback) return fallback

  try {
    const config = await prisma.messagingChannelConfig.findUnique({
      where: { channel: NotificationChannel.WHATSAPP },
      select: { businessPhone: true },
    })

    const raw = config?.businessPhone?.trim()
    if (!raw) return ''
    return raw.startsWith('whatsapp:') ? raw : normalizePhoneForWhatsApp(raw)
  } catch {
    return ''
  }
}

export function isWhatsAppConfigured(): boolean {
  if (process.env.ENABLE_WHATSAPP === 'false') return false
  if (!twilioClient) return false
  // Env sender set, or ENABLE_WHATSAPP=true so sendWhatsAppText can use DB businessPhone only
  if (twilioPhoneNumber) return true
  return process.env.ENABLE_WHATSAPP === 'true'
}

export interface SendWhatsAppResult {
  ok: boolean
  messageId?: string
  error?: string
}

/**
 * Send plain text message via Twilio.
 */
export async function sendWhatsAppText(
  to: string,
  text: string,
  options?: { logToMessageLog?: boolean; recipientUserId?: string; templateId?: string }
): Promise<SendWhatsAppResult> {
  const senderNumber = await getConfiguredSenderNumber()

  if (!twilioClient || !senderNumber) {
    return { ok: false, error: 'WhatsApp (Twilio) not configured' }
  }

  const toNormalized = normalizePhoneForWhatsApp(to)
  let result: SendWhatsAppResult

  const fromDigits = senderNumber.replace(/^whatsapp:/, '').replace(/\D/g, '')
  const toDigits = toNormalized.replace(/^whatsapp:/, '').replace(/\D/g, '')
  const sameFromTo =
    fromDigits.length >= 9 &&
    toDigits.length >= 9 &&
    fromDigits === toDigits

  if (sameFromTo) {
    const msg =
      'WhatsApp blocked: From and To are the same number (63031). Set TWILIO_WHATSAPP_PHONE_NUMBER or MessagingChannelConfig.businessPhone to the Twilio WhatsApp sender, not the staff mobile.'
    logger.error('[WhatsApp] sendWhatsAppText skipped same From/To', {
      to: toNormalized,
      hint: msg,
    })
    result = { ok: false, error: msg }
  } else {
    try {
      const message = await twilioClient.messages.create({
        body: text,
        from: senderNumber,
        to: toNormalized,
      })

      result = { ok: true, messageId: message.sid }
    } catch (err) {
      const e = err as { message?: string; code?: number; status?: number; moreInfo?: string }
      const errorMsg = e?.message ?? (err instanceof Error ? err.message : 'Unknown Twilio Error')
      result = { ok: false, error: errorMsg }
      logger.error('[WhatsApp] sendWhatsAppText failed', {
        to: toNormalized,
        error: errorMsg,
        code: e?.code,
        status: e?.status,
        timestamp: new Date().toISOString(),
      })
    }
  }

  if (options?.logToMessageLog !== false) {
    await prisma.messageLog.create({
      data: {
        channel: NotificationChannel.WHATSAPP,
        recipientPhone: toNormalized,
        body: text,
        status: result.ok ? MessageLogStatus.SENT : MessageLogStatus.FAILED,
        externalId: result.messageId ?? null,
        errorMessage: result.error ?? null,
        sentAt: result.ok ? new Date() : null,
        templateId: options?.templateId ?? null,
        recipientUserId: options?.recipientUserId ?? null,
      },
    })
  }

  return result
}

/**
 * Send pre-approved template message.
 * Twilio handles Content Templates using Content SID (Content API).
 * Alternatively, passing the exact approved text body triggers standard WhatsApp templates.
 */
interface TemplateParameter {
  type: 'text' | 'image' | 'document' | 'video'
  text?: string
  image?: { link: string }
  document?: { link: string; filename?: string }
  video?: { link: string }
}

export async function sendWhatsAppTemplate(
  to: string,
  templateName: string,
  languageCode: string,
  components?: Array<{ type: 'body' | 'header' | 'button'; parameters: TemplateParameter[] }>,
  options?: { logToMessageLog?: boolean; recipientUserId?: string; templateId?: string }
): Promise<SendWhatsAppResult> {
  const senderNumber = await getConfiguredSenderNumber()

  if (!twilioClient || !senderNumber) {
    return { ok: false, error: 'WhatsApp (Twilio) not configured' }
  }

  const toNormalized = normalizePhoneForWhatsApp(to)
  let result: SendWhatsAppResult

  try {
    // Note: To use strict Meta templates with Twilio without the Content API,
    // you typically just send the EXACT approved text body.
    // If you use Twilio Content API, you would pass contentSid: 'HX...' and contentVariables.
    // We will fallback to a best-effort text extraction from components for standard API usage,
    // assuming the exact template body needs to be constructed by the caller or passed as text.
    let fallbackText = `[Template: ${templateName}]`

    // Attempt basic extraction if parameters are provided
    if (components) {
      const bodyComponent = components.find((c) => c.type === 'body')
      if (bodyComponent && bodyComponent.parameters.length > 0) {
        fallbackText = bodyComponent.parameters.map((p) => p.text || '').join(' ')
      }
    }

    const message = await twilioClient.messages.create({
      body: fallbackText,
      from: senderNumber,
      to: toNormalized,
    })

    result = { ok: true, messageId: message.sid }
  } catch (err) {
    const e = err as { message?: string; code?: number; status?: number }
    const errorMsg = e?.message ?? (err instanceof Error ? err.message : 'Unknown Twilio Error')
    result = { ok: false, error: errorMsg }
    logger.error('[WhatsApp] sendWhatsAppTemplate failed', {
      to: toNormalized,
      template: templateName,
      error: errorMsg,
      code: e?.code,
      timestamp: new Date().toISOString(),
    })
  }

  if (options?.logToMessageLog !== false) {
    await prisma.messageLog.create({
      data: {
        channel: NotificationChannel.WHATSAPP,
        recipientPhone: toNormalized,
        body: `[Template: ${templateName}]`,
        status: result.ok ? MessageLogStatus.SENT : MessageLogStatus.FAILED,
        externalId: result.messageId ?? null,
        errorMessage: result.error ?? null,
        sentAt: result.ok ? new Date() : null,
        templateId: options?.templateId ?? null,
        recipientUserId: options?.recipientUserId ?? null,
      },
    })
  }

  return result
}

/**
 * Send an OTP code via an approved Twilio Content Template.
 */
export async function sendWhatsAppOtp(
  to: string,
  code: string,
  contentSid: string = 'HXc4caa42c7314184caa8f84bf81dc091a',
  options?: { logToMessageLog?: boolean; recipientUserId?: string }
): Promise<SendWhatsAppResult> {
  const senderNumber = await getConfiguredSenderNumber()

  if (!twilioClient || !senderNumber) {
    return { ok: false, error: 'WhatsApp (Twilio) not configured' }
  }

  const toNormalized = normalizePhoneForWhatsApp(to)
  let result: SendWhatsAppResult

  try {
    const message = await twilioClient.messages.create({
      contentSid,
      contentVariables: JSON.stringify({
        '1': code,
      }),
      from: senderNumber,
      to: toNormalized,
    })

    result = { ok: true, messageId: message.sid }
  } catch (err) {
    const e = err as { message?: string; code?: number; status?: number; moreInfo?: string }
    const errorMsg = e?.message ?? (err instanceof Error ? err.message : 'Unknown Twilio Error')
    result = { ok: false, error: errorMsg }
    logger.error('[WhatsApp] sendWhatsAppOtp failed', {
      to: toNormalized,
      contentSid,
      error: errorMsg,
      code: e?.code,
      status: e?.status,
      moreInfo: e?.moreInfo,
      timestamp: new Date().toISOString(),
    })
  }

  if (options?.logToMessageLog !== false) {
    await prisma.messageLog.create({
      data: {
        channel: NotificationChannel.WHATSAPP,
        recipientPhone: toNormalized,
        body: `[OTP Sent via Template ${contentSid}]`,
        status: result.ok ? MessageLogStatus.SENT : MessageLogStatus.FAILED,
        externalId: result.messageId ?? null,
        errorMessage: result.error ?? null,
        sentAt: result.ok ? new Date() : null,
        templateId: contentSid,
        recipientUserId: options?.recipientUserId ?? null,
      },
    })
  }

  return result
}

/**
 * Send interactive button message.
 * Note: Twilio requires the Content API to send WhatsApp interactive buttons natively.
 * If not using Content API, buttons will not render natively.
 * We fallback to rendering text instructions + choices here.
 */
export async function sendWhatsAppInteractiveButtons(
  to: string,
  bodyText: string,
  buttons: Array<{ id: string; title: string }>,
  options?: { logToMessageLog?: boolean; recipientUserId?: string; templateId?: string }
): Promise<SendWhatsAppResult> {
  const senderNumber = await getConfiguredSenderNumber()

  if (!twilioClient || !senderNumber) {
    return { ok: false, error: 'WhatsApp (Twilio) not configured' }
  }
  if (buttons.length > 3) {
    return { ok: false, error: 'Maximum 3 buttons allowed' }
  }

  const toNormalized = normalizePhoneForWhatsApp(to)
  let result: SendWhatsAppResult

  try {
    // Fallback: format buttons as text list since standard Twilio create message doesn't support
    // interactive buttons arrays directly without the Content API
    const buttonText = buttons.map((b, i) => `${i + 1}. ${b.title}`).join('\n')
    const fullBody = `${bodyText}\n\nReply with number:\n${buttonText}`

    const message = await twilioClient.messages.create({
      body: fullBody,
      from: senderNumber,
      to: toNormalized,
    })

    result = { ok: true, messageId: message.sid }
  } catch (err) {
    result = { ok: false, error: err instanceof Error ? err.message : 'Unknown Twilio Error' }
  }

  if (options?.logToMessageLog !== false) {
    await prisma.messageLog.create({
      data: {
        channel: NotificationChannel.WHATSAPP,
        recipientPhone: toNormalized,
        body: bodyText,
        status: result.ok ? MessageLogStatus.SENT : MessageLogStatus.FAILED,
        externalId: result.messageId ?? null,
        errorMessage: result.error ?? null,
        sentAt: result.ok ? new Date() : null,
        templateId: options?.templateId ?? null,
        recipientUserId: options?.recipientUserId ?? null,
      },
    })
  }

  return result
}

/**
 * Send document (e.g. PDF invoice).
 */
export async function sendWhatsAppDocument(
  to: string,
  documentUrl: string,
  options?: {
    caption?: string
    filename?: string
    logToMessageLog?: boolean
    recipientUserId?: string
    templateId?: string
  }
): Promise<SendWhatsAppResult> {
  const senderNumber = await getConfiguredSenderNumber()

  if (!twilioClient || !senderNumber) {
    return { ok: false, error: 'WhatsApp (Twilio) not configured' }
  }

  const toNormalized = normalizePhoneForWhatsApp(to)
  let result: SendWhatsAppResult

  try {
    const message = await twilioClient.messages.create({
      mediaUrl: [documentUrl],
      body: options?.caption || '',
      from: senderNumber,
      to: toNormalized,
    })

    result = { ok: true, messageId: message.sid }
  } catch (err) {
    result = { ok: false, error: err instanceof Error ? err.message : 'Unknown Twilio Error' }
  }

  if (options?.logToMessageLog !== false) {
    await prisma.messageLog.create({
      data: {
        channel: NotificationChannel.WHATSAPP,
        recipientPhone: toNormalized,
        body: options?.caption ?? documentUrl,
        status: result.ok ? MessageLogStatus.SENT : MessageLogStatus.FAILED,
        externalId: result.messageId ?? null,
        errorMessage: result.error ?? null,
        sentAt: result.ok ? new Date() : null,
        templateId: options?.templateId ?? null,
        recipientUserId: options?.recipientUserId ?? null,
      },
    })
  }

  return result
}

/**
 * Update MessageLog status (for webhook delivery/read receipts).
 */
export async function updateMessageLogStatus(
  externalId: string,
  status: MessageLogStatus,
  options?: { deliveredAt?: Date; readAt?: Date }
): Promise<void> {
  await prisma.messageLog.updateMany({
    where: { externalId },
    data: {
      status,
      ...(options?.deliveredAt && { deliveredAt: options.deliveredAt }),
      ...(options?.readAt && { readAt: options.readAt }),
    },
  })
}

export const WhatsAppService = {
  normalizePhoneForWhatsApp,
  isWhatsAppConfigured,
  sendWhatsAppText,
  sendWhatsAppTemplate,
  sendWhatsAppInteractiveButtons,
  sendWhatsAppDocument,
  updateMessageLogStatus,
  sendWhatsAppOtp,
}
