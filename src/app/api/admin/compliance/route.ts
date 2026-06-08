/**
 * GET /api/admin/compliance — Compliance dashboard metrics (Phase 10).
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!(await hasPermission(session.user.id, PERMISSIONS.SYSTEM_HEALTH_CHECK))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [withPhone, optedIn, lastRotation, openTickets] = await Promise.all([
    prisma.user.count({
      where: { deletedAt: null, phone: { not: null }, role: 'CUSTOMER' },
    }),
    prisma.user.count({
      where: { deletedAt: null, whatsappOptIn: true, role: 'CUSTOMER' },
    }),
    prisma.auditLog.findFirst({
      where: { action: 'cron.credential.rotation_reminder' },
      orderBy: { timestamp: 'desc' },
    }),
    prisma.auditLog.count({
      where: { action: 'cron.security.remediation_ticket' },
    }),
  ])

  const quarterStart = new Date()
  quarterStart.setMonth(quarterStart.getMonth() - 3)

  return NextResponse.json({
    whatsappOptIn: {
      optedIn,
      total: withPhone,
      rate: withPhone > 0 ? (optedIn / withPhone) * 100 : 0,
    },
    pdplArchiveDir: process.env.PDPL_ARCHIVE_DIR || '/var/backups/flixcam/pdpl',
    credentialRotation: {
      dueForReview: !lastRotation || lastRotation.timestamp < quarterStart,
      lastReminder: lastRotation?.timestamp.toISOString() ?? null,
    },
    openSecurityTickets: openTickets,
  })
}
