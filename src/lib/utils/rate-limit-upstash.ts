/**
 * @file rate-limit-upstash.ts
 * @description Optional Upstash Redis rate limiters (Phase 0.2). Use when UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN are set.
 * @module lib/utils
 */

import { Ratelimit } from '@upstash/ratelimit'
import { Redis } from '@upstash/redis'
import { config } from '@/lib/config'
import { getClientIP, checkRateLimit } from './rate-limit'
import { checkRateLimitRedis } from './rate-limit-redis'

let redis: Redis | null = null
let limiters: {
  public: Ratelimit | null
  authenticated: Ratelimit | null
  checkout: Ratelimit | null
  payment: Ratelimit | null
  auth: Ratelimit | null
  ai: Ratelimit | null
  blogAi: Ratelimit | null
} = {
  public: null,
  authenticated: null,
  checkout: null,
  payment: null,
  auth: null,
  ai: null,
  blogAi: null,
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
    const authLimit = config.rateLimit.auth.attemptsPer15Min
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
      auth: new Ratelimit({
        redis: r,
        limiter: Ratelimit.slidingWindow(authLimit, '15 m'),
        analytics: true,
      }),
      ai: new Ratelimit({
        redis: r,
        limiter: Ratelimit.slidingWindow(60, '1 m'),
        analytics: true,
      }),
      blogAi: new Ratelimit({
        redis: r,
        limiter: Ratelimit.slidingWindow(20, '1 h'),
        analytics: true,
      }),
    }
  }
  return limiters
}

export type RateLimitTierName = 'public' | 'authenticated' | 'checkout' | 'payment' | 'auth' | 'ai' | 'blogAi'

function authRateLimitFallback(request: Request, identifier?: string): UpstashRateLimitResult {
  const id = identifier ?? getClientIP(request)
  const fallback = checkRateLimit({
    identifier: `auth:${id}`,
    limit: config.rateLimit.auth.attemptsPer15Min,
    window: 900,
  })
  return {
    allowed: fallback.allowed,
    remaining: fallback.remaining,
    reset: fallback.resetAt,
  }
}

const TIER_LIMITS: Record<RateLimitTierName, { limit: number; windowSec: number }> = {
  public: { limit: 100, windowSec: 60 },
  authenticated: { limit: 300, windowSec: 60 },
  checkout: { limit: 10, windowSec: 60 },
  payment: { limit: 5, windowSec: 300 },
  auth: { limit: config.rateLimit.auth.attemptsPer15Min, windowSec: 900 },
  ai: { limit: 60, windowSec: 60 },
  blogAi: { limit: 20, windowSec: 3600 },
}

async function redisTierFallback(
  request: Request,
  tier: RateLimitTierName,
  identifier?: string
): Promise<UpstashRateLimitResult | null> {
  const id = identifier ?? getClientIP(request)
  const { limit, windowSec } = TIER_LIMITS[tier]
  return checkRateLimitRedis(`${tier}:${id}`, limit, windowSec)
}

export interface UpstashRateLimitResult {
  allowed: boolean
  remaining: number
  reset: number
}

/**
 * Check rate limit via Upstash Redis. Falls back to in-memory auth limiting when Redis is not configured.
 */
export async function checkRateLimitUpstash(
  request: Request,
  tier: RateLimitTierName,
  identifier?: string
): Promise<UpstashRateLimitResult> {
  try {
    const limiters = getLimiters()
    const limiter = limiters[tier]
    if (!limiter) {
      const redisResult = await redisTierFallback(request, tier, identifier)
      if (redisResult) return redisResult
      if (tier === 'auth') {
        return authRateLimitFallback(request, identifier)
      }
      return { allowed: true, remaining: 999, reset: Date.now() + 60000 }
    }

    const id = identifier ?? getClientIP(request)
    const { success, remaining, reset } = await limiter.limit(id)
    return {
      allowed: success,
      remaining: remaining ?? 0,
      reset: reset ?? Date.now() + 60000,
    }
  } catch (error) {
    console.error('[rate-limit-upstash] Failed, using fallback', {
      tier,
      error: error instanceof Error ? error.message : error,
      stack: error instanceof Error ? error.stack : undefined,
    })
    if (tier === 'auth') {
      return authRateLimitFallback(request, identifier)
    }
    const redisResult = await redisTierFallback(request, tier, identifier)
    if (redisResult) return redisResult
    return { allowed: true, remaining: 999, reset: Date.now() + 60000 }
  }
}

/**
 * For AI routes: returns a 429 Response if over limit, otherwise null.
 * Call after auth; use identifier = session.user.id.
 */
export async function aiRateLimitResponse(
  request: Request,
  identifier: string
): Promise<Response | null> {
  const result = await checkRateLimitUpstash(request, 'ai', identifier)
  if (result.allowed) return null
  const retryAfter = Math.ceil((result.reset - Date.now()) / 1000)
  return new Response(JSON.stringify({ error: 'Too many requests', code: 'RATE_LIMITED' }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': String(Math.max(1, retryAfter)),
    },
  })
}

/**
 * For blog AI routes: 20/hour per user. Returns 429 if over limit.
 */
export async function blogAiRateLimitResponse(
  request: Request,
  identifier: string
): Promise<Response | null> {
  const result = await checkRateLimitUpstash(request, 'blogAi', identifier)
  if (result.allowed) return null
  const retryAfter = Math.ceil((result.reset - Date.now()) / 1000)
  return new Response(JSON.stringify({ error: 'Too many requests', code: 'RATE_LIMITED' }), {
    status: 429,
    headers: {
      'Content-Type': 'application/json',
      'Retry-After': String(Math.max(1, retryAfter)),
    },
  })
}
