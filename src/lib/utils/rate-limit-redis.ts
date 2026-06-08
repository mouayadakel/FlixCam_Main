/**
 * Distributed rate limiting via REDIS_URL (ioredis) when Upstash REST is not configured.
 */

import { getRedisClient } from '@/lib/queue/redis.client'
import type { UpstashRateLimitResult } from './rate-limit-upstash'

const REDIS_PREFIX = 'flixcam:ratelimit'

function isRedisConfigured(): boolean {
  const url = process.env.REDIS_URL?.trim()
  return Boolean(url)
}

/**
 * Fixed-window counter stored in Redis. Shared across app instances.
 */
export async function checkRateLimitRedis(
  identifier: string,
  limit: number,
  windowSec: number
): Promise<UpstashRateLimitResult | null> {
  if (!isRedisConfigured()) return null

  const key = `${REDIS_PREFIX}:${identifier}`
  const now = Date.now()
  const windowMs = windowSec * 1000

  try {
    const redis = getRedisClient()
    const count = await redis.incr(key)
    if (count === 1) {
      await redis.pexpire(key, windowMs)
    }
    const ttlMs = await redis.pttl(key)
    const reset = ttlMs > 0 ? now + ttlMs : now + windowMs

    return {
      allowed: count <= limit,
      remaining: Math.max(0, limit - count),
      reset,
    }
  } catch (error) {
    console.error('[rate-limit-redis] Failed', {
      identifier,
      error: error instanceof Error ? error.message : error,
    })
    return null
  }
}

export function isDistributedRateLimitAvailable(): boolean {
  const upstash =
    Boolean(process.env.UPSTASH_REDIS_REST_URL?.trim()) &&
    Boolean(process.env.UPSTASH_REDIS_REST_TOKEN?.trim())
  return upstash || isRedisConfigured()
}
