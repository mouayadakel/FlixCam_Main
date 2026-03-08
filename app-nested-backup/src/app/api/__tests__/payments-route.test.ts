/**
 * Integration tests for GET /api/payments
 * Mocks auth, PaymentPolicy, PaymentService; tests 401, 200.
 */

jest.mock('@/lib/auth', () => ({ auth: jest.fn() }))
jest.mock('@/lib/services/payment.service', () => ({
  PaymentService: { list: jest.fn() },
}))
jest.mock('@/lib/policies/payment.policy', () => ({
  PaymentPolicy: { canView: jest.fn() },
}))

import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { PaymentService } from '@/lib/services/payment.service'
import { PaymentPolicy } from '@/lib/policies/payment.policy'
import { GET } from '@/app/api/payments/route'

const mockAuth = auth as jest.Mock
const mockList = PaymentService.list as jest.Mock
const mockCanView = PaymentPolicy.canView as jest.Mock

function createGetRequest(url = 'http://localhost/api/payments') {
  return new NextRequest(url)
}

describe('GET /api/payments', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const req = createGetRequest()
    const res = await GET(req)
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe('Unauthorized')
    expect(mockCanView).not.toHaveBeenCalled()
    expect(mockList).not.toHaveBeenCalled()
  })

  it('returns 401 when session has no user id', async () => {
    mockAuth.mockResolvedValue({ user: {} })
    const req = createGetRequest()
    const res = await GET(req)
    expect(res.status).toBe(401)
    expect(mockList).not.toHaveBeenCalled()
  })

  it('returns 200 with list when authenticated and policy allows', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockCanView.mockResolvedValue({ allowed: true })
    mockList.mockResolvedValue({
      payments: [],
      total: 0,
      page: 1,
      pageSize: 20,
      summary: {},
    })
    const req = createGetRequest()
    const res = await GET(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.data).toEqual([])
    expect(data.total).toBe(0)
    expect(mockList).toHaveBeenCalledWith('user-1', expect.any(Object))
  })
})
