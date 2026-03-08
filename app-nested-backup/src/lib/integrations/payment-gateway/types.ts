/**
 * @file types.ts
 * @description Shared types for payment gateway adapters (create payment, refund, webhook).
 * @module lib/integrations/payment-gateway
 */

export interface CreatePaymentParams {
  amount: number
  currency: string
  customer: {
    email: string
    phone: string
    firstName?: string
    lastName?: string
  }
  metadata: {
    booking_id: string
    [key: string]: string
  }
  description?: string
  redirectUrl?: string
}

export interface CreatePaymentResult {
  success: boolean
  redirectUrl?: string
  externalId?: string
  error?: string
}

export interface PaymentGatewayAdapter {
  createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult>
  getPayment?(id: string): Promise<{ status: string; amount?: number; currency?: string } | null>
  refund?(id: string, amount?: number): Promise<{ success: boolean; error?: string }>
  verifyWebhook?(signature: string | null, payload: string): boolean
  parseWebhookEvent?(payload: string): unknown
}

export type GatewaySlug =
  | 'tap'
  | 'moyasar'
  | 'myfatoorah'
  | 'tamara'
  | 'tabby'
  | 'paytabs'
  | 'hyperpay'
  | 'geidea'

export interface GatewayDefinition {
  slug: GatewaySlug
  name: string
  credentialKeys: string[]
  createAdapter: (config: Record<string, string | undefined>) => PaymentGatewayAdapter
  testConnection: (config: Record<string, string | undefined>) => Promise<{ ok: boolean; message: string }>
}
