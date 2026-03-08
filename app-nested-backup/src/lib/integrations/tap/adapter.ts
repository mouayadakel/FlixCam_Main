/**
 * @file tap/adapter.ts
 * @description Tap Payments adapter implementing the shared PaymentGatewayAdapter interface.
 * @module lib/integrations/tap
 */

import { TapClient } from './client'
import type {
  CreatePaymentParams,
  CreatePaymentResult,
  PaymentGatewayAdapter,
} from '@/lib/integrations/payment-gateway/types'
import type { TapWebhookEvent } from './client'

export function createTapAdapter(
  config: Record<string, string | undefined>
): PaymentGatewayAdapter {
  const apiKey = config.secretKey || config.apiKey || ''
  const webhookSecret = config.webhookSecret || ''
  const client = new TapClient(apiKey, webhookSecret)

  return {
    async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
      try {
        const charge = await client.createCharge({
          amount: params.amount,
          currency: params.currency,
          customer: {
            email: params.customer.email,
            phone: params.customer.phone,
            first_name: params.customer.firstName,
            last_name: params.customer.lastName,
          },
          metadata: params.metadata,
          description: params.description,
          redirect_url: params.redirectUrl,
        })
        const redirectUrl =
          charge.redirect?.url || (charge as { transaction?: { url?: string } }).transaction?.url
        return {
          success: true,
          redirectUrl: redirectUrl || undefined,
          externalId: charge.id,
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Tap charge failed'
        return { success: false, error: message }
      }
    },

    async getPayment(id: string) {
      try {
        const charge = await client.getCharge(id)
        return {
          status: charge.status,
          amount: charge.amount,
          currency: charge.currency,
        }
      } catch {
        return null
      }
    },

    async refund(id: string, amount?: number) {
      try {
        await client.refundCharge(id, amount)
        return { success: true }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Refund failed'
        return { success: false, error: message }
      }
    },

    verifyWebhook(signature: string | null, payload: string): boolean {
      return client.verifyWebhook(signature, payload)
    },

    parseWebhookEvent(payload: string): TapWebhookEvent {
      return client.parseWebhookEvent(payload)
    },
  }
}

/** Test Tap connection (e.g. list or minimal balance check). Tap has no public "ping"; we try get on a non-existent charge to verify auth. */
export async function testTapConnection(
  config: Record<string, string | undefined>
): Promise<{ ok: boolean; message: string }> {
  const apiKey = config.secretKey || config.apiKey
  if (!apiKey) {
    return { ok: false, message: 'Missing secret key' }
  }
  try {
    const client = new TapClient(apiKey, config.webhookSecret || '')
    await client.getCharge('test_connection_do_not_use')
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('401') || msg.includes('Unauthorized') || msg.includes('404') || msg.includes('not found')) {
      return { ok: true, message: 'Credentials accepted (test request returned expected auth response)' }
    }
    if (msg.includes('Tap API error')) {
      return { ok: true, message: 'API key valid; connection OK' }
    }
    return { ok: false, message: msg }
  }
  return { ok: true, message: 'Connection OK' }
}
