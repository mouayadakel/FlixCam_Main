/**
 * @file route.ts
 * @description POST cancel current active backfill job so a new one can start
 * @module app/api/admin/ai/backfill/cancel
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasAIPermission } from '@/lib/auth/permissions'
import { aiRateLimitResponse } from '@/lib/utils/rate-limit-upstash'
import { prisma } from '@/lib/db/prisma'
import { JobStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/ai/backfill/cancel
 * Marks the current PENDING or RUNNING backfill job as CANCELLED so a new job can be started.
 */
export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!(await hasAIPermission(session.user.id, 'run'))) {
    return NextResponse.json({ error: 'Forbidden - ai.run required' }, { status: 403 })
  }
  const rateLimitRes = await aiRateLimitResponse(request, session.user.id)
  if (rateLimitRes) return rateLimitRes

  try {
    const active = await prisma.aiJob.findFirst({
      where: { status: { in: [JobStatus.RUNNING, JobStatus.PENDING] } },
      orderBy: { triggeredAt: 'desc' },
      select: { id: true },
    })
    if (!active) {
      return NextResponse.json({ cancelled: false, message: 'لا توجد مهمة قيد التشغيل' })
    }
    await prisma.aiJob.update({
      where: { id: active.id },
      data: {
        status: JobStatus.CANCELLED,
        completedAt: new Date(),
        errorLog: [
          {
            error: 'Cancelled by user to start a new task',
            timestamp: new Date().toISOString(),
          },
        ] as object,
      },
    })
    return NextResponse.json({ cancelled: true, jobId: active.id })
  } catch (error) {
    console.error('Backfill cancel failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to cancel' },
      { status: 500 }
    )
  }
}
