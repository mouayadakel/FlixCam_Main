/**
 * Integration tests for POST /api/coupons/validate
 * Mocks auth and CouponService; tests 401, 400, 200.
 */

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}))

jest.mock('@/lib/services/coupon.service', () => ({
  CouponService: {
    validate: jest.fn(),
  },
}))

import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { CouponService } from '@/lib/services/coupon.service'
import { POST } from '@/app/api/coupons/validate/route'

const mockAuth = auth as jest.Mock
const mockValidate = CouponService.validate as jest.Mock

function createPostRequest(body: object) {
  return new NextRequest('http://localhost/api/coupons/validate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

describe('POST /api/coupons/validate', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    mockAuth.mockResolvedValue(null)
    const req = createPostRequest({ code: 'SAVE10', amount: 100 })
    const res = await POST(req)
    expect(res.status).toBe(401)
    const data = await res.json()
    expect(data.error).toBe('Unauthorized')
    expect(mockValidate).not.toHaveBeenCalled()
  })

  it('returns 401 when session has no user id', async () => {
    mockAuth.mockResolvedValue({ user: {} })
    const req = createPostRequest({ code: 'SAVE10', amount: 100 })
    const res = await POST(req)
    expect(res.status).toBe(401)
    expect(mockValidate).not.toHaveBeenCalled()
  })

  it('returns 400 for invalid body (missing code)', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    const req = createPostRequest({ amount: 100 })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBeDefined()
    expect(mockValidate).not.toHaveBeenCalled()
  })

  it('returns 400 for invalid body (negative amount)', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    const req = createPostRequest({ code: 'SAVE10', amount: -1 })
    const res = await POST(req)
    expect(res.status).toBe(400)
    expect(mockValidate).not.toHaveBeenCalled()
  })

  it('returns 200 for valid request', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockValidate.mockResolvedValue({
      valid: true,
      discount: 10,
      code: 'SAVE10',
    })
    const req = createPostRequest({ code: 'SAVE10', amount: 100 })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.success).toBe(true)
    expect(data.data).toMatchObject({ valid: true, code: 'SAVE10' })
    expect(mockValidate).toHaveBeenCalledWith('SAVE10', 100, undefined, 'user-1')
  })

  it('returns 200 with equipmentIds when provided', async () => {
    mockAuth.mockResolvedValue({ user: { id: 'user-1' } })
    mockValidate.mockResolvedValue({ valid: true })
    const req = createPostRequest({
      code: 'SAVE10',
      amount: 100,
      equipmentIds: ['eq-1', 'eq-2'],
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(mockValidate).toHaveBeenCalledWith(
      'SAVE10',
      100,
      ['eq-1', 'eq-2'],
      'user-1'
    )
  })
})
