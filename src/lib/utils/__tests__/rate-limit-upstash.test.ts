/**
 * Unit tests for rate-limit-upstash (Redis NOT configured)
 */

jest.mock('@/lib/config', () => ({
  config: {
    redis: { url: '', token: '' },
    rateLimit: { auth: { attemptsPer15Min: 5 } },
  },
}))

const mockCheckRateLimit = jest.fn().mockReturnValue({
  allowed: true,
  remaining: 4,
  resetAt: Date.now() + 900000,
})

jest.mock('../rate-limit', () => ({
  getClientIP: jest.fn().mockReturnValue('127.0.0.1'),
  checkRateLimit: (...args: unknown[]) => mockCheckRateLimit(...args),
}))

import { checkRateLimitUpstash, aiRateLimitResponse, blogAiRateLimitResponse } from '../rate-limit-upstash'

describe('rate-limit-upstash', () => {
  beforeEach(() => {
    mockCheckRateLimit.mockClear()
    mockCheckRateLimit.mockReturnValue({
      allowed: true,
      remaining: 4,
      resetAt: Date.now() + 900000,
    })
  })

  describe('checkRateLimitUpstash', () => {
    it('returns allowed when Redis not configured for public tier', async () => {
      const request = new Request('http://localhost')
      const result = await checkRateLimitUpstash(request, 'public')
      expect(result).toEqual({ allowed: true, remaining: 999, reset: expect.any(Number) })
    })

    it('uses in-memory auth fallback when Redis not configured', async () => {
      const request = new Request('http://localhost')
      const result = await checkRateLimitUpstash(request, 'auth')
      expect(mockCheckRateLimit).toHaveBeenCalledWith({
        identifier: 'auth:127.0.0.1',
        limit: 5,
        window: 900,
      })
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(4)
    })

    it('returns allowed for non-auth tiers when Redis not configured', async () => {
      const request = new Request('http://localhost')
      for (const tier of ['authenticated', 'checkout', 'payment', 'ai', 'blogAi'] as const) {
        const result = await checkRateLimitUpstash(request, tier)
        expect(result.allowed).toBe(true)
      }
    })
  })

  describe('aiRateLimitResponse', () => {
    it('returns null when allowed', async () => {
      const request = new Request('http://localhost')
      const result = await aiRateLimitResponse(request, 'user_1')
      expect(result).toBeNull()
    })
  })

  describe('blogAiRateLimitResponse', () => {
    it('returns null when allowed', async () => {
      const request = new Request('http://localhost')
      const result = await blogAiRateLimitResponse(request, 'user_1')
      expect(result).toBeNull()
    })
  })
})
