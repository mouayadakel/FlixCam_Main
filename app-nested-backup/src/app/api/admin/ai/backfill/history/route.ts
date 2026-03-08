/**
 * GET /api/admin/ai/backfill/history?limit=20&offset=0
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasAIPermission } from '@/lib/auth/permissions'
import { aiRateLimitResponse } from '@/lib/utils/rate-limit-upstash'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
})

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!(await hasAIPermission(session.user.id, 'view'))) {
    return NextResponse.json({ error: 'Forbidden - ai.use required' }, { status: 403 })
  }
  const rateLimitRes = await aiRateLimitResponse(request, session.user.id)
  if (rateLimitRes) return rateLimitRes

  try {
    const parsed = querySchema.safeParse(Object.fromEntries(request.nextUrl.searchParams))
    const { limit, offset } = parsed.success ? parsed.data : { limit: 20, offset: 0 }
    const [jobs, total] = await Promise.all([
      prisma.aiJob.findMany({
        orderBy: { triggeredAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.aiJob.count(),
    ])
    return NextResponse.json({
      data: {
        jobs: jobs.map((j) => ({
          id: j.id,
          type: j.type,
          status: j.status,
          triggeredBy: j.triggeredBy,
          triggeredAt: j.triggeredAt,
          totalItems: j.totalItems,
          processed: j.processed,
          succeeded: j.succeeded,
          failed: j.failed,
          skipped: j.skipped,
          costUsd: j.costUsd,
          startedAt: j.startedAt,
          completedAt: j.completedAt,
        })),
        total,
      },
    })
  } catch (error) {
    console.error('Backfill history failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Backfill history failed' },
      { status: 500 }
    )
  }
}
