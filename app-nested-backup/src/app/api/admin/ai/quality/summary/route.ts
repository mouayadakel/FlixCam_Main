/**
 * GET /api/admin/ai/quality/summary
 * Returns totalProducts, avgQualityScore, distribution, gaps, activeJobs, lastNightlyRun.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasAIPermission } from '@/lib/auth/permissions'
import { aiRateLimitResponse } from '@/lib/utils/rate-limit-upstash'
import { getCachedScan } from '@/lib/services/quality-scorer.service'
import { prisma } from '@/lib/db/prisma'
import { JobStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

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
    const scan = await getCachedScan()
    const activeJobs = await prisma.aiJob.findMany({
      where: { status: JobStatus.RUNNING },
      orderBy: { triggeredAt: 'desc' },
      take: 5,
    })
    const lastNightly = await prisma.aiJob.findFirst({
      where: { triggeredBy: 'scheduled' },
      orderBy: { triggeredAt: 'desc' },
    })
    const distribution = { excellent: 0, good: 0, fair: 0, poor: 0 }
    for (const p of scan.products) {
      if (p.contentScore >= 80) distribution.excellent++
      else if (p.contentScore >= 60) distribution.good++
      else if (p.contentScore >= 40) distribution.fair++
      else distribution.poor++
    }
    return NextResponse.json({
      data: {
        totalProducts: scan.totalProducts,
        avgQualityScore: scan.catalogQualityScore,
        distribution,
        gaps: scan.byGapType,
        activeJobs: activeJobs.map((j) => ({
          id: j.id,
          type: j.type,
          status: j.status,
          totalItems: j.totalItems,
          processed: j.processed,
          succeeded: j.succeeded,
          failed: j.failed,
          costUsd: j.costUsd,
          triggeredAt: j.triggeredAt,
        })),
        lastNightlyRun: lastNightly
          ? {
              date: lastNightly.triggeredAt,
              jobId: lastNightly.id,
              processed: lastNightly.processed,
              succeeded: lastNightly.succeeded,
              failed: lastNightly.failed,
            }
          : null,
        scannedAt: scan.scannedAt,
        cached: scan.cached,
      },
    })
  } catch (error) {
    console.error('Quality summary failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Quality summary failed' },
      { status: 500 }
    )
  }
}
