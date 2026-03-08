/**
 * @file route.ts
 * @description GET list of AI jobs for analytics / job history
 * @module app/api/admin/ai/jobs
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { hasAIPermission } from '@/lib/auth/permissions'
import { aiRateLimitResponse } from '@/lib/utils/rate-limit-upstash'
import { prisma } from '@/lib/db/prisma'
import { AiJobType, JobStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

const jobsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
  page: z.coerce.number().int().min(1).default(1),
  type: z.enum(['FULL_BACKFILL', 'TEXT_BACKFILL', 'PHOTO_BACKFILL', 'SPEC_BACKFILL']).optional(),
  status: z.enum(['PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'PAUSED']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
})

/**
 * GET /api/admin/ai/jobs?limit=20&type=backfill
 */
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

  const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries())
  const parsed = jobsQuerySchema.safeParse(searchParams)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query parameters', details: parsed.error.flatten() },
      { status: 400 }
    )
  }
  const { limit, page, type, status, dateFrom, dateTo } = parsed.data

  try {
    const where: {
      type?: AiJobType
      status?: JobStatus
      triggeredAt?: { gte?: Date; lte?: Date }
    } = {}
    if (type) where.type = type as AiJobType
    if (status) where.status = status as JobStatus
    if (dateFrom || dateTo) {
      where.triggeredAt = {}
      if (dateFrom) {
        const d = new Date(dateFrom)
        if (!Number.isNaN(d.getTime())) where.triggeredAt.gte = d
      }
      if (dateTo) {
        const d = new Date(dateTo)
        if (!Number.isNaN(d.getTime())) where.triggeredAt.lte = d
      }
    }

    const [jobs, totalCount, aggregates, failedCount, completedCount] = await Promise.all([
      prisma.aiJob.findMany({
        where,
        orderBy: { triggeredAt: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.aiJob.count({ where }),
      prisma.aiJob.aggregate({
        where,
        _sum: { costUsd: true, processed: true, succeeded: true, failed: true },
        _avg: { costUsd: true },
      }),
      prisma.aiJob.count({ where: { ...where, status: 'FAILED' as JobStatus } }),
      prisma.aiJob.count({ where: { ...where, status: 'COMPLETED' as JobStatus } }),
    ])

    return NextResponse.json({
      jobs,
      meta: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
        aggregates: {
          totalCost: aggregates._sum.costUsd ?? 0,
          totalProcessed: aggregates._sum.processed ?? 0,
          totalSucceeded: aggregates._sum.succeeded ?? 0,
          totalFailed: failedCount,
          completedCount,
          avgCostPerJob: aggregates._avg.costUsd ?? 0,
        },
      },
    })
  } catch (error) {
    console.error('List AI jobs failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to list jobs' },
      { status: 500 }
    )
  }
}
