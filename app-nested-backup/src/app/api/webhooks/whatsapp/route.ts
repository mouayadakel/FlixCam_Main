/**
 * @file api/webhooks/whatsapp/route.ts
 * @description Webhook for Meta WhatsApp Cloud API - verification and delivery/read receipts.
 * @module api/webhooks/whatsapp
 */

import { NextRequest, NextResponse } from 'next/server'
import { WhatsAppService } from '@/lib/services/whatsapp.service'
import { MessageLogStatus } from '@prisma/client'

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN

export async function GET(req: NextRequest) {
  const mode = req.nextUrl.searchParams.get('hub.mode')
  const token = req.nextUrl.searchParams.get('hub.verify_token')
  const challenge = req.nextUrl.searchParams.get('hub.challenge')

  if (mode === 'subscribe' && token === VERIFY_TOKEN && challenge) {
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

interface WhatsAppWebhookValue {
  messaging_product?: string
  metadata?: { phone_number_id: string; display_phone_number?: string }
  contacts?: Array<{ profile: { name: string }; wa_id: string }>
  messages?: Array<{ id: string; from: string; timestamp: string; type: string; text?: { body: string } }>
  statuses?: Array<{
    id: string
    status: 'sent' | 'delivered' | 'read' | 'failed'
    timestamp: string
    recipient_id?: string
  }>
  errors?: Array<{ code: number; title: string; message: string }>
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      object?: string
      entry?: Array<{
        id: string
        changes?: Array<{ value: WhatsAppWebhookValue; field: string }>
      }>
    }

    if (body.object !== 'whatsapp_business_account') {
      return NextResponse.json({ ok: true })
    }

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value as WhatsAppWebhookValue
        for (const status of value.statuses ?? []) {
          const messageId = status.id
          const statusLower = status.status?.toLowerCase()
          if (statusLower === 'delivered') {
            await WhatsAppService.updateMessageLogStatus(messageId, MessageLogStatus.DELIVERED, {
              deliveredAt: new Date(parseInt(status.timestamp, 10) * 1000),
            })
          } else if (statusLower === 'read') {
            await WhatsAppService.updateMessageLogStatus(messageId, MessageLogStatus.READ, {
              readAt: new Date(parseInt(status.timestamp, 10) * 1000),
            })
          } else if (statusLower === 'failed') {
            await WhatsAppService.updateMessageLogStatus(messageId, MessageLogStatus.FAILED)
          }
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}
