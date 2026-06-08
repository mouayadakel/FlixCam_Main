/**
 * POST /api/admin/cron/trigger/:job — Manually run a cron job (admin).
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { CRON_JOB_REGISTRY } from '@/lib/services/cron'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

type RouteContext = { params: Promise<{ job: string }> }

export async function POST(_request: Request, context: RouteContext) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!(await hasPermission(session.user.id, PERMISSIONS.SYSTEM_HEALTH_CHECK))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { job } = await context.params
  const handler = CRON_JOB_REGISTRY[job]
  if (!handler) {
    return NextResponse.json({ error: 'Unknown job', job }, { status: 404 })
  }

  try {
    const result = await handler()
    return NextResponse.json(result)
  } catch (error) {
    logger.error('Admin cron trigger failed', {
      job,
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      { ok: false, job, error: error instanceof Error ? error.message : 'Failed' },
      { status: 500 }
    )
  }
}
