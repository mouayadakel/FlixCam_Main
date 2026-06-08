/**
 * Phase 6 — Cron observability & dead-letter review.
 */

import { Queue } from 'bullmq'
import { getRedisClient } from '@/lib/queue/redis.client'
import { DEAD_LETTER_QUEUE_NAME } from '@/lib/queue/dead-letter.queue'
import { CronObservabilityService } from '@/lib/services/cron-observability.service'
import { alertAdmins, alertCronJobIssue } from '@/lib/services/cron-alert.service'
import { wrapCronJob } from './cron-utils'

export const runCronHealthAlerts = wrapCronJob('cron-health-alerts', async () => {
  const jobs = await CronObservabilityService.getJobStatuses()
  let alerted = 0

  for (const job of jobs) {
    if (job.lastStatus === 'failed') {
      const sent = await alertCronJobIssue(job.slug, 'failed', job.lastError ?? undefined)
      if (sent) alerted++
    } else if (job.lastStatus === 'stale') {
      const sent = await alertCronJobIssue(
        job.slug,
        'stale',
        `Last run: ${job.lastRunAt ?? 'never'}`
      )
      if (sent) alerted++
    }
  }

  return { checked: jobs.length, alerted }
})

export const runDeadLetterReview = wrapCronJob('dead-letter-review', async () => {
  const threshold = Number(process.env.DLQ_ALERT_THRESHOLD || 10)
  let waiting = 0
  let sampled: unknown[] = []

  try {
    const dlq = new Queue(DEAD_LETTER_QUEUE_NAME, { connection: getRedisClient() })
    const counts = await dlq.getJobCounts('waiting', 'delayed', 'failed')
    waiting = (counts.waiting ?? 0) + (counts.delayed ?? 0) + (counts.failed ?? 0)
    const jobs = await dlq.getJobs(['waiting', 'failed'], 0, 5)
    sampled = jobs.map((j) => ({
      id: j.id,
      queue: (j.data as { originalQueue?: string })?.originalQueue,
      error: (j.data as { error?: string })?.error,
      failedAt: (j.data as { failedAt?: string })?.failedAt,
    }))
    await dlq.close()
  } catch {
    return { waiting: 0, alerted: false, note: 'Redis/DLQ unavailable' }
  }

  let alerted = false
  if (waiting >= threshold) {
    await alertAdmins(
      `FlixCam DLQ alert: ${waiting} jobs`,
      `Dead-letter queue has ${waiting} items (threshold ${threshold}).\n\nSample:\n${JSON.stringify(sampled, null, 2)}`
    )
    alerted = true
  }

  return { waiting, threshold, alerted, sample: sampled }
})

export const runInfrastructureHealth = wrapCronJob('infrastructure-health', async () => {
  const checks: Record<string, boolean | string> = {}

  checks.redisUrl = Boolean(process.env.REDIS_URL?.trim())
  checks.bullmqRedisSplit = Boolean(process.env.BULLMQ_REDIS_URL?.trim())
  checks.upstash = Boolean(
    process.env.UPSTASH_REDIS_REST_URL?.trim() && process.env.UPSTASH_REDIS_REST_TOKEN?.trim()
  )
  checks.objectStorage = Boolean(
    process.env.S3_BUCKET?.trim() || process.env.R2_BUCKET?.trim()
  )
  checks.backupRemote = Boolean(process.env.BACKUP_REMOTE_PATH?.trim())
  checks.ga4Secret = Boolean(process.env.GA4_MEASUREMENT_API_SECRET?.trim())
  checks.uptimeWebhook = Boolean(process.env.UPTIME_WEBHOOK_SECRET?.trim())

  const missing = Object.entries(checks)
    .filter(([, v]) => v === false)
    .map(([k]) => k)

  return { checks, missing, healthy: missing.length === 0 }
})
