/**
 * @file moyasar/client.ts
 * @description Moyasar payment gateway API client (create payment, fetch, refund).
 * @module lib/integrations/moyasar
 * @see https://docs.moyasar.com/
 */

import axios, { AxiosInstance } from 'axios'
import { randomUUID } from 'crypto'
import {
  assertValidMoyasarAmountHalalah,
  coerceMoyasarAmountHalalah,
} from '@/lib/utils/moyasar-amount'

const BASE_URL = 'https://api.moyasar.com/v1'

export interface MoyasarCreatePaymentParams {
  /** Integer halalah: 1 SAR = 100 (never pass riyal major units, e.g. 15, without ×100) */
  amount: number
  currency: string
  callback_url: string
  description?: string
  metadata?: Record<string, string>
  given_id?: string
}

export interface MoyasarPayment {
  id: string
  status: string
  /** Halalah (minor units) for SAR */
  amount: number
  currency: string
  callback_url?: string
  metadata?: Record<string, string>
  source?: {
    type: string
    transaction_url?: string
  }
}

export interface MoyasarRefundResponse extends MoyasarPayment {
  refunded?: number
  refunded_at?: string | null
}

export class MoyasarClient {
  private client: AxiosInstance

  constructor(secretKey: string) {
    this.client = axios.create({
      baseURL: BASE_URL,
      headers: { 'Content-Type': 'application/json' },
      auth: {
        username: secretKey,
        password: '',
      },
    })
  }

  private generateGivenId(): string {
    return randomUUID()
  }

  /**
   * List payments (used for test connection).
   */
  async listPayments(params?: { page?: number; per?: number }): Promise<{ payments: MoyasarPayment[] }> {
    const res = await this.client.get('/payments', { params: params || {} })
    return res.data
  }

  /**
   * Fetch a payment by id.
   */
  async getPayment(id: string): Promise<MoyasarPayment> {
    const res = await this.client.get(`/payments/${id}`)
    return res.data
  }

  async createRefund(id: string, amount?: number): Promise<MoyasarRefundResponse> {
    const body = amount != null ? { amount: coerceMoyasarAmountHalalah(amount) } : {}
    if (body.amount != null) {
      assertValidMoyasarAmountHalalah(body.amount, 'MoyasarClient.createRefund')
    }
    const res = await this.client.post(`/payments/${id}/refund`, body)
    return res.data
  }

  /**
   * Create a payment with a token from Moyasar frontend form.
   * Server-side redirect without token is not supported; use Moyasar.init() on frontend and pass token.
   */
  async createPaymentWithToken(
    params: MoyasarCreatePaymentParams & { token: string }
  ): Promise<MoyasarPayment> {
    const amountHalalah = coerceMoyasarAmountHalalah(params.amount)
    assertValidMoyasarAmountHalalah(amountHalalah, 'MoyasarClient.createPaymentWithToken')
    const givenId = params.given_id?.trim() || this.generateGivenId()
    const body = {
      amount: amountHalalah,
      currency: params.currency,
      callback_url: params.callback_url,
      description: params.description,
      metadata: params.metadata,
      given_id: givenId,
      source: {
        type: 'token',
        token: params.token,
      },
    }
    const res = await this.client.post('/payments', body)
    return res.data
  }
}
