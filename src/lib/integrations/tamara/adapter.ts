import { PaymentGatewayAdapter, CreatePaymentParams, CreatePaymentResult } from '../payment-gateway/types'

export function createTamaraAdapter(config: Record<string, string | undefined>): PaymentGatewayAdapter {
  const apiToken = config.apiToken

  return {
    async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
      if (!apiToken) return { success: false, error: 'Tamara apiToken not configured' }
      
      try {
        const payload = {
          order_reference_id: params.metadata.booking_id,
          total_amount: {
            amount: params.amount,
            currency: params.currency
          },
          description: params.description || 'FlixCam Rental',
          country_code: 'SA',
          payment_type: 'PAY_BY_INSTALMENTS',
          locale: 'ar_SA',
          items: [
            {
              reference_id: 'rental',
              type: 'Digital',
              name: 'Equipment Rental',
              sku: 'RENTAL',
              quantity: 1,
              total_amount: {
                amount: params.amount,
                currency: params.currency
              }
            }
          ],
          consumer: {
            first_name: params.customer.firstName || 'Customer',
            last_name: params.customer.lastName || '.',
            phone_number: params.customer.phone,
            email: params.customer.email
          },
          merchant_url: {
            success: params.redirectUrl,
            failure: params.redirectUrl,
            cancel: params.redirectUrl,
            notification: 'https://flixcam.rent/api/webhooks/tamara'
          }
        }

        const baseUrl = apiToken.startsWith('test_') ? 'https://api-sandbox.tamara.co' : 'https://api.tamara.co'

        const res = await fetch(`${baseUrl}/checkout/sessions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiToken}`
          },
          body: JSON.stringify(payload)
        })

        const data = await res.json()

        if (!res.ok) {
          return { success: false, error: data.message || data.errors?.[0]?.error_message || 'Tamara payment failed' }
        }

        return {
          success: true,
          externalId: data.order_id,
          redirectUrl: data.checkout_url
        }
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  }
}

export async function testTamaraConnection(config: Record<string, string | undefined>): Promise<{ ok: boolean; message: string }> {
  if (!config.apiToken) return { ok: false, message: 'Missing Tamara apiToken' }
  return { ok: true, message: 'Tamara configured' }
}
