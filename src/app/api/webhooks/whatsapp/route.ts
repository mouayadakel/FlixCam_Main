import { NextRequest, NextResponse } from 'next/server'
import { WhatsAppService } from '@/lib/services/whatsapp.service'
import { logger } from '@/lib/logger'
import { validateRequest } from 'twilio'

function resolvePublicWebhookUrl(request: NextRequest): string {
  const url = new URL(request.url)
  const forwardedProto = request.headers.get('x-forwarded-proto')
  const forwardedHost = request.headers.get('x-forwarded-host')

  if (forwardedHost) {
    url.host = forwardedHost
  }
  if (forwardedProto) {
    url.protocol = `${forwardedProto}:`
  }

  return url.toString()
}

export async function POST(req: NextRequest) {
  try {
    const authToken = process.env.TWILIO_AUTH_TOKEN
    if (!authToken) {
      logger.error('WhatsApp webhook rejected: missing TWILIO_AUTH_TOKEN')
      return NextResponse.json({ error: 'Webhook verification unavailable' }, { status: 500 })
    }

    const signature = req.headers.get('x-twilio-signature')
    if (!signature) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }

    // Twilio webhooks are URL-encoded form data
    const formData = await req.formData()
    const params: Record<string, string> = {}
    for (const [key, value] of formData.entries()) {
      if (typeof value === 'string') {
        params[key] = value
      }
    }
    const requestUrl = resolvePublicWebhookUrl(req)
    const valid = validateRequest(authToken, signature, requestUrl, params)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 403 })
    }
    
    // Twilio sends MessageSid, MessageStatus, To, From, Body
    const messageSid = formData.get('MessageSid') as string
    const messageStatus = formData.get('MessageStatus') as string
    const from = formData.get('From') as string
    const body = formData.get('Body') as string

    // Handle Status Callbacks (delivered, read, failed)
    if (messageSid && messageStatus) {
      let status: 'SENT' | 'DELIVERED' | 'READ' | 'FAILED' = 'SENT'
      switch (messageStatus.toLowerCase()) {
        case 'delivered':
          status = 'DELIVERED'
          break
        case 'read':
          status = 'READ'
          break
        case 'failed':
        case 'undelivered':
          status = 'FAILED'
          break
      }
      
      await WhatsAppService.updateMessageLogStatus(messageSid, status as any, {
        deliveredAt: status === 'DELIVERED' ? new Date() : undefined,
        readAt: status === 'READ' ? new Date() : undefined,
      })

      return NextResponse.json({ success: true })
    }

    // Handle Inbound Messages
    if (from && body) {
      logger.info(`Received inbound WhatsApp message from ${from}: ${body}`)
      // Implement auto-responder or forward to customer service queue here
      // e.g. await CustomerSupportService.createTicket(from, body)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('WhatsApp webhook error:', error)
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 })
  }
}
