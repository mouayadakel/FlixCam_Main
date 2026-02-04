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
import { prisma } from '@/lib/db/prisma'
import { BookingService } from '@/lib/services/booking.service'

export async function POST(req: NextRequest) {
  try {
    const payload = await req.text()
    const signature = req.headers.get('x-tap-signature')

    // Initialize Tap client
    const apiKey = process.env.TAP_API_KEY
    const webhookSecret = process.env.TAP_WEBHOOK_SECRET

    if (!apiKey || !webhookSecret) {
      return NextResponse.json(
        { error: 'Tap credentials not configured' },
        { status: 500 }
      )
    }

    const tapClient = new TapClient(apiKey, webhookSecret)

    // Verify webhook signature
    if (!tapClient.verifyWebhook(signature, payload)) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      )
    }

    // Parse webhook event
    const event = tapClient.parseWebhookEvent(payload)

    // Handle charge.succeeded event
    if (event.type === 'charge.succeeded') {
      const bookingId = event.object.metadata?.booking_id

      if (!bookingId) {
        return NextResponse.json(
          { error: 'Booking ID not found in metadata' },
          { status: 400 }
        )
      }

      // Update payment record
      await prisma.payment.create({
        data: {
          bookingId,
          amount: event.object.amount / 100, // Convert from cents
          tapTransactionId: event.object.id,
          status: 'SUCCESS',
        },
      })

      // Transition booking state: payment_pending → confirmed
      try {
        await BookingService.transitionState(
          bookingId,
          'CONFIRMED',
          'system'
        )
      } catch (transitionError: any) {
        // Log error but don't fail the webhook
        console.error('Failed to transition booking state:', transitionError)
      }
    }

    // Handle charge.failed event
    if (event.type === 'charge.failed') {
      const bookingId = event.object.metadata?.booking_id

      if (bookingId) {
        // Log failed payment
        await prisma.payment.create({
          data: {
            bookingId,
            amount: event.object.amount / 100,
            tapTransactionId: event.object.id,
            status: 'FAILED',
          },
        })
      }
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Tap webhook error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
