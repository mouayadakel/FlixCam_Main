/**
 * @file moyasar/adapter.ts
 * @description Moyasar adapter for shared PaymentGatewayAdapter interface.
 * Full redirect flow requires frontend Moyasar form + token; this adapter supports test and token-based create.
 * @module lib/integrations/moyasar
 */

import axios from 'axios'
import { MoyasarClient } from './client'
import type {
  CreatePaymentParams,
  CreatePaymentResult,
  PaymentGatewayAdapter,
} from '@/lib/integrations/payment-gateway/types'

export function createMoyasarAdapter(
  config: Record<string, string | undefined>
): PaymentGatewayAdapter {
  const secretKey = config.secretKey?.trim()

  return {
    async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
      if (!params.metadata?.booking_id) {
        return { success: false, error: 'Booking ID is required' }
      }

      const redirectBase = params.redirectUrl || process.env.NEXTAUTH_URL || process.env.APP_URL
      if (!redirectBase) {
        return { success: false, error: 'Redirect URL required' }
      }

      const safeBase = redirectBase.replace(/\/$/, '')
      return {
        success: true,
        redirectUrl: `${safeBase}/checkout/moyasar/${encodeURIComponent(params.metadata.booking_id)}`,
      }
    },

    async getPayment(id: string) {
      if (!secretKey) return null
      const client = new MoyasarClient(secretKey)
      const payment = await client.getPayment(id)
      return {
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
      }
    },

    async refund(id: string, amount?: number) {
      if (!secretKey) {
        return { success: false, error: 'Missing Moyasar secret key' }
      }
      try {
        const client = new MoyasarClient(secretKey)
        await client.createRefund(id, amount)
        return { success: true }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Moyasar refund failed'
        return { success: false, error: message }
      }
    },
  }
}

export async function testMoyasarConnection(
  config: Record<string, string | undefined>
): Promise<{ ok: boolean; message: string }> {
  const secretKey = config.secretKey?.trim()
  if (!secretKey) {
    return {
      ok: false,
      message:
        'Missing secret key. Set MOYASAR_SECRET_KEY in the server environment (e.g. hosting env / .env) or paste and save it here.',
    }
  }
  try {
    const client = new MoyasarClient(secretKey)
    await client.listPayments({ per: 1 })
    return { ok: true, message: 'Connection OK' }
  } catch (err: unknown) {
    if (axios.isAxiosError(err)) {
      const status = err.response?.status
      const data = err.response?.data as { message?: string; error?: string } | undefined
      const detail =
        (typeof data?.message === 'string' && data.message.trim()) ||
        (typeof data?.error === 'string' && data.error.trim()) ||
        err.message
      if (status === 401 || status === 403) {
        return {
          ok: false,
          message: 'Invalid or unauthorized secret key (verify MOYASAR_SECRET_KEY matches your Moyasar dashboard).',
        }
      }
      if (status && status >= 400) {
        return {
          ok: false,
          message: detail || `Moyasar API returned HTTP ${status}`,
        }
      }
      if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
        return {
          ok: false,
          message: 'Request to api.moyasar.com timed out — check server outbound HTTPS/DNS/firewall.',
        }
      }
      if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
        return {
          ok: false,
          message: 'Cannot reach api.moyasar.com — check DNS and network from this server.',
        }
      }
    }
    const msg = err instanceof Error ? err.message : String(err)
    if (msg.includes('401') || msg.includes('Unauthorized')) {
      return { ok: false, message: 'Invalid or unauthorized API key' }
    }
    return { ok: false, message: msg }
  }
}
