/**
 * GA4 Measurement Protocol — server-side purchase/event sync.
 * @see https://developers.google.com/analytics/devguides/collection/protocol/ga4
 */

import { logger } from '@/lib/logger'

export interface Ga4PurchaseEvent {
  transactionId: string
  value: number
  currency?: string
  items?: Array<{ item_id: string; item_name: string; price: number; quantity: number }>
}

export async function sendGa4PurchaseEvents(
  events: Ga4PurchaseEvent[]
): Promise<{ sent: number; skipped: boolean; reason?: string }> {
  const measurementId =
    process.env.GA4_MEASUREMENT_ID?.trim() ||
    process.env.NEXT_PUBLIC_GA4_MEASUREMENT_ID?.trim()
  const apiSecret = process.env.GA4_MEASUREMENT_API_SECRET?.trim()

  if (!measurementId || !apiSecret) {
    return {
      sent: 0,
      skipped: true,
      reason: 'GA4_MEASUREMENT_ID and GA4_MEASUREMENT_API_SECRET required',
    }
  }

  if (events.length === 0) {
    return { sent: 0, skipped: false }
  }

  const url = `https://www.google-analytics.com/mp/collect?measurement_id=${measurementId}&api_secret=${apiSecret}`

  let sent = 0
  for (const ev of events) {
    const clientId = `cron.${ev.transactionId}`
    const body = {
      client_id: clientId,
      events: [
        {
          name: 'purchase',
          params: {
            transaction_id: ev.transactionId,
            value: ev.value,
            currency: ev.currency ?? 'SAR',
            items: ev.items ?? [],
          },
        },
      ],
    }

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) sent++
      else {
        logger.warn('GA4 MP send failed', { status: res.status, transactionId: ev.transactionId })
      }
    } catch (err) {
      logger.warn('GA4 MP error', {
        error: err instanceof Error ? err.message : String(err),
        transactionId: ev.transactionId,
      })
    }
  }

  return { sent, skipped: false }
}
