/**
 * Integration tests for POST/DELETE /api/cart/coupon
 * Mocks auth, CartService, rate limit, cart session; tests 400, 200.
 */

jest.mock('@/lib/auth', () => ({
  auth: jest.fn(),
}))

jest.mock('@/lib/cart-session', () => ({
  getCartSessionId: jest.fn(),
}))

jest.mock('@/lib/utils/rate-limit-upstash', () => ({
  checkRateLimitUpstash: jest.fn(),
}))

jest.mock('@/lib/services/cart.service', () => ({
  CartService: {
    getOrCreateCart: jest.fn(),
    applyCoupon: jest.fn(),
    removeCoupon: jest.fn(),
  },
}))

import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { getCartSessionId } from '@/lib/cart-session'
import { checkRateLimitUpstash } from '@/lib/utils/rate-limit-upstash'
import { CartService } from '@/lib/services/cart.service'
import { POST, DELETE } from '@/app/api/cart/coupon/route'

const mockAuth = auth as jest.Mock
const mockGetCartSessionId = getCartSessionId as jest.Mock
const mockRateLimit = checkRateLimitUpstash as jest.Mock
const mockGetOrCreateCart = CartService.getOrCreateCart as jest.Mock
const mockApplyCoupon = CartService.applyCoupon as jest.Mock
const mockRemoveCoupon = CartService.removeCoupon as jest.Mock

const mockCart = { id: 'cart-1', items: [], couponCode: null }

function createPostRequest(body: object) {
  return new NextRequest('http://localhost/api/cart/coupon', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

function createDeleteRequest() {
  return new NextRequest('http://localhost/api/cart/coupon', {
    method: 'DELETE',
  })
}

describe('POST /api/cart/coupon', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRateLimit.mockResolvedValue({ allowed: true })
    mockGetOrCreateCart.mockResolvedValue(mockCart)
  })

  it('returns 429 when rate limited', async () => {
    mockRateLimit.mockResolvedValue({ allowed: false })
    const req = createPostRequest({ code: 'SAVE10' })
    const res = await POST(req)
    expect(res.status).toBe(429)
    expect(mockApplyCoupon).not.toHaveBeenCalled()
  })

  it('returns 400 for invalid body (not JSON)', async () => {
    const req = new NextRequest('http://localhost/api/cart/coupon', {
      method: 'POST',
      body: 'not json',
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Invalid body')
  })

  it('returns 400 when code is missing', async () => {
    const req = createPostRequest({})
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('code required')
  })

  it('returns 400 when code is empty string', async () => {
    const req = createPostRequest({ code: '   ' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 200 for valid coupon', async () => {
    mockApplyCoupon.mockResolvedValue({ ...mockCart, couponCode: 'SAVE10' })
    const req = createPostRequest({ code: 'SAVE10' })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.couponCode).toBe('SAVE10')
    expect(mockApplyCoupon).toHaveBeenCalledWith('cart-1', 'SAVE10')
  })

  it('returns 400 when coupon invalid', async () => {
    mockApplyCoupon.mockRejectedValue(new Error('Coupon expired'))
    const req = createPostRequest({ code: 'EXPIRED' })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const data = await res.json()
    expect(data.error).toBe('Coupon expired')
  })
})

describe('DELETE /api/cart/coupon', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRateLimit.mockResolvedValue({ allowed: true })
    mockGetOrCreateCart.mockResolvedValue(mockCart)
    mockGetCartSessionId.mockReturnValue(null)
  })

  it('returns 429 when rate limited', async () => {
    mockRateLimit.mockResolvedValue({ allowed: false })
    const req = createDeleteRequest()
    const res = await DELETE(req)
    expect(res.status).toBe(429)
  })

  it('returns 200 when coupon removed', async () => {
    mockRemoveCoupon.mockResolvedValue({ ...mockCart, couponCode: null })
    const req = createDeleteRequest()
    const res = await DELETE(req)
    expect(res.status).toBe(200)
    expect(mockRemoveCoupon).toHaveBeenCalledWith('cart-1')
  })
})
