/**
 * @file read-only.middleware.ts
 * @description Read-only mode get/set for Node (API routes). Uses Upstash Redis when
 * configured so Edge middleware (read-only-edge.ts) can read the same state.
 * Does not import ioredis to avoid pulling it into Edge.
 * @module lib/middleware
 */

import { Redis } from '@upstash/redis'
import { config } from '@/lib/config'

const REDIS_KEY = 'app:read_only_mode'

let memoryFallback = false
let upstashRedis: Redis | null = null

function getUpstashRedis(): Redis | null {
  if (!config.redis.url || !config.redis.token) return null
  if (!upstashRedis) {
    upstashRedis = new Redis({
      url: config.redis.url,
      token: config.redis.token,
    })
  }
  return upstashRedis
}

/**
 * Get read-only mode (Upstash when configured, else in-memory fallback).
 * Used by API routes and admin UI. Edge middleware reads from Upstash via read-only-edge.ts.
 */
export async function getReadOnlyMode(): Promise<boolean> {
  const redis = getUpstashRedis()
  if (redis) {
    try {
      const value = await redis.get(REDIS_KEY)
      if (value !== null && value !== undefined) return value === '1' || value === true
    } catch {
      // Fall through to memory fallback
    }
  }
  return memoryFallback
}

/**
 * Set read-only mode (persist to Upstash and in-memory fallback).
 * Edge middleware will read this from Upstash.
 */
export async function setReadOnlyMode(enabled: boolean): Promise<void> {
  memoryFallback = enabled
  const redis = getUpstashRedis()
  if (redis) {
    try {
      await redis.set(REDIS_KEY, enabled ? '1' : '0')
    } catch {
      // In-memory already set; Redis write best-effort
    }
  }
}
