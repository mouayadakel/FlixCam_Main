/**
 * Unit tests for rate-limit-upstash (Redis NOT configured)
 */

jest.mock('@/lib/config', () => ({
  config: {
    redis: { url: '', token: '' },
    rateLimit: { auth: { attemptsPer15Min: 5 } },
  },
}))

jest.mock('../rate-limit', () => ({
  getClientIP: jest.fn().mockReturnValue('127.0.0.1'),
}))

import { checkRateLimitUpstash, aiRateLimitResponse, blogAiRateLimitResponse } from '../rate-limit-upstash'

describe('rate-limit-upstash', () => {
  describe('checkRateLimitUpstash', () => {
    it('returns allowed when Redis not configured', async () => {
      const request = new Request('http://localhost')
      const result = await checkRateLimitUpstash(request, 'public')
      expect(result).toEqual({ allowed: true, remaining: 999, reset: expect.any(Number) })
    })

    it('returns allowed for all tiers when Redis not configured', async () => {
      const request = new Request('http://localhost')
      const tiers = ['public', 'authenticated', 'checkout', 'payment', 'auth', 'ai', 'blogAi'] as const
      for (const tier of tiers) {
        const result = await checkRateLimitUpstash(request, tier)
        expect(result.allowed).toBe(true)
      }
    })

    it('returns allowed when tier has no limiter (unknown tier)', async () => {
      const request = new Request('http://localhost')
      const result = await checkRateLimitUpstash(request, 'invalid' as 'public')
      expect(result).toEqual({ allowed: true, remaining: 999, reset: expect.any(Number) })
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
