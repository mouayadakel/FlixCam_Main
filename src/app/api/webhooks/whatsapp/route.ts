/**
 * @file api/webhooks/whatsapp/route.ts
 * @description Webhook for Twilio WhatsApp - delivery/read receipts.
 * @module api/webhooks/whatsapp
 */

import { NextRequest, NextResponse } from 'next/server'
import { WhatsAppService } from '@/lib/services/whatsapp.service'
import { MessageLogStatus } from '@prisma/client'

export async function POST(req: NextRequest) {
  try {
    // Twilio webhooks are form-urlencoded
    const text = await req.text()
    const params = new URLSearchParams(text)

    const MessageSid = params.get('MessageSid')
    const MessageStatus = params.get('MessageStatus')

    if (!MessageSid || !MessageStatus) {
      return new NextResponse('Missing required fields', { status: 400 })
    }

    const statusLower = MessageStatus.toLowerCase()
    const now = new Date()

    if (statusLower === 'delivered') {
      await WhatsAppService.updateMessageLogStatus(MessageSid, MessageLogStatus.DELIVERED, {
        deliveredAt: now,
      })
    } else if (statusLower === 'read') {
      await WhatsAppService.updateMessageLogStatus(MessageSid, MessageLogStatus.READ, {
        readAt: now,
      })
    } else if (statusLower === 'failed' || statusLower === 'undelivered') {
      await WhatsAppService.updateMessageLogStatus(MessageSid, MessageLogStatus.FAILED)
    }

    return new NextResponse('OK', { status: 200 })
  } catch (error) {
    console.error('Error processing Twilio webhook', error)
    return new NextResponse('Internal Server Error', { status: 500 })
  }
}
