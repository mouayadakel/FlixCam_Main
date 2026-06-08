/**
 * Compliance & security cron jobs.
 */

import { execSync } from 'child_process'
import { promises as fs } from 'fs'
import path from 'path'
import { prisma } from '@/lib/db/prisma'
import { subDays } from 'date-fns'
import { wrapCronJob } from './cron-utils'

const PDPL_ARCHIVE_DIR = process.env.PDPL_ARCHIVE_DIR || '/var/backups/flixcam/pdpl'

const PDPL_ARCHIVE_DAYS = Number(process.env.PDPL_ARCHIVE_DAYS || 90)

export const runPdplArchive = wrapCronJob('pdpl-archive', async () => {
  const cutoff = subDays(new Date(), PDPL_ARCHIVE_DAYS)

  const logs = await prisma.auditLog.findMany({
    where: { timestamp: { lt: cutoff } },
    select: {
      id: true,
      action: true,
      userId: true,
      resourceType: true,
      resourceId: true,
      ipAddress: true,
      timestamp: true,
    },
    take: 5000,
    orderBy: { timestamp: 'asc' },
  })

  if (logs.length === 0) {
    return { archived: 0, message: 'No logs to archive' }
  }

  await fs.mkdir(PDPL_ARCHIVE_DIR, { recursive: true })
  const archiveFile = path.join(
    PDPL_ARCHIVE_DIR,
    `pdpl-audit-${new Date().toISOString().slice(0, 10)}.json`
  )
  await fs.writeFile(archiveFile, JSON.stringify(logs, null, 2), 'utf8')

  await prisma.auditLog.create({
    data: {
      action: 'cron.pdpl.archive_batch',
      resourceType: 'PdplArchive',
      resourceId: `batch-${Date.now()}`,
      metadata: {
        count: logs.length,
        oldestTimestamp: logs[0]?.timestamp.toISOString(),
        newestTimestamp: logs[logs.length - 1]?.timestamp.toISOString(),
        sampleIds: logs.slice(0, 10).map((l) => l.id),
      },
    },
  })

  const deleted = await prisma.auditLog.deleteMany({
    where: {
      id: { in: logs.map((l) => l.id) },
      action: { not: { startsWith: 'cron.' } },
    },
  })

  return {
    archived: logs.length,
    deleted: deleted.count,
    retentionDays: PDPL_ARCHIVE_DAYS,
    archiveFile,
  }
})

const ROTATION_KEYS = [
  'CRON_SECRET',
  'MOYASAR_SECRET_KEY',
  'MOYASAR_WEBHOOK_SECRET',
  'NEXTAUTH_SECRET',
  'RESEND_API_KEY',
  'TWILIO_AUTH_TOKEN',
] as const

export const runCredentialRotationCheck = wrapCronJob('credential-rotation-check', async () => {
  const quarterStart = new Date()
  quarterStart.setMonth(quarterStart.getMonth() - 3)

  const missing: string[] = []
  const present: string[] = []

  for (const key of ROTATION_KEYS) {
    if (process.env[key]?.trim()) {
      present.push(key)
    } else {
      missing.push(key)
    }
  }

  const lastRotation = await prisma.auditLog.findFirst({
    where: { action: 'cron.credential.rotation_completed' },
    orderBy: { timestamp: 'desc' },
  })

  const dueForReview =
    !lastRotation || lastRotation.timestamp < quarterStart

  if (dueForReview) {
    await prisma.auditLog.create({
      data: {
        action: 'cron.credential.rotation_reminder',
        resourceType: 'Security',
        resourceId: 'credential-rotation',
        metadata: { present, missing, quarterStart: quarterStart.toISOString() },
      },
    })
  }

  return { present: present.length, missing, dueForReview }
})

export const runSecurityScan = wrapCronJob('security-scan', async () => {
  const findings: string[] = []

  for (const key of ROTATION_KEYS) {
    const val = process.env[key]
    if (val && (val.includes('changeme') || val.includes('REPLACE_ME') || val === 'test')) {
      findings.push(`Weak or placeholder value detected for ${key}`)
    }
  }

  let npmAuditHigh = 0
  try {
    const out = execSync('npm audit --json', {
      cwd: process.cwd(),
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    const audit = JSON.parse(out) as {
      metadata?: { vulnerabilities?: { high?: number; critical?: number } }
    }
    npmAuditHigh =
      (audit.metadata?.vulnerabilities?.high ?? 0) +
      (audit.metadata?.vulnerabilities?.critical ?? 0)
  } catch (err) {
    const stdout = (err as { stdout?: string })?.stdout
    if (stdout) {
      try {
        const audit = JSON.parse(stdout) as {
          metadata?: { vulnerabilities?: { high?: number; critical?: number } }
        }
        npmAuditHigh =
          (audit.metadata?.vulnerabilities?.high ?? 0) +
          (audit.metadata?.vulnerabilities?.critical ?? 0)
      } catch {
        findings.push('npm audit could not be parsed')
      }
    }
  }

  if (npmAuditHigh > 0) {
    findings.push(`${npmAuditHigh} high/critical npm vulnerabilities`)
  }

  await prisma.auditLog.create({
    data: {
      action: 'cron.security.scan',
      resourceType: 'Security',
      resourceId: 'security-scan',
      metadata: { findings, npmAuditHigh },
    },
  })

  return { findings, npmAuditHigh, clean: findings.length === 0 }
})
