/**
 * @file rate-limit-upstash.ts
 * @description Optional Upstash Redis rate limiters (Phase 0.2). Use when UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set.
 * @module lib/utils
 */

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { config } from '@/lib/config'
import { getClientIP } from './rate-limit'

let redis: Redis | null = null
let limiters: {
  public: Ratelimit | null
  authenticated: Ratelimit | null
  checkout: Ratelimit | null
  payment: Ratelimit | null
} = {
  public: null,
  authenticated: null,
  checkout: null,
  payment: null,
}

function getRedis(): Redis | null {
  if (redis) return redis
  if (config.redis.url && config.redis.token) {
    redis = new Redis({
      url: config.redis.url,
      token: config.redis.token,
    })
    return redis
  }
  return null
}

/**
 * Get Upstash rate limiters. Returns null limiters when Redis is not configured.
 */
function getLimiters() {
  const r = getRedis()
  if (!r) return limiters

  if (!limiters.public) {
    limiters = {
      public: new Ratelimit({
        redis: r,
        limiter: Ratelimit.slidingWindow(100, '1 m'),
        analytics: true,
      }),
      authenticated: new Ratelimit({
        redis: r,
        limiter: Ratelimit.slidingWindow(300, '1 m'),
        analytics: true,
      }),
      checkout: new Ratelimit({
        redis: r,
        limiter: Ratelimit.slidingWindow(10, '1 m'),
        analytics: true,
      }),
      payment: new Ratelimit({
        redis: r,
        limiter: Ratelimit.slidingWindow(5, '5 m'),
        analytics: true,
      }),
    }
  }
  return limiters
}

export type RateLimitTierName = 'public' | 'authenticated' | 'checkout' | 'payment'

export interface UpstashRateLimitResult {
  allowed: boolean
  remaining: number
  reset: number
}

/**
 * Check rate limit via Upstash Redis. Falls back to allowed: true when Redis is not configured.
 */
export async function checkRateLimitUpstash(
  request: Request,
  tier: RateLimitTierName,
  identifier?: string
): Promise<UpstashRateLimitResult> {
  const limiters = getLimiters()
  const limiter = limiters[tier]
  if (!limiter) {
    return { allowed: true, remaining: 999, reset: Date.now() + 60000 }
  }

  const id = identifier ?? getClientIP(request)
  const { success, remaining, reset } = await limiter.limit(id)
  return {
    allowed: success,
    remaining: remaining ?? 0,
    reset: reset ?? Date.now() + 60000,
  }
}
