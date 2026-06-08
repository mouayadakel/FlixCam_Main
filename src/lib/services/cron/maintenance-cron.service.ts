/**
 * System maintenance cron jobs.
 */

import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { getRedisClient } from '@/lib/queue/redis.client'
import { wrapCronJob } from './cron-utils'

const REDIS_SESSION_PREFIXES = ['sess:', 'session:', 'ratelimit:', 'cache:dashboard:']

export const runRedisCleanup = wrapCronJob('redis-cleanup', async () => {
  let deleted = 0
  let scanned = 0

  try {
    const redis = getRedisClient()
    for (const prefix of REDIS_SESSION_PREFIXES) {
      let cursor = '0'
      do {
        const [next, keys] = await redis.scan(cursor, 'MATCH', `${prefix}*`, 'COUNT', 100)
        cursor = next
        scanned += keys.length
        for (const key of keys) {
          const ttl = await redis.ttl(key)
          if (ttl === -1) {
            await redis.expire(key, 86400)
            deleted++
          }
        }
      } while (cursor !== '0')
    }
  } catch (err) {
    logger.warn('redis-cleanup: Redis unavailable', {
      error: err instanceof Error ? err.message : String(err),
    })
    return { deleted, scanned, redisAvailable: false }
  }

  return { deleted, scanned, redisAvailable: true }
})

export const runDatabaseMaintenance = wrapCronJob('database-maintenance', async () => {
  const tables = ['Booking', 'Payment', 'Invoice', 'AuditLog', 'MessageLog', 'Equipment']

  let analyzed = 0
  for (const table of tables) {
    try {
      await prisma.$executeRawUnsafe(`ANALYZE "${table}"`)
      analyzed++
    } catch (err) {
      logger.warn(`database-maintenance: ANALYZE ${table} failed`, {
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  const oldAuditCount = await prisma.auditLog.count({
    where: { timestamp: { lt: new Date(Date.now() - 365 * 24 * 60 * 60_000) } },
  })

  return { tablesAnalyzed: analyzed, auditLogsOlderThan1Year: oldAuditCount }
})

export const runHealthCheck = wrapCronJob('health-check', async () => {
  const checks: Record<string, boolean> = {}

  try {
    await prisma.$queryRaw`SELECT 1`
    checks.database = true
  } catch {
    checks.database = false
  }

  try {
    const redis = getRedisClient()
    const pong = await redis.ping()
    checks.redis = pong === 'PONG'
  } catch {
    checks.redis = false
  }

  const allHealthy = Object.values(checks).every(Boolean)

  return { healthy: allHealthy, checks }
})
