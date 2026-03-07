/**
 * @file api/webhooks/tap/route.ts
 * @description Webhook handler for Tap payment gateway events.
 *              Handles payment success/failure and updates booking states.
 * @module api/webhooks/tap
 * @see /docs/features/payments/WEBHOOKS.md
 * @author Engineering Team
 * @created 2026-01-28
 */

import { NextRequest, NextResponse } from 'next/server'
import { TapClient } from '@/lib/integrations/tap/client'
import { PaymentGatewayConfigService } from '@/lib/services/payment-gateway-config.service'
import { PaymentService } from '@/lib/services/payment.service'

export async function POST(req: NextRequest) {
  try {
    const payload = await req.text()
    const signature = req.headers.get('x-tap-signature')

    const config =
      (await PaymentGatewayConfigService.getConfig('tap')) ||
      (process.env.TAP_SECRET_KEY && process.env.TAP_WEBHOOK_SECRET
        ? {
            secretKey: process.env.TAP_SECRET_KEY,
            webhookSecret: process.env.TAP_WEBHOOK_SECRET,
          }
        : null)

    if (!config?.secretKey || !config?.webhookSecret) {
      return NextResponse.json({ error: 'Tap credentials not configured' }, { status: 500 })
    }

    const tapClient = new TapClient(config.secretKey, config.webhookSecret)

    if (!tapClient.verifyWebhook(signature, payload)) {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const event = tapClient.parseWebhookEvent(payload)
    const bookingId = event.object.metadata?.booking_id
    const amount = event.object.amount
    const externalId = event.object.id

    await PaymentService.handleGatewayWebhook('tap', {
      type: event.type,
      bookingId: bookingId ?? undefined,
      amount,
      externalId,
    })

    return NextResponse.json({ received: true })
  } catch (error: unknown) {
    console.error('Tap webhook error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
