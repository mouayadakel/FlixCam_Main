/**
 * @file route.ts
 * @description Webhook handler for Moyasar payment events (payment_paid, payment_failed, etc.).
 * @module app/api/webhooks/moyasar
 */

import { NextRequest, NextResponse } from 'next/server'
import { PaymentGatewayConfigService } from '@/lib/services/payment-gateway-config.service'
import { PaymentService } from '@/lib/services/payment.service'

export async function POST(req: NextRequest) {
  try {
    const payload = await req.text()
    const body = JSON.parse(payload) as {
      type?: string
      secret_token?: string
      data?: { id?: string; amount?: number; metadata?: Record<string, string> }
    }

    const config = await PaymentGatewayConfigService.getConfig('moyasar')
    const webhookSecret =
      config?.webhookSecret ||
      process.env.MOYASAR_WEBHOOK_SECRET

    if (webhookSecret && body.secret_token !== webhookSecret) {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })
    }

    const eventType = body.type ?? ''
    const data = body.data
    const bookingId = data?.metadata?.booking_id
    const amount = data?.amount
    const externalId = data?.id

    await PaymentService.handleGatewayWebhook('moyasar', {
      type: eventType,
      bookingId: bookingId ?? undefined,
      amount: amount ?? undefined,
      externalId: externalId ?? undefined,
    })

    return NextResponse.json({ received: true })
  } catch (error: unknown) {
    console.error('Moyasar webhook error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
