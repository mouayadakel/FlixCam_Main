/**
 * @file tap/client.ts
 * @description Tap Payment Gateway client for creating charges, handling webhooks,
 *              and processing payments for bookings.
 * @module integrations/tap
 * @see /docs/features/payments/GATEWAYS.md
 * @author Engineering Team
 * @created 2026-01-28
 */

import axios, { AxiosInstance } from 'axios'
import * as crypto from 'crypto'

export interface TapChargeParams {
  amount: number
  currency: string
  customer: {
    email: string
    phone: string
    first_name?: string
    last_name?: string
  }
  metadata: {
    booking_id: string
    [key: string]: string
  }
  description?: string
  redirect_url?: string
}

export interface TapChargeResponse {
  id: string
  object: string
  amount: number
  currency: string
  status: 'INITIATED' | 'CAPTURED' | 'FAILED' | 'CANCELLED'
  redirect: {
    url: string
  }
  transaction: {
    url: string
  }
  metadata: Record<string, string>
}

export interface TapWebhookEvent {
  type: 'charge.succeeded' | 'charge.failed' | 'charge.cancelled'
  object: {
    id: string
    amount: number
    currency: string
    status: string
    metadata: Record<string, string>
  }
}

/**
 * TapClient - Handles all interactions with Tap Payment Gateway
 */
export class TapClient {
  private apiKey: string
  private webhookSecret: string
  private baseUrl: string
  private client: AxiosInstance

  constructor(apiKey: string, webhookSecret: string) {
    this.apiKey = apiKey
    this.webhookSecret = webhookSecret
    this.baseUrl = process.env.TAP_API_URL || 'https://api.tap.company/v2'

    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
    })
  }

  /**
   * Create a payment charge
   * @param params - Charge parameters
   * @returns Charge response with payment URL
   */
  async createCharge(params: TapChargeParams): Promise<TapChargeResponse> {
    try {
      const response = await this.client.post('/charges', {
        amount: params.amount,
        currency: params.currency,
        customer: params.customer,
        source: { id: 'src_all' },
        redirect: {
          url: params.redirect_url || `${process.env.NEXT_PUBLIC_APP_URL}/payment/callback`,
        },
        metadata: params.metadata,
        description: params.description || `Booking payment - ${params.metadata.booking_id}`,
      })

      return response.data
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Tap API error: ${error.response?.data?.message || error.message}`)
      }
      throw error
    }
  }

  /**
   * Verify webhook signature
   * @param signature - Signature from X-Tap-Signature header
   * @param payload - Raw request body
   * @returns True if signature is valid
   */
  verifyWebhook(signature: string | null, payload: string): boolean {
    if (!signature || !this.webhookSecret) {
      return false
    }

    try {
      const hmac = crypto.createHmac('sha256', this.webhookSecret)
      const digest = hmac.update(payload).digest('hex')
      return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest))
    } catch (error) {
      return false
    }
  }

  /**
   * Parse webhook event
   * @param payload - Raw request body
   * @returns Parsed webhook event
   */
  parseWebhookEvent(payload: string): TapWebhookEvent {
    try {
      return JSON.parse(payload)
    } catch (error) {
      throw new Error('Invalid webhook payload')
    }
  }

  /**
   * Get charge status
   * @param chargeId - Charge ID
   * @returns Charge details
   */
  async getCharge(chargeId: string): Promise<TapChargeResponse> {
    try {
      const response = await this.client.get(`/charges/${chargeId}`)
      return response.data
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Tap API error: ${error.response?.data?.message || error.message}`)
      }
      throw error
    }
  }

  /**
   * Refund a charge
   * @param chargeId - Charge ID
   * @param amount - Refund amount (optional, full refund if not provided)
   * @returns Refund response
   */
  async refundCharge(chargeId: string, amount?: number): Promise<any> {
    try {
      const response = await this.client.post(`/charges/${chargeId}/refund`, {
        amount: amount,
      })
      return response.data
    } catch (error: any) {
      if (axios.isAxiosError(error)) {
        throw new Error(`Tap API error: ${error.response?.data?.message || error.message}`)
      }
      throw error
    }
  }
}
