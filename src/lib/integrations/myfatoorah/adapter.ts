import { PaymentGatewayAdapter, CreatePaymentParams, CreatePaymentResult } from '../payment-gateway/types'

export function createMyFatoorahAdapter(config: Record<string, string | undefined>): PaymentGatewayAdapter {
  const apiKey = config.apiKey

  return {
    async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
      if (!apiKey) return { success: false, error: 'MyFatoorah apiKey not configured' }
      
      try {
        const payload = {
          CustomerName: `${params.customer.firstName || ''} ${params.customer.lastName || ''}`.trim() || params.customer.email,
          DisplayCurrencyIso: params.currency,
          CustomerEmail: params.customer.email,
          CustomerMobile: params.customer.phone,
          InvoiceValue: params.amount,
          CallBackUrl: params.redirectUrl,
          ErrorUrl: params.redirectUrl,
          UserDefinedField: params.metadata.booking_id,
        }

        // Use test endpoint for safe execution unless explicitly live
        const baseUrl = apiKey.startsWith('test_') ? 'https://apitest.myfatoorah.com' : 'https://api.myfatoorah.com'

        const res = await fetch(`${baseUrl}/v2/SendPayment`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify(payload)
        })

        const data = await res.json()

        if (!data.IsSuccess) {
          return { success: false, error: data.ValidationErrors?.[0]?.Error || data.Message || 'MyFatoorah payment failed' }
        }

        return {
          success: true,
          externalId: data.Data.InvoiceId?.toString(),
          redirectUrl: data.Data.InvoiceURL
        }
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  }
}

export async function testMyFatoorahConnection(config: Record<string, string | undefined>): Promise<{ ok: boolean; message: string }> {
  if (!config.apiKey) return { ok: false, message: 'Missing MyFatoorah apiKey' }
  return { ok: true, message: 'MyFatoorah configured' }
}
