/**
 * GET /api/admin/ai/backfill/:jobId/progress
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasAIPermission } from '@/lib/auth/permissions'
import { aiRateLimitResponse } from '@/lib/utils/rate-limit-upstash'
import { prisma } from '@/lib/db/prisma'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!(await hasAIPermission(session.user.id, 'view'))) {
    return NextResponse.json({ error: 'Forbidden - ai.use required' }, { status: 403 })
  }
  const rateLimitRes = await aiRateLimitResponse(_request, session.user.id)
  if (rateLimitRes) return rateLimitRes

  const { jobId } = await params
  if (!jobId) {
    return NextResponse.json({ error: 'jobId required' }, { status: 400 })
  }

  try {
    const job = await prisma.aiJob.findUnique({
      where: { id: jobId },
    })
    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 })
    }
    const total = job.totalItems ?? 0
    const progress = total > 0 ? Math.round((job.processed / total) * 100) : 0
    return NextResponse.json({
      data: {
        jobId: job.id,
        type: job.type,
        status: job.status,
        progress,
        processed: job.processed,
        total,
        succeeded: job.succeeded,
        failed: job.failed,
        skipped: job.skipped,
        costUsd: job.costUsd,
        triggeredAt: job.triggeredAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
        errorLog: job.errorLog,
      },
    })
  } catch (error) {
    console.error('Backfill progress failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Backfill progress failed' },
      { status: 500 }
    )
  }
}
