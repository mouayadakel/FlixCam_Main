/**
 * @file route.ts
 * @description GET current active backfill job (PENDING or RUNNING) for UI sync
 * @module app/api/admin/ai/backfill/active
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasAIPermission } from '@/lib/auth/permissions'
import { aiRateLimitResponse } from '@/lib/utils/rate-limit-upstash'
import { prisma } from '@/lib/db/prisma'
import { JobStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/ai/backfill/active
 * Returns the current active backfill job (PENDING or RUNNING), if any.
 */
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!(await hasAIPermission(session.user.id, 'view'))) {
    return NextResponse.json({ error: 'Forbidden - ai.view required' }, { status: 403 })
  }
  const rateLimitRes = await aiRateLimitResponse(request, session.user.id)
  if (rateLimitRes) return rateLimitRes

  try {
    const active = await prisma.aiJob.findFirst({
      where: { status: { in: [JobStatus.RUNNING, JobStatus.PENDING] } },
      orderBy: { triggeredAt: 'desc' },
      select: {
        id: true,
        status: true,
        totalItems: true,
        processed: true,
        succeeded: true,
        failed: true,
        triggeredAt: true,
        startedAt: true,
      },
    })
    if (!active) {
      return NextResponse.json({ activeJob: null })
    }
    const total = active.totalItems ?? 0
    const progress = total > 0 ? Math.round((active.processed / total) * 100) : 0
    return NextResponse.json({
      activeJob: {
        id: active.id,
        status: active.status,
        progress,
        processed: active.processed,
        total: total,
        succeeded: active.succeeded,
        failed: active.failed,
        triggeredAt: active.triggeredAt,
        startedAt: active.startedAt,
      },
    })
  } catch (error) {
    console.error('Backfill active check failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check active job' },
      { status: 500 }
    )
  }
}
