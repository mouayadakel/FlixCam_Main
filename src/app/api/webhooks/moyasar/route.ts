/**
 * @file route.ts
 * @description Webhook handler for Moyasar payment events (payment_paid, payment_failed, etc.).
 * @module app/api/webhooks/moyasar
 */

import { NextRequest, NextResponse } from 'next/server'
import { EventStatus, type Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { PaymentGatewayConfigService } from '@/lib/services/payment-gateway-config.service'
import { PaymentService } from '@/lib/services/payment.service'
import { checkRateLimit, getClientIP } from '@/lib/utils/rate-limit'
import {
  MoyasarWebhookSchema,
  type MoyasarWebhookValidated,
} from '@/lib/validators/moyasar-webhook.validator'

function getEventId(body: MoyasarWebhookValidated): string | undefined {
  if (typeof body.id === 'string' && body.id.trim().length > 0) {
    return body.id.trim()
  }
  const paymentId = body.data?.id?.trim()
  const eventType = body.type?.trim()
  if (!paymentId || !eventType) {
    return undefined
  }
  return `${eventType}:${paymentId}`
}

function buildEventPayload(
  eventType: string,
  bookingId: string | undefined,
  amount: number | undefined,
  externalId: string | undefined,
  attempts: number,
  raw: MoyasarWebhookValidated,
  extras?: Record<string, Prisma.InputJsonValue | undefined>
): Prisma.InputJsonObject {
  return {
    eventType,
    ...(bookingId ? { bookingId } : {}),
    ...(typeof amount === 'number' ? { amount } : {}),
    ...(externalId ? { externalId } : {}),
    attempts,
    raw: raw as unknown as Prisma.InputJsonValue,
    ...(extras ?? {}),
  }
}

export async function POST(req: NextRequest) {
  try {
    const webhookRate = checkRateLimit({
      identifier: `moyasar-webhook:${getClientIP(req)}`,
      limit: 120,
      window: 60,
    })
    if (!webhookRate.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const payload = await req.text()
    let parsed: unknown
    try {
      parsed = JSON.parse(payload) as unknown
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 })
    }

    const zodResult = MoyasarWebhookSchema.safeParse(parsed)
    if (!zodResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          code: 'MOYASAR_WEBHOOK_VALIDATION',
          details: zodResult.error.flatten(),
        },
        { status: 400 }
      )
    }
    const body = zodResult.data

    const config = await PaymentGatewayConfigService.getConfig('moyasar')
    const webhookSecret =
      config?.webhookSecret ||
      process.env.MOYASAR_WEBHOOK_SECRET

    if (!webhookSecret) {
      logger.error('Moyasar webhook rejected: missing webhook secret configuration')
      return NextResponse.json({ error: 'Webhook secret is not configured' }, { status: 500 })
    }

    if (body.secret_token !== webhookSecret) {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 401 })
    }

    const eventType = body.type ?? ''
    const data = body.data
    const bookingId = data?.metadata?.booking_id
    const amount = data?.amount
    const externalId = data?.id
    const eventId = getEventId(body)

    if (!eventId) {
      return NextResponse.json({ error: 'Missing event identifier' }, { status: 400 })
    }

    const existingEvent = await prisma.event.findFirst({
      where: { eventName: 'webhook.moyasar', resourceId: eventId },
      select: { id: true, status: true },
    })
    if (existingEvent) {
      return NextResponse.json({
        received: true,
        duplicate: true,
        processed: existingEvent.status === EventStatus.PROCESSED,
      })
    }

    const queuedEvent = await prisma.event.create({
      data: {
        eventName: 'webhook.moyasar',
        resourceId: eventId,
        status: EventStatus.PENDING,
        payload: buildEventPayload(
          eventType,
          bookingId ?? undefined,
          amount ?? undefined,
          externalId ?? undefined,
          0,
          body
        ),
      },
    })

    try {
      const handleResult = await PaymentService.handleGatewayWebhook(
        'moyasar',
        {
          type: eventType,
          bookingId: bookingId ?? undefined,
          amount: amount ?? undefined,
          externalId: externalId ?? undefined,
        },
        { rawWebhook: body }
      )

      const queueStatus =
        handleResult.queueOutcome === 'SKIPPED' ? EventStatus.SKIPPED : EventStatus.PROCESSED

      await prisma.event.update({
        where: { id: queuedEvent.id },
        data: {
          status: queueStatus,
          processedAt: new Date(),
          payload: buildEventPayload(
            eventType,
            bookingId ?? undefined,
            amount ?? undefined,
            externalId ?? undefined,
            1,
            body,
            {
              queueOutcome: handleResult.queueOutcome,
              skipReason: handleResult.skipReason,
            }
          ),
        },
      })

      return NextResponse.json({
        received: true,
        processedInline: true,
        queueOutcome: handleResult.queueOutcome,
      })
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error)

      await prisma.event.update({
        where: { id: queuedEvent.id },
        data: {
          status: EventStatus.PENDING,
          processedAt: null,
          payload: buildEventPayload(
            eventType,
            bookingId ?? undefined,
            amount ?? undefined,
            externalId ?? undefined,
            1,
            body,
            {
              lastError: errorMessage,
            }
          ),
        },
      })

      logger.warn('Moyasar webhook queued for retry after inline processing failure', {
        eventId,
        bookingId,
        externalId,
        error: errorMessage,
      })

      return NextResponse.json({ received: true, processedInline: false, queued: true }, { status: 202 })
    }
  } catch (error: unknown) {
    logger.error('Moyasar webhook route failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
