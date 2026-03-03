/**
 * @file moyasar/adapter.ts
 * @description Moyasar adapter for shared PaymentGatewayAdapter interface.
 * Full redirect flow requires frontend Moyasar form + token; this adapter supports test and token-based create.
 * @module lib/integrations/moyasar
 */

import { MoyasarClient } from './client'
import type {
  CreatePaymentParams,
  CreatePaymentResult,
  PaymentGatewayAdapter,
} from '@/lib/integrations/payment-gateway/types'

export function createMoyasarAdapter(
  config: Record<string, string | undefined>
): PaymentGatewayAdapter {
  const secretKey = config.secretKey || ''
  const client = new MoyasarClient(secretKey)

  return {
    async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
      if (!params.redirectUrl) {
        return { success: false, error: 'Redirect URL required' }
      }
      return {
        success: false,
        error:
          'Moyasar requires the payment form on the checkout page. Server-side redirect is not available without a card token from the Moyasar form.',
      }
    },
  }
}

export async function testMoyasarConnection(
  config: Record<string, string | undefined>
): Promise<{ ok: boolean; message: string }> {
  const secretKey = config.secretKey
  if (!secretKey) {
    return { ok: false, message: 'Missing secret key' }
  }
  try {
    const client = new MoyasarClient(secretKey)
    await client.listPayments({ per: 1 })
    return { ok: true, message: 'Connection OK' }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('401') || msg.includes('Unauthorized')) {
      return { ok: false, message: 'Invalid API key' }
    }
    return { ok: false, message: msg }
  }
}
