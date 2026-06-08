/**
 * Shared helpers for scheduled cron jobs.
 */

import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'

export interface CronJobResult {
  ok: boolean
  job: string
  startedAt: string
  durationMs: number
  [key: string]: unknown
}

let cachedActorId: string | null = null

/** System user for cron-initiated booking transitions and audits. */
export async function getCronActorId(): Promise<string> {
  if (process.env.CRON_ACTOR_USER_ID?.trim()) {
    return process.env.CRON_ACTOR_USER_ID.trim()
  }
  if (cachedActorId) return cachedActorId

  const admin = await prisma.user.findFirst({
    where: { role: 'ADMIN', deletedAt: null },
    select: { id: true },
    orderBy: { createdAt: 'asc' },
  })
  if (!admin) {
    throw new Error('No CRON_ACTOR_USER_ID or ADMIN user available for cron jobs')
  }
  cachedActorId = admin.id
  return admin.id
}

export async function logCronRun(
  job: string,
  result: Record<string, unknown>,
  error?: string
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        action: error ? `cron.${job}.failed` : `cron.${job}.completed`,
        resourceType: 'CronJob',
        resourceId: job,
        metadata: { ...result, ...(error ? { error } : {}) },
      },
    })
  } catch (err) {
    logger.warn('Failed to persist cron audit log', {
      job,
      error: err instanceof Error ? err.message : String(err),
    })
  }
}

export function wrapCronJob<T extends Record<string, unknown>>(
  job: string,
  fn: () => Promise<T>
): () => Promise<CronJobResult> {
  return async () => {
    const startedAt = new Date().toISOString()
    const t0 = Date.now()
    try {
      const data = await fn()
      const result: CronJobResult = {
        ok: true,
        job,
        startedAt,
        durationMs: Date.now() - t0,
        ...data,
      }
      await logCronRun(job, result)
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      logger.error(`Cron job failed: ${job}`, { error: message })
      const result: CronJobResult = {
        ok: false,
        job,
        startedAt,
        durationMs: Date.now() - t0,
        error: message,
      }
      await logCronRun(job, result, message)
      throw err
    }
  }
}

/** Exponential backoff windows in ms: 15m, 1h, 4h, 24h */
export function cronRetryDelayMs(attempt: number): number {
  const delays = [15 * 60_000, 60 * 60_000, 4 * 60 * 60_000, 24 * 60 * 60_000]
  return delays[Math.min(attempt, delays.length - 1)] ?? delays[delays.length - 1]
}

export function parsePaymentMetadata(metadata: unknown): Record<string, unknown> {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return {}
  return metadata as Record<string, unknown>
}
