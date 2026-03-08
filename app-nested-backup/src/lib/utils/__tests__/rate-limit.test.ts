/**
 * Unit tests for rate-limit utils
 */

import {
  checkRateLimit,
  getClientIP,
  rateLimitByTier,
  rateLimitAPI,
  rateLimitAuth,
} from '../rate-limit'

describe('rate-limit', () => {
  describe('checkRateLimit', () => {
    it('allows first request', () => {
      const result = checkRateLimit({
        identifier: 'ip_1',
        limit: 10,
        window: 60,
      })
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(9)
    })
    it('allows until limit exceeded', () => {
      const id = 'ip_' + Date.now()
      for (let i = 0; i < 3; i++) {
        const result = checkRateLimit({ identifier: id, limit: 3, window: 60 })
        expect(result.allowed).toBe(true)
      }
      const fourth = checkRateLimit({ identifier: id, limit: 3, window: 60 })
      expect(fourth.allowed).toBe(false)
      expect(fourth.remaining).toBe(0)
    })
    it('resets when window expires', () => {
      const id = 'ip_reset_' + Date.now()
      checkRateLimit({ identifier: id, limit: 2, window: 1 })
      checkRateLimit({ identifier: id, limit: 2, window: 1 })
      const blocked = checkRateLimit({ identifier: id, limit: 2, window: 1 })
      expect(blocked.allowed).toBe(false)
      // Wait for window to expire (1 second)
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const afterReset = checkRateLimit({ identifier: id, limit: 2, window: 1 })
          expect(afterReset.allowed).toBe(true)
          expect(afterReset.remaining).toBe(1)
          resolve()
        }, 1100)
      })
    })
    it('evicts expired entries when store exceeds 10000', async () => {
      const base = 'evict_' + Date.now()
      for (let i = 0; i < 10001; i++) {
        checkRateLimit({ identifier: `${base}_${i}`, limit: 10, window: 1 })
      }
      await new Promise((r) => setTimeout(r, 1100))
      const result = checkRateLimit({ identifier: `${base}_new`, limit: 10, window: 60 })
      expect(result.allowed).toBe(true)
    })
  })

  describe('getClientIP', () => {
    it('uses x-forwarded-for when present', () => {
      const req = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' },
      })
      expect(getClientIP(req)).toBe('192.168.1.1')
    })
    it('uses x-real-ip when x-forwarded-for absent', () => {
      const req = new Request('http://localhost', {
        headers: { 'x-real-ip': '10.0.0.2' },
      })
      expect(getClientIP(req)).toBe('10.0.0.2')
    })
    it('returns unknown when no headers', () => {
      const req = new Request('http://localhost')
      expect(getClientIP(req)).toBe('unknown')
    })
  })

  describe('rateLimitByTier', () => {
    it('uses userId when provided', () => {
      const req = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '1.2.3.4' },
      })
      const r1 = rateLimitByTier(req, 'public', 'user_123')
      const r2 = rateLimitByTier(req, 'public', 'user_456')
      expect(r1.allowed).toBe(true)
      expect(r2.allowed).toBe(true)
      expect(r1.remaining).toBe(r2.remaining)
    })
    it('uses IP when userId is null', () => {
      const req = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '5.6.7.8' },
      })
      const result = rateLimitByTier(req, 'public', null)
      expect(result.allowed).toBe(true)
    })
    it('respects checkout tier limits', () => {
      const req = new Request('http://localhost', { headers: { 'x-forwarded-for': '9.9.9.9' } })
      const r = rateLimitByTier(req, 'checkout')
      expect(r.allowed).toBe(true)
      expect(r.remaining).toBeLessThanOrEqual(9)
    })
    it('respects authenticated tier limits', () => {
      const req = new Request('http://localhost', { headers: { 'x-forwarded-for': '8.8.8.8' } })
      const r = rateLimitByTier(req, 'authenticated')
      expect(r.allowed).toBe(true)
      expect(r.remaining).toBeLessThanOrEqual(299)
    })
    it('respects payment tier limits', () => {
      const req = new Request('http://localhost', { headers: { 'x-forwarded-for': '7.7.7.7' } })
      const r = rateLimitByTier(req, 'payment')
      expect(r.allowed).toBe(true)
      expect(r.remaining).toBeLessThanOrEqual(4)
    })
    it('uses default tier when unknown tier passed', () => {
      const req = new Request('http://localhost', { headers: { 'x-forwarded-for': '6.6.6.6' } })
      const r = rateLimitByTier(req, 'unknown' as 'public')
      expect(r.allowed).toBe(true)
      expect(r.remaining).toBe(99)
    })
  })

  describe('rateLimitAPI', () => {
    it('returns rate limit result', () => {
      const req = new Request('http://localhost', { headers: { 'x-forwarded-for': '1.1.1.1' } })
      const result = rateLimitAPI(req)
      expect(result).toHaveProperty('allowed')
      expect(result).toHaveProperty('remaining')
      expect(result).toHaveProperty('resetAt')
    })
  })

  describe('rateLimitAuth', () => {
    it('returns rate limit result', () => {
      const req = new Request('http://localhost', { headers: { 'x-real-ip': '2.2.2.2' } })
      const result = rateLimitAuth(req)
      expect(result).toHaveProperty('allowed')
      expect(result).toHaveProperty('remaining')
      expect(result).toHaveProperty('resetAt')
    })
  })
})
