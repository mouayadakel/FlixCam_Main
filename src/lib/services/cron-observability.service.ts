/**
 * Cron job observability — last run times, health, reconciliation summaries.
 */

import { prisma } from '@/lib/db/prisma'
import { CRON_JOB_REGISTRY } from '@/lib/services/cron'
import { CRON_JOB_SCHEDULES } from '@/lib/services/cron/schedules'

export interface CronJobStatus {
  slug: string
  label: string
  tier: number
  intervalMinutes: number
  lastRunAt: string | null
  lastStatus: 'ok' | 'failed' | 'never' | 'stale'
  lastDurationMs: number | null
  lastError: string | null
  registered: boolean
}

export class CronObservabilityService {
  static async getJobStatuses(): Promise<CronJobStatus[]> {
    const logs = await prisma.auditLog.findMany({
      where: {
        action: { startsWith: 'cron.' },
        resourceType: 'CronJob',
      },
      orderBy: { timestamp: 'desc' },
      take: 500,
      select: {
        action: true,
        resourceId: true,
        metadata: true,
        timestamp: true,
      },
    })

    const lastByJob = new Map<string, (typeof logs)[0]>()
    for (const log of logs) {
      const slug = log.resourceId ?? log.action.replace(/^cron\./, '').replace(/\.(completed|failed)$/, '')
      if (!lastByJob.has(slug)) lastByJob.set(slug, log)
    }

    const now = Date.now()

    return CRON_JOB_SCHEDULES.map((schedule) => {
      const log = lastByJob.get(schedule.slug)
      const meta = (log?.metadata ?? {}) as Record<string, unknown>
      const failed = log?.action.endsWith('.failed')
      const ok = log?.action.endsWith('.completed')

      let lastStatus: CronJobStatus['lastStatus'] = 'never'
      if (log) {
        if (failed) lastStatus = 'failed'
        else if (ok) {
          const ageMin = (now - log.timestamp.getTime()) / 60_000
          lastStatus = ageMin > schedule.intervalMinutes * 2 ? 'stale' : 'ok'
        }
      }

      return {
        slug: schedule.slug,
        label: schedule.label,
        tier: schedule.tier,
        intervalMinutes: schedule.intervalMinutes,
        lastRunAt: log?.timestamp.toISOString() ?? null,
        lastStatus,
        lastDurationMs: typeof meta.durationMs === 'number' ? meta.durationMs : null,
        lastError: typeof meta.error === 'string' ? meta.error : null,
        registered: schedule.slug in CRON_JOB_REGISTRY,
      }
    })
  }

  static async getReconciliationMismatches(limit = 50) {
    return prisma.auditLog.findMany({
      where: { action: 'cron.payment.reconciliation_mismatch' },
      orderBy: { timestamp: 'desc' },
      take: limit,
      select: {
        id: true,
        resourceId: true,
        metadata: true,
        timestamp: true,
      },
    })
  }

  static async getPayoutsReadyForSettlement(limit = 50) {
    return prisma.auditLog.findMany({
      where: { action: 'cron.payout.ready_for_settlement' },
      orderBy: { timestamp: 'desc' },
      take: limit,
      select: {
        id: true,
        resourceId: true,
        metadata: true,
        timestamp: true,
      },
    })
  }

  static async getRecentReports(limit = 20) {
    return prisma.auditLog.findMany({
      where: { action: { startsWith: 'cron.report.' } },
      orderBy: { timestamp: 'desc' },
      take: limit,
      select: {
        action: true,
        metadata: true,
        timestamp: true,
      },
    })
  }

  /** Phase 6c — Daily success/fail counts for last N days */
  static async getJobHistory(days = 7) {
    const since = new Date(Date.now() - days * 24 * 60 * 60_000)
    const logs = await prisma.auditLog.findMany({
      where: {
        resourceType: 'CronJob',
        OR: [{ action: { endsWith: '.completed' } }, { action: { endsWith: '.failed' } }],
        timestamp: { gte: since },
      },
      select: { action: true, timestamp: true, resourceId: true },
      orderBy: { timestamp: 'asc' },
    })

    const byDay = new Map<string, { ok: number; failed: number }>()
    for (let d = 0; d < days; d++) {
      const key = new Date(Date.now() - (days - 1 - d) * 24 * 60 * 60_000)
        .toISOString()
        .slice(0, 10)
      byDay.set(key, { ok: 0, failed: 0 })
    }

    for (const log of logs) {
      const key = log.timestamp.toISOString().slice(0, 10)
      const bucket = byDay.get(key) ?? { ok: 0, failed: 0 }
      if (log.action.includes('.failed')) bucket.failed++
      else bucket.ok++
      byDay.set(key, bucket)
    }

    return Array.from(byDay.entries()).map(([date, counts]) => ({ date, ...counts }))
  }

  static async getFailedNotifications(limit = 30) {
    return prisma.auditLog.findMany({
      where: { action: 'NOTIFICATION_FAILED' },
      orderBy: { timestamp: 'desc' },
      take: limit,
      select: {
        resourceId: true,
        metadata: true,
        timestamp: true,
      },
    })
  }
}
