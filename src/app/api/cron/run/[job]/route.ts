/**
 * Unified cron dispatcher — GET /api/cron/run/:job
 * Protected by CRON_SECRET (Bearer or x-cron-secret header).
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/utils/cron-auth'
import { logger } from '@/lib/logger'
import { CRON_JOB_REGISTRY } from '@/lib/services/cron'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

type RouteContext = { params: Promise<{ job: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { job } = await context.params
  const handler = CRON_JOB_REGISTRY[job]

  if (!handler) {
    return NextResponse.json(
      { error: 'Unknown cron job', job, available: Object.keys(CRON_JOB_REGISTRY) },
      { status: 404 }
    )
  }

  try {
    const result = await handler()
    return NextResponse.json(result)
  } catch (error) {
    logger.error(`[Cron] ${job} failed`, {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      {
        ok: false,
        job,
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    )
  }
}
