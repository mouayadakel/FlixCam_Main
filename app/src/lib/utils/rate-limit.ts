/**
 * @file rate-limit.ts
 * @description Rate limiting utilities (in-memory + optional Upstash Redis)
 * @module lib/utils
 */

import { config } from '@/lib/config'

// Simple in-memory rate limiter (used when Upstash Redis is not configured)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

export type RateLimitTier = 'public' | 'authenticated' | 'checkout' | 'payment'

export interface RateLimitOptions {
  identifier: string
  limit: number
  window: number // in seconds
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
}

export function checkRateLimit(options: RateLimitOptions): RateLimitResult {
  const { identifier, limit, window } = options
  const now = Date.now()
  const windowMs = window * 1000

  const record = rateLimitStore.get(identifier)

  if (!record || now > record.resetAt) {
    const resetAt = now + windowMs
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt,
    })

    if (rateLimitStore.size > 10000) {
      for (const [key, value] of rateLimitStore.entries()) {
        if (now > value.resetAt) {
          rateLimitStore.delete(key)
        }
      }
    }

    return {
      allowed: true,
      remaining: limit - 1,
      resetAt,
    }
  }

  if (record.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: record.resetAt,
    }
  }

  record.count++
  return {
    allowed: true,
    remaining: limit - record.count,
    resetAt: record.resetAt,
  }
}

export function getClientIP(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')

  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }

  if (realIP) {
    return realIP
  }

  return 'unknown'
}

/** Plan tiers: public 100/min, authenticated 300/min, checkout 10/min, payment 5/5min */
function getTierOptions(tier: RateLimitTier): { limit: number; window: number } {
  switch (tier) {
    case 'public':
      return { limit: config.rateLimit.public.requestsPerMinute, window: 60 }
    case 'authenticated':
      return { limit: config.rateLimit.authenticated.requestsPerMinute, window: 60 }
    case 'checkout':
      return { limit: config.rateLimit.checkout.requestsPerMinute, window: 60 }
    case 'payment':
      return { limit: config.rateLimit.payment.requestsPer5Min, window: 300 }
    default:
      return { limit: 100, window: 60 }
  }
}

/**
 * Rate limit by tier (public APIs, checkout, payment). Uses in-memory store.
 * For production with Upstash, use checkRateLimitUpstash in API routes.
 */
export function rateLimitByTier(
  request: Request,
  tier: RateLimitTier,
  userId?: string | null
): RateLimitResult {
  const ip = getClientIP(request)
  const identifier = userId ? `${tier}:${userId}` : `${tier}:${ip}`
  const { limit, window } = getTierOptions(tier)
  return checkRateLimit({ identifier, limit, window })
}

export function rateLimitAPI(request: Request): RateLimitResult {
  const ip = getClientIP(request)
  return checkRateLimit({
    identifier: `api:${ip}`,
    limit: config.rateLimit.api.requestsPerHour,
    window: 3600,
  })
}

export function rateLimitAuth(request: Request): RateLimitResult {
  const ip = getClientIP(request)
  return checkRateLimit({
    identifier: `auth:${ip}`,
    limit: config.rateLimit.auth.attemptsPer15Min,
    window: 900,
  })
}
