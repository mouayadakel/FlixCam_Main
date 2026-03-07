/**
 * @file moyasar/client.ts
 * @description Moyasar payment gateway API client (create payment, fetch, refund).
 * @module lib/integrations/moyasar
 * @see https://docs.moyasar.com/
 */

import axios, { AxiosInstance } from 'axios'

const BASE_URL = 'https://api.moyasar.com/v1'

export interface MoyasarCreatePaymentParams {
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
  amount: number
  currency: string
  callback_url?: string
  source?: {
    type: string
    transaction_url?: string
  }
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

  /**
   * Create a payment with a token from Moyasar frontend form.
   * Server-side redirect without token is not supported; use Moyasar.init() on frontend and pass token.
   */
  async createPaymentWithToken(
    params: MoyasarCreatePaymentParams & { token: string }
  ): Promise<MoyasarPayment> {
    const body = {
      amount: params.amount,
      currency: params.currency,
      callback_url: params.callback_url,
      description: params.description,
      metadata: params.metadata,
      given_id: params.given_id || `booking-${Date.now()}`,
      source: {
        type: 'token',
        token: params.token,
      },
    }
    const res = await this.client.post('/payments', body)
    return res.data
  }
}
