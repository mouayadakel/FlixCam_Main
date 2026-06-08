import { EventStatus, type Prisma } from '@prisma/client'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { PaymentService } from '@/lib/services/payment.service'

const MOYASAR_EVENT_NAME = 'webhook.moyasar'
const MAX_RETRIES = 5

interface QueuedMoyasarEventPayload {
  eventType?: string
  bookingId?: string
  amount?: number
  externalId?: string
  attempts?: number
  lastError?: string
  raw?: unknown
}

function buildStoredPayload(
  payload: QueuedMoyasarEventPayload,
  attempts: number,
  extras?: Record<string, Prisma.InputJsonValue | undefined>
): Prisma.InputJsonObject {
  return {
    ...(payload.eventType ? { eventType: payload.eventType } : {}),
    ...(payload.bookingId ? { bookingId: payload.bookingId } : {}),
    ...(typeof payload.amount === 'number' ? { amount: payload.amount } : {}),
    ...(payload.externalId ? { externalId: payload.externalId } : {}),
    attempts,
    ...(payload.raw !== undefined ? { raw: payload.raw as Prisma.InputJsonValue } : {}),
    ...(extras ?? {}),
  }
}

export class MoyasarWebhookProcessorService {
  static async processPending(limit = 50): Promise<{
    processed: number
    failed: number
    retried: number
    scanned: number
  }> {
    const events = await prisma.event.findMany({
      where: {
        eventName: MOYASAR_EVENT_NAME,
        status: EventStatus.PENDING,
      },
      orderBy: { timestamp: 'asc' },
      take: limit,
    })

    let processed = 0
    let failed = 0
    let retried = 0

    for (const event of events) {
      const payload = (event.payload || {}) as QueuedMoyasarEventPayload
      const attempts = Number(payload.attempts || 0)
      const nextAttempts = attempts + 1

      try {
        const handleResult = await PaymentService.handleGatewayWebhook(
          'moyasar',
          {
            type: payload.eventType || '',
            bookingId: payload.bookingId,
            amount: payload.amount,
            externalId: payload.externalId,
          },
          { rawWebhook: payload.raw }
        )

        const queueStatus =
          handleResult.queueOutcome === 'SKIPPED' ? EventStatus.SKIPPED : EventStatus.PROCESSED

        await prisma.event.update({
          where: { id: event.id },
          data: {
            status: queueStatus,
            processedAt: new Date(),
            payload: buildStoredPayload(payload, nextAttempts, {
              queueOutcome: handleResult.queueOutcome,
              skipReason: handleResult.skipReason,
            }),
          },
        })
        processed++
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        const isDeadLetter = nextAttempts >= MAX_RETRIES

        await prisma.event.update({
          where: { id: event.id },
          data: {
            status: isDeadLetter ? EventStatus.FAILED : EventStatus.PENDING,
            processedAt: isDeadLetter ? new Date() : null,
            payload: buildStoredPayload(payload, nextAttempts, {
              lastError: errorMessage,
            }),
          },
        })

        if (isDeadLetter) {
          failed++
          logger.error('Moyasar event moved to dead-letter', {
            eventId: event.id,
            resourceId: event.resourceId,
            attempts: nextAttempts,
            error: errorMessage,
          })
        } else {
          retried++
          logger.warn('Moyasar event retry scheduled', {
            eventId: event.id,
            resourceId: event.resourceId,
            attempts: nextAttempts,
            error: errorMessage,
          })
        }
      }
    }

    logger.info('Moyasar webhook batch processed', {
      scanned: events.length,
      processed,
      failed,
      retried,
    })

    return { scanned: events.length, processed, failed, retried }
  }
}
