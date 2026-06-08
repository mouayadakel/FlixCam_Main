import { PaymentGatewayAdapter, CreatePaymentParams, CreatePaymentResult } from '../payment-gateway/types'

export function createTabbyAdapter(config: Record<string, string | undefined>): PaymentGatewayAdapter {
  const secretKey = config.secretKey

  return {
    async createPayment(params: CreatePaymentParams): Promise<CreatePaymentResult> {
      if (!secretKey) return { success: false, error: 'Tabby secretKey not configured' }
      
      try {
        const payload = {
          payment: {
            amount: params.amount,
            currency: params.currency,
            description: params.description || 'FlixCam Rental',
            buyer: {
              phone: params.customer.phone,
              email: params.customer.email,
              name: `${params.customer.firstName || ''} ${params.customer.lastName || ''}`.trim() || 'Customer'
            },
            shipping_address: {
              city: 'Riyadh',
              address: 'Saudi Arabia',
              zip: '12345'
            },
            order: {
              reference_id: params.metadata.booking_id,
              items: [
                {
                  title: 'Equipment Rental',
                  quantity: 1,
                  unit_price: params.amount,
                  reference_id: 'RENTAL'
                }
              ]
            }
          },
          lang: 'ar',
          merchant_code: 'FLIXCAM',
          merchant_urls: {
            success: params.redirectUrl,
            cancel: params.redirectUrl,
            failure: params.redirectUrl
          }
        }

        const res = await fetch(`https://api.tabby.ai/api/v2/checkout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${secretKey}`
          },
          body: JSON.stringify(payload)
        })

        const data = await res.json()

        if (!res.ok) {
          return { success: false, error: data.error || data.message || 'Tabby payment failed' }
        }

        const redirectUrl = data.configuration?.available_products?.installments?.[0]?.web_url || 
                            data.configuration?.available_products?.pay_later?.[0]?.web_url

        if (!redirectUrl) {
          return { success: false, error: 'Tabby checkout URL not found in response' }
        }

        return {
          success: true,
          externalId: data.payment.id,
          redirectUrl
        }
      } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    }
  }
}

export async function testTabbyConnection(config: Record<string, string | undefined>): Promise<{ ok: boolean; message: string }> {
  if (!config.secretKey) return { ok: false, message: 'Missing Tabby secretKey' }
  return { ok: true, message: 'Tabby configured' }
}
