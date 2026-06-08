/**
 * Proactive alerts for cron failures, stale jobs, and ops events (Phase 6a).
 */

import { prisma } from '@/lib/db/prisma'
import { EmailService } from '@/lib/services/email.service'
import { logger } from '@/lib/logger'

async function getAdminEmails(): Promise<string[]> {
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN', deletedAt: null },
    select: { email: true },
  })
  return admins.map((a) => a.email?.trim()).filter((e): e is string => Boolean(e))
}

export async function postSlackAlert(text: string): Promise<boolean> {
  const url = process.env.SLACK_WEBHOOK_URL?.trim() || process.env.CRON_ALERT_SLACK_WEBHOOK?.trim()
  if (!url) return false
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(10_000),
    })
    return res.ok
  } catch (err) {
    logger.warn('Slack alert failed', { error: err instanceof Error ? err.message : String(err) })
    return false
  }
}

export async function alertAdmins(subject: string, body: string): Promise<number> {
  const emails = await getAdminEmails()
  let sent = 0
  for (const to of emails) {
    const result = await EmailService.send({
      to,
      subject,
      html: `<pre style="font-family:monospace;white-space:pre-wrap">${escapeHtml(body)}</pre>`,
    })
    if (result.ok) sent++
  }
  const slackOk = await postSlackAlert(`*${subject}*\n${body}`)
  if (slackOk) sent++
  return sent
}

/** Dedupe: one alert per job+kind per hour */
export async function alertCronJobIssue(
  slug: string,
  kind: 'failed' | 'stale',
  detail?: string
): Promise<boolean> {
  const hourKey = new Date().toISOString().slice(0, 13)
  const dedupeId = `${slug}:${kind}:${hourKey}`

  const existing = await prisma.auditLog.findFirst({
    where: {
      action: 'cron.alert.sent',
      resourceId: dedupeId,
    },
  })
  if (existing) return false

  const subject = `FlixCam cron ${kind}: ${slug}`
  const body = [
    `Job: ${slug}`,
    `Status: ${kind}`,
    detail ? `Detail: ${detail}` : '',
    `Time: ${new Date().toISOString()}`,
  ]
    .filter(Boolean)
    .join('\n')

  const recipients = await alertAdmins(subject, body)

  await prisma.auditLog.create({
    data: {
      action: 'cron.alert.sent',
      resourceType: 'CronJob',
      resourceId: dedupeId,
      metadata: { slug, kind, detail, recipients },
    },
  })

  return recipients > 0
}

export async function captureCronFailureInSentry(job: string, error: string): Promise<void> {
  if (!process.env.SENTRY_DSN?.trim()) return
  try {
    const Sentry = await import('@sentry/nextjs')
    Sentry.captureMessage(`Cron job failed: ${job}`, {
      level: 'error',
      extra: { job, error },
    })
  } catch {
    // optional
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
