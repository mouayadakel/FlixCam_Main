/**
 * @file whatsapp.service.ts
 * @description WhatsApp sending via Meta Cloud API (Business API)
 * @module lib/services/whatsapp
 */

import { prisma } from '@/lib/db/prisma'
import { MessageLogStatus, NotificationChannel } from '@prisma/client'

const META_GRAPH_VERSION = 'v18.0'
const DEFAULT_COUNTRY_CODE = '966'

function getConfig() {
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID
  return { accessToken, phoneNumberId }
}

/**
 * Normalize phone number for WhatsApp (E.164, no + in "to" for API).
 */
export function normalizePhoneForWhatsApp(phone: string): string {
  let normalized = phone.replace(/[\s\-()]/g, '')
  if (normalized.startsWith('0')) {
    normalized = DEFAULT_COUNTRY_CODE + normalized.slice(1)
  }
  if (!normalized.startsWith('+') && !normalized.startsWith(DEFAULT_COUNTRY_CODE)) {
    normalized = DEFAULT_COUNTRY_CODE + normalized
  }
  if (normalized.startsWith('+')) {
    normalized = normalized.slice(1)
  }
  return normalized
}

export function isWhatsAppConfigured(): boolean {
  if (process.env.ENABLE_WHATSAPP === 'false') return false
  const { accessToken, phoneNumberId } = getConfig()
  return !!(accessToken && phoneNumberId)
}

export interface SendWhatsAppResult {
  ok: boolean
  messageId?: string
  error?: string
}

async function callMessagesApi(phoneNumberId: string, accessToken: string, body: object): Promise<{ ok: boolean; messageId?: string; error?: string }> {
  const res = await fetch(`https://graph.facebook.com/${META_GRAPH_VERSION}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      ...body,
    }),
  })

  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const error = (data as { error?: { message?: string } }).error?.message ?? res.statusText
    return { ok: false, error }
  }
  const messageId = (data as { messages?: Array<{ id: string }> }).messages?.[0]?.id
  return { ok: true, messageId }
}

/**
 * Send plain text message.
 */
export async function sendWhatsAppText(
  to: string,
  text: string,
  options?: { logToMessageLog?: boolean; recipientUserId?: string; templateId?: string }
): Promise<SendWhatsAppResult> {
  const { accessToken, phoneNumberId } = getConfig()
  if (!accessToken || !phoneNumberId) {
    return { ok: false, error: 'WhatsApp not configured' }
  }

  const toNormalized = normalizePhoneForWhatsApp(to)

  const result = await callMessagesApi(phoneNumberId, accessToken, {
    to: toNormalized,
    type: 'text',
    text: { body: text },
  })

  if (options?.logToMessageLog !== false) {
    await prisma.messageLog.create({
      data: {
        channel: NotificationChannel.WHATSAPP,
        recipientPhone: '+' + toNormalized,
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
 * Send pre-approved template message (Meta template name + optional components).
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
  const { accessToken, phoneNumberId } = getConfig()
  if (!accessToken || !phoneNumberId) {
    return { ok: false, error: 'WhatsApp not configured' }
  }

  const toNormalized = normalizePhoneForWhatsApp(to)

  const payload: {
    to: string
    type: 'template'
    template: { name: string; language: { code: string }; components?: object[] }
  } = {
    to: toNormalized,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
    },
  }
  if (components?.length) {
    payload.template.components = components
  }

  const result = await callMessagesApi(phoneNumberId, accessToken, payload)

  if (options?.logToMessageLog !== false) {
    await prisma.messageLog.create({
      data: {
        channel: NotificationChannel.WHATSAPP,
        recipientPhone: '+' + toNormalized,
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
 * Send interactive button message (up to 3 reply buttons).
 */
export async function sendWhatsAppInteractiveButtons(
  to: string,
  bodyText: string,
  buttons: Array<{ id: string; title: string }>,
  options?: { logToMessageLog?: boolean; recipientUserId?: string; templateId?: string }
): Promise<SendWhatsAppResult> {
  const { accessToken, phoneNumberId } = getConfig()
  if (!accessToken || !phoneNumberId) {
    return { ok: false, error: 'WhatsApp not configured' }
  }
  if (buttons.length > 3) {
    return { ok: false, error: 'Maximum 3 buttons allowed' }
  }

  const toNormalized = normalizePhoneForWhatsApp(to)

  const result = await callMessagesApi(phoneNumberId, accessToken, {
    to: toNormalized,
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: bodyText },
      action: {
        buttons: buttons.slice(0, 3).map((b) => ({
          type: 'reply',
          reply: { id: b.id, title: b.title.slice(0, 20) },
        })),
      },
    },
  })

  if (options?.logToMessageLog !== false) {
    await prisma.messageLog.create({
      data: {
        channel: NotificationChannel.WHATSAPP,
        recipientPhone: '+' + toNormalized,
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
  options?: { caption?: string; filename?: string; logToMessageLog?: boolean; recipientUserId?: string; templateId?: string }
): Promise<SendWhatsAppResult> {
  const { accessToken, phoneNumberId } = getConfig()
  if (!accessToken || !phoneNumberId) {
    return { ok: false, error: 'WhatsApp not configured' }
  }

  const toNormalized = normalizePhoneForWhatsApp(to)

  const result = await callMessagesApi(phoneNumberId, accessToken, {
    to: toNormalized,
    type: 'document',
    document: {
      link: documentUrl,
      caption: options?.caption ?? undefined,
      filename: options?.filename ?? undefined,
    },
  })

  if (options?.logToMessageLog !== false) {
    await prisma.messageLog.create({
      data: {
        channel: NotificationChannel.WHATSAPP,
        recipientPhone: '+' + toNormalized,
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
}
