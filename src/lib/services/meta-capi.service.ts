/**
 * Server-side Meta Conversions API (Purchase, etc.) for webhook and server flows.
 */

import { createHash } from 'crypto'
import { logger } from '@/lib/logger'
import { getMetaCapiCredentials } from '@/lib/services/marketing-settings.service'

function hashValue(value: string): string {
  return createHash('sha256').update(value.toLowerCase().trim()).digest('hex')
}

export interface MetaCapiPurchaseInput {
  orderId: string
  value: number
  currency?: string
  email?: string | null
  phone?: string | null
  eventSourceUrl?: string
}

/**
 * Sends Purchase to Meta CAPI when pixel + token are configured. Best-effort; never throws.
 */
export async function sendMetaCapiPurchase(input: MetaCapiPurchaseInput): Promise<void> {
  try {
    const { pixelId, token, testCode } = await getMetaCapiCredentials()
    if (!pixelId || !token) return

    const currency = (input.currency || 'SAR').toUpperCase()
    const value = Number.isFinite(input.value) ? input.value : 0

    const userData: Record<string, unknown> = {}
    if (input.email?.trim()) {
      userData.em = [hashValue(input.email)]
    }
    if (input.phone?.replace(/\D/g, '')) {
      userData.ph = [hashValue(input.phone.replace(/\D/g, ''))]
    }

    const payload: Record<string, unknown> = {
      data: [
        {
          event_name: 'Purchase',
          event_time: Math.floor(Date.now() / 1000),
          event_source_url: input.eventSourceUrl || undefined,
          action_source: 'system',
          user_data: userData,
          custom_data: {
            value,
            currency,
            order_id: input.orderId,
          },
        },
      ],
    }
    if (testCode) {
      ;(payload as { test_event_code?: string }).test_event_code = testCode
    }

    const res = await fetch(
      `https://graph.facebook.com/v21.0/${pixelId}/events?access_token=${encodeURIComponent(token)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }
    )
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as Record<string, unknown>
      logger.warn('Meta CAPI Purchase failed', {
        status: res.status,
        orderId: input.orderId,
        details: JSON.stringify(err).slice(0, 500),
      })
    }
  } catch (e) {
    logger.warn('Meta CAPI Purchase error', {
      error: e instanceof Error ? e.message : String(e),
      orderId: input.orderId,
    })
  }
}
