/**
 * GET /api/admin/cron — Cron job status, reconciliation, payouts, reports.
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { CronObservabilityService } from '@/lib/services/cron-observability.service'
import { getQueueStats } from '@/lib/services/notification-queue.service'

export const dynamic = 'force-dynamic'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!(await hasPermission(session.user.id, PERMISSIONS.SYSTEM_HEALTH_CHECK))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [jobs, mismatches, payouts, reports, failedNotifications, queue] =
    await Promise.all([
      CronObservabilityService.getJobStatuses(),
      CronObservabilityService.getReconciliationMismatches(30),
      CronObservabilityService.getPayoutsReadyForSettlement(30),
      CronObservabilityService.getRecentReports(15),
      CronObservabilityService.getFailedNotifications(20),
      Promise.resolve(getQueueStats()),
    ])

  const summary = {
    total: jobs.length,
    ok: jobs.filter((j) => j.lastStatus === 'ok').length,
    failed: jobs.filter((j) => j.lastStatus === 'failed').length,
    stale: jobs.filter((j) => j.lastStatus === 'stale').length,
    never: jobs.filter((j) => j.lastStatus === 'never').length,
  }

  return NextResponse.json({
    jobs,
    summary,
    reconciliationMismatches: mismatches,
    payoutsReady: payouts,
    recentReports: reports,
    failedNotifications,
    notificationQueue: queue,
  })
}
