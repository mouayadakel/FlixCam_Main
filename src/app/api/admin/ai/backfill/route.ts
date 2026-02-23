/**
 * @file route.ts
 * @description POST trigger batch backfill, GET job status
 * @module app/api/admin/ai/backfill
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasAIPermission } from '@/lib/auth/permissions'
import { aiRateLimitResponse } from '@/lib/utils/rate-limit-upstash'
import { prisma } from '@/lib/db/prisma'
import { AiJobType, JobStatus } from '@prisma/client'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const postBodySchema = z.object({
  productIds: z.array(z.string().cuid()).optional(),
  fillAll: z.boolean().optional().default(false),
  revenueWeighted: z.boolean().optional().default(false),
  types: z.array(z.enum(['text', 'photo', 'spec'])).optional(),
  minQualityScore: z.number().int().min(0).max(100).optional(),
})

function isQueueConnectionError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err)
  return (
    /redis|ECONNREFUSED|connection refused|queue/i.test(msg) ||
    (err as NodeJS.ErrnoException)?.code === 'ECONNREFUSED'
  )
}

/**
 * POST /api/admin/ai/backfill
 * Body: { productIds?: string[], fillAll?: boolean }
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
    const body = await request.json().catch(() => ({}))
    const parsed = postBodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid body', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const { productIds, fillAll, revenueWeighted, types = [], minQualityScore } = parsed.data

    let ids: string[]
    if (fillAll) {
      const { getProductIdsWithGaps } = await import('@/lib/services/content-health.service')
      ids = await getProductIdsWithGaps({ revenueWeighted, minQualityScore })
    } else if (productIds?.length) {
      ids = productIds
    } else {
      return NextResponse.json({ error: 'Provide productIds or fillAll: true' }, { status: 400 })
    }

    if (ids.length === 0) {
      return NextResponse.json({
        jobId: '',
        queued: 0,
        estimatedMinutes: 0,
        message: 'لا توجد منتجات تحتاج ملء',
      })
    }

    // Atomic guard: check for active job AND create new job in one transaction
    // Auto-cleanup stale jobs: PENDING >30min or RUNNING >60min are marked FAILED
    const STALE_PENDING_MS = 30 * 60 * 1000
    const STALE_RUNNING_MS = 60 * 60 * 1000
    const txResult = await prisma.$transaction(async (tx) => {
      const activeJob = await tx.aiJob.findFirst({
        where: { status: { in: [JobStatus.RUNNING, JobStatus.PENDING] } },
        select: { id: true, status: true, triggeredAt: true, startedAt: true },
      })
      if (activeJob) {
        const now = Date.now()
        const triggeredAge = now - new Date(activeJob.triggeredAt).getTime()
        const startedAge = activeJob.startedAt
          ? now - new Date(activeJob.startedAt).getTime()
          : Infinity
        const isStale =
          (activeJob.status === JobStatus.PENDING && triggeredAge > STALE_PENDING_MS) ||
          (activeJob.status === JobStatus.RUNNING && startedAge > STALE_RUNNING_MS)
        if (isStale) {
          await tx.aiJob.update({
            where: { id: activeJob.id },
            data: {
              status: JobStatus.FAILED,
              completedAt: new Date(),
              errorLog: [
                {
                  error: 'Auto-cleaned: stale job exceeded timeout',
                  timestamp: new Date().toISOString(),
                },
              ] as object,
            },
          })
          // Stale job cleared — proceed to create new job below
        } else {
          return { conflict: true as const, activeJobId: activeJob.id }
        }
      }

      const newJob = await tx.aiJob.create({
        data: {
          type: AiJobType.FULL_BACKFILL,
          status: JobStatus.PENDING,
          triggeredBy: 'manual',
          totalItems: ids.length,
          metadata: { triggeredBy: session.user!.id },
        },
      })

      await tx.aiJobItem.createMany({
        data: ids.map((productId) => ({
          jobId: newJob.id,
          productId,
          itemType: 'text',
          status: 'pending',
        })),
      })

      return { conflict: false as const, jobId: newJob.id }
    })

    if (txResult.conflict) {
      return NextResponse.json(
        {
          error: 'مهمة ذكاء اصطناعي قيد التشغيل بالفعل. انتظر حتى تنتهي.',
          code: 'JOB_ALREADY_RUNNING',
          activeJobId: txResult.activeJobId,
        },
        { status: 409 }
      )
    }

    // Enqueue BullMQ job outside transaction (non-blocking)
    const { getBackfillQueue } = await import('@/lib/queue/backfill.queue')
    await getBackfillQueue().add(
      'backfill-products',
      {
        aiJobId: txResult.jobId,
        productIds: ids,
        types: types.length > 0 ? types : ['text'],
        createdBy: session.user.id,
      },
      { jobId: txResult.jobId, priority: 1 }
    )

    const { logAiAudit } = await import('@/lib/services/ai-audit.service')
    await logAiAudit({
      userId: session.user.id,
      action: 'backfill.trigger',
      resourceType: 'AiJob',
      resourceId: txResult.jobId,
      metadata: { queued: ids.length, fillAll },
    })

    const estimatedMinutes = Math.max(1, Math.ceil(ids.length / 5))
    return NextResponse.json({
      jobId: txResult.jobId,
      queued: ids.length,
      estimatedMinutes,
    })
  } catch (error) {
    console.error('Backfill trigger failed:', error)
    const message = isQueueConnectionError(error)
      ? 'قائمة المعالجة غير متاحة. تأكد من تشغيل Redis.'
      : error instanceof Error
        ? error.message
        : 'فشل تشغيل الملء'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/**
 * GET /api/admin/ai/backfill?jobId=xxx
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

  const jobId = request.nextUrl.searchParams.get('jobId')
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
    // Normalize status for UI (content-health tab expects 'done' | 'failed' | 'running')
    const statusRaw = job.status
    const status =
      statusRaw === JobStatus.COMPLETED
        ? 'done'
        : statusRaw === JobStatus.FAILED
          ? 'failed'
          : statusRaw === JobStatus.RUNNING || statusRaw === JobStatus.PENDING
            ? 'running'
            : String(statusRaw).toLowerCase()

    const MAX_ERROR_MESSAGE_LENGTH = 120
    const sanitizeError = (err: unknown): string => {
      const s = typeof err === 'string' ? err : err instanceof Error ? err.message : String(err)
      const noStack = s.split(/\n\s*at\s/)[0].trim()
      return noStack.length > MAX_ERROR_MESSAGE_LENGTH
        ? noStack.slice(0, MAX_ERROR_MESSAGE_LENGTH) + '…'
        : noStack
    }
    const rawLog =
      (job.errorLog as Array<{ productId?: string; error?: unknown; timestamp?: string }>) ?? []
    const errorLog = rawLog.map((entry) => ({
      ...entry,
      error: entry.error != null ? sanitizeError(entry.error) : undefined,
    }))

    return NextResponse.json({
      status,
      progress,
      processed: job.processed,
      total,
      succeeded: job.succeeded,
      failed: job.failed,
      skipped: job.skipped,
      completedAt: job.completedAt,
      errorLog,
    })
  } catch (error) {
    console.error('Backfill status failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Status failed' },
      { status: 500 }
    )
  }
}
