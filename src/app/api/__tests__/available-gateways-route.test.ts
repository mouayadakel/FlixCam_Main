jest.mock('@/lib/services/payment-gateway-config.service', () => ({
  PaymentGatewayConfigService: {
    getEnabledGateways: jest.fn(),
  },
}))

jest.mock('@/lib/auth', () => ({
  auth: jest.fn().mockResolvedValue({ user: { id: 'user-1' } }),
}))

jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
  },
}))

import { GET } from '@/app/api/checkout/available-gateways/route'
import { PaymentGatewayConfigService } from '@/lib/services/payment-gateway-config.service'

const mockGetEnabledGateways = PaymentGatewayConfigService.getEnabledGateways as jest.Mock

describe('GET /api/checkout/available-gateways', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.MOYASAR_ROLLOUT_ENABLED = 'true'
    process.env.MOYASAR_ROLLOUT_PERCENT = '100'
    process.env.PAYMENT_DEFAULT_GATEWAY = 'moyasar'
  })

  it('puts moyasar first when enabled', async () => {
    mockGetEnabledGateways.mockResolvedValue([
      { slug: 'tap', displayName: 'Tap', sortOrder: 0 },
      { slug: 'moyasar', displayName: 'Moyasar', sortOrder: 1 },
      { slug: 'tabby', displayName: 'Tabby', sortOrder: 2 },
    ])

    const response = await GET()
    expect(response.status).toBe(200)
    const data = await response.json()

    expect(data.gateways[0].slug).toBe('moyasar')
    expect(data.gateways[1].slug).toBe('tap')
  })

  it('puts default gateway first when PAYMENT_DEFAULT_GATEWAY is tap', async () => {
    process.env.PAYMENT_DEFAULT_GATEWAY = 'tap'
    mockGetEnabledGateways.mockResolvedValue([
      { slug: 'moyasar', displayName: 'Moyasar', sortOrder: 0 },
      { slug: 'tap', displayName: 'Tap', sortOrder: 1 },
    ])

    const response = await GET()
    const data = await response.json()

    expect(data.gateways[0].slug).toBe('tap')
  })
})
