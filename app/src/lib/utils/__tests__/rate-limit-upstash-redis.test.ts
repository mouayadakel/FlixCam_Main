/**
 * Unit tests for rate-limit-upstash when Redis IS configured
 */

const mockLimit = jest.fn()

jest.mock('@/lib/config', () => ({
  config: {
    redis: { url: 'https://redis.test', token: 'test-token' },
    rateLimit: { auth: { attemptsPer15Min: 5 } },
  },
}))

jest.mock('../rate-limit', () => ({
  getClientIP: jest.fn().mockReturnValue('127.0.0.1'),
}))

jest.mock('@upstash/ratelimit', () => ({
  Ratelimit: Object.assign(
    jest.fn().mockImplementation(() => ({
      limit: mockLimit,
    })),
    {
      slidingWindow: jest.fn().mockReturnValue('sliding-window'),
    }
  ),
}))

jest.mock('@upstash/redis', () => ({
  Redis: jest.fn().mockImplementation(() => ({})),
}))

import {
  checkRateLimitUpstash,
  aiRateLimitResponse,
  blogAiRateLimitResponse,
} from '../rate-limit-upstash'

describe('rate-limit-upstash (Redis configured)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('checkRateLimitUpstash', () => {
    it('returns allowed when limiter allows', async () => {
      mockLimit.mockResolvedValue({ success: true, remaining: 59, reset: Date.now() + 60000 })
      const request = new Request('http://localhost')
      const result = await checkRateLimitUpstash(request, 'ai', 'user_1')
      expect(result).toEqual({ allowed: true, remaining: 59, reset: expect.any(Number) })
      expect(mockLimit).toHaveBeenCalledWith('user_1')
    })

    it('returns not allowed when limiter denies', async () => {
      const reset = Date.now() + 30000
      mockLimit.mockResolvedValue({ success: false, remaining: 0, reset })
      const request = new Request('http://localhost')
      const result = await checkRateLimitUpstash(request, 'ai', 'user_1')
      expect(result).toEqual({ allowed: false, remaining: 0, reset })
    })

    it('handles null remaining/reset from limiter', async () => {
      mockLimit.mockResolvedValue({ success: true, remaining: null, reset: null })
      const request = new Request('http://localhost')
      const result = await checkRateLimitUpstash(request, 'blogAi', 'user_2')
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(0)
      expect(result.reset).toBeGreaterThan(Date.now())
    })
  })

  describe('aiRateLimitResponse', () => {
    it('returns 429 Response when rate limited', async () => {
      mockLimit.mockResolvedValue({
        success: false,
        remaining: 0,
        reset: Date.now() + 45000,
      })
      const request = new Request('http://localhost')
      const result = await aiRateLimitResponse(request, 'user_1')
      expect(result).not.toBeNull()
      expect(result!.status).toBe(429)
      const body = await result!.json()
      expect(body).toEqual({ error: 'Too many requests', code: 'RATE_LIMITED' })
      expect(result!.headers.get('Retry-After')).toBeDefined()
    })
  })

  describe('blogAiRateLimitResponse', () => {
    it('returns 429 Response when rate limited', async () => {
      mockLimit.mockResolvedValue({
        success: false,
        remaining: 0,
        reset: Date.now() + 120000,
      })
      const request = new Request('http://localhost')
      const result = await blogAiRateLimitResponse(request, 'user_1')
      expect(result).not.toBeNull()
      expect(result!.status).toBe(429)
      const body = await result!.json()
      expect(body).toEqual({ error: 'Too many requests', code: 'RATE_LIMITED' })
    })
  })
})
