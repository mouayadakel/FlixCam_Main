/**
 * @file cache.ts
 * @description Redis caching layer (Phase 0.7). Uses Redis when REDIS_URL set, in-memory fallback.
 * TTLs: websiteContent 1h, equipmentList 5min, equipmentDetail 10min, availability 1min, cart 15min.
 * @module lib
 */

import { getRedisClient } from '@/lib/queue/redis.client'
import { logger } from '@/lib/logger'

const memoryStore = new Map<string, { value: unknown; expiresAt: number }>()

const TTL = {
  websiteContent: 3600,
  equipmentList: 300,
  equipmentDetail: 600,
  availability: 60,
  cart: 900,
  /** OTP code validity (5 min). Phase 3.2 deferred registration. */
  otp: 300,
  /** One-time login token after OTP verify (2 min). Phase 3.2. */
  authToken: 120,
} as const

export type CacheNamespace = keyof typeof TTL

function getTtl(namespace: CacheNamespace): number {
  return TTL[namespace]
}

function isRedisAvailable(): boolean {
  return Boolean(process.env.REDIS_URL)
}

async function redisGet<T>(key: string): Promise<T | null> {
  try {
    const redis = getRedisClient()
    const raw = await redis.get(key)
    if (raw == null) return null
    return JSON.parse(raw) as T
  } catch (e) {
    logger.warn('Cache redis get error', { key, error: e })
    return null
  }
}

async function redisSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  try {
    const redis = getRedisClient()
    await redis.setex(key, ttlSeconds, JSON.stringify(value))
  } catch (e) {
    logger.warn('Cache redis set error', { key, error: e })
  }
}

async function redisDel(key: string): Promise<void> {
  try {
    const redis = getRedisClient()
    await redis.del(key)
  } catch (e) {
    logger.warn('Cache redis del error', { key, error: e })
  }
}

function memoryGet<T>(key: string): T | null {
  const entry = memoryStore.get(key)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    memoryStore.delete(key)
    return null
  }
  return entry.value as T
}

function memorySet(key: string, value: unknown, ttlSeconds: number): void {
  memoryStore.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  })
  if (memoryStore.size > 5000) {
    const now = Date.now()
    for (const [k, v] of memoryStore.entries()) {
      if (v.expiresAt < now) memoryStore.delete(k)
    }
  }
}

/**
 * Get cached value. Returns null if miss or expired.
 */
export async function cacheGet<T>(namespace: CacheNamespace, keyPart: string): Promise<T | null> {
  const key = `cache:${namespace}:${keyPart}`
  const ttl = getTtl(namespace)
  if (isRedisAvailable()) {
    return redisGet<T>(key)
  }
  return memoryGet<T>(key)
}

/**
 * Set cached value with namespace TTL.
 */
export async function cacheSet(
  namespace: CacheNamespace,
  keyPart: string,
  value: unknown
): Promise<void> {
  const key = `cache:${namespace}:${keyPart}`
  const ttl = getTtl(namespace)
  if (isRedisAvailable()) {
    await redisSet(key, value, ttl)
  } else {
    memorySet(key, value, ttl)
  }
}

/**
 * Invalidate a cache key.
 */
export async function cacheDelete(namespace: CacheNamespace, keyPart: string): Promise<void> {
  const key = `cache:${namespace}:${keyPart}`
  if (isRedisAvailable()) {
    await redisDel(key)
  } else {
    memoryStore.delete(key)
  }
}

/** Key helpers for plan-specified namespaces */
export const cacheKeys = {
  websiteContent: (page: string) => page,
  equipmentList: (filters: string) => filters,
  equipmentDetail: (id: string) => id,
  availability: (id: string, dates: string) => `${id}:${dates}`,
  cart: (userIdOrSession: string) => userIdOrSession,
}
