/**
 * @file redis.client.ts
 * @description Redis connection client for BullMQ queues
 * @module lib/queue
 */

import Redis from 'ioredis'

let redisClient: Redis | null = null

/**
 * Get or create Redis client instance
 * Uses singleton pattern to ensure single connection pool
 */
export function getRedisClient(): Redis {
  if (redisClient) {
    return redisClient
  }

  const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'

  redisClient = new Redis(redisUrl, {
    maxRetriesPerRequest: null, // Required by BullMQ - must be null for blocking operations
    retryStrategy: (times) => {
      const delay = Math.min(times * 50, 2000)
      return delay
    },
    enableReadyCheck: true,
    enableOfflineQueue: false,
  })

  redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err)
  })

  redisClient.on('connect', () => {
    console.log('Redis Client Connected')
  })

  return redisClient
}

/**
 * Close Redis connection
 * Useful for cleanup in tests or graceful shutdown
 */
export async function closeRedisClient(): Promise<void> {
  if (redisClient) {
    await redisClient.quit()
    redisClient = null
  }
}
