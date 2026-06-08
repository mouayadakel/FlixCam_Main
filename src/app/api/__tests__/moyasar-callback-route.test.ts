jest.mock('@/lib/services/payment-gateway-config.service', () => ({
  PaymentGatewayConfigService: {
    getConfig: jest.fn(),
  },
}))

jest.mock('@/lib/integrations/moyasar/client', () => ({
  MoyasarClient: jest.fn().mockImplementation(() => ({
    getPayment: jest.fn(),
  })),
}))

jest.mock('@/lib/services/payment.service', () => ({
  PaymentService: {
    handleGatewayWebhook: jest.fn(),
  },
}))

import { NextRequest } from 'next/server'
import { PaymentGatewayConfigService } from '@/lib/services/payment-gateway-config.service'
import { MoyasarClient } from '@/lib/integrations/moyasar/client'
import { PaymentService } from '@/lib/services/payment.service'
import { GET } from '@/app/api/checkout/moyasar/callback/route'

const mockGetConfig = PaymentGatewayConfigService.getConfig as jest.Mock
const mockMoyasarClient = MoyasarClient as unknown as jest.Mock
const mockHandleGatewayWebhook = PaymentService.handleGatewayWebhook as jest.Mock

describe('GET /api/checkout/moyasar/callback', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.APP_URL = 'http://localhost:3000'
    mockHandleGatewayWebhook.mockResolvedValue(undefined)
  })

  it('redirects to portal when bookingId is missing', async () => {
    const request = new NextRequest('http://localhost:3000/api/checkout/moyasar/callback')
    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe('http://localhost:3000/portal/bookings')
  })

  it('redirects to confirmation pending when payment id is missing', async () => {
    const request = new NextRequest(
      'http://localhost:3000/api/checkout/moyasar/callback?bookingId=b1'
    )
    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/booking/confirmation/b1?paymentStatus=pending'
    )
  })

  it('verifies payment and redirects with payment status', async () => {
    mockGetConfig.mockResolvedValue({ secretKey: 'sk_test_123' })
    const getPayment = jest.fn().mockResolvedValue({
      id: 'pay_1',
      status: 'paid',
      amount: 5000,
      metadata: { booking_id: 'b1' },
    })
    mockMoyasarClient.mockImplementation(() => ({ getPayment }))

    const request = new NextRequest(
      'http://localhost:3000/api/checkout/moyasar/callback?bookingId=b1&id=pay_1'
    )
    const response = await GET(request)

    expect(response.status).toBe(307)
    expect(response.headers.get('location')).toBe(
      'http://localhost:3000/booking/confirmation/b1?paymentStatus=paid'
    )
    expect(mockHandleGatewayWebhook).toHaveBeenCalledWith('moyasar', {
      type: 'paid',
      bookingId: 'b1',
      amount: 5000,
      externalId: 'pay_1',
    })
  })
})
