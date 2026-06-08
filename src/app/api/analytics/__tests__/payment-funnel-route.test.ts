jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}))

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    payment: {
      count: jest.fn(),
    },
    event: {
      count: jest.fn(),
    },
  },
}))

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { GET } from '@/app/api/analytics/payment-funnel/route'

const mockAuth = auth as jest.Mock
const mockPaymentCount = prisma.payment.count as jest.Mock
const mockEventCount = prisma.event.count as jest.Mock

describe('GET /api/analytics/payment-funnel', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns unauthorized without session', async () => {
    mockAuth.mockResolvedValue(null)
    const response = await GET(new Request('http://localhost:3000/api/analytics/payment-funnel'))
    expect(response.status).toBe(401)
  })

  it('returns funnel metrics when authorized', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'admin-1' } })
    mockPaymentCount
      .mockResolvedValueOnce(20) // total
      .mockResolvedValueOnce(15) // success
      .mockResolvedValueOnce(2) // failed
      .mockResolvedValueOnce(1) // processing
      .mockResolvedValueOnce(2) // pending
      .mockResolvedValueOnce(0) // refunded
    mockEventCount
      .mockResolvedValueOnce(3) // queue pending
      .mockResolvedValueOnce(1) // queue failed

    const response = await GET(new Request('http://localhost:3000/api/analytics/payment-funnel?hours=24'))
    const payload = await response.json()

    expect(response.status).toBe(200)
    expect(payload.successRate).toBe(75)
    expect(payload.queue).toEqual({ pending: 3, failed: 1 })
  })
})
