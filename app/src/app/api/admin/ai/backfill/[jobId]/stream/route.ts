/**
 * @file route.ts
 * @description SSE stream for backfill job progress (replaces polling)
 * @module app/api/admin/ai/backfill/[jobId]/stream
 */

import { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'
import { hasAIPermission } from '@/lib/auth/permissions'
import { aiRateLimitResponse } from '@/lib/utils/rate-limit-upstash'
import { prisma } from '@/lib/db/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, context: { params: Promise<{ jobId: string }> }) {
  const session = await auth()
  if (!session?.user) {
    return new Response('Unauthorized', { status: 401 })
  }
  if (!(await hasAIPermission(session.user.id, 'view'))) {
    return new Response('Forbidden', { status: 403 })
  }
  const rateLimitRes = await aiRateLimitResponse(req, session.user.id)
  if (rateLimitRes) return rateLimitRes

  const { jobId } = await context.params

  const stream = new ReadableStream({
    async start(controller) {
      const encode = (data: object) => new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`)

      const poll = async () => {
        try {
          const job = await prisma.aiJob.findUnique({
            where: { id: jobId },
            select: {
              id: true,
              status: true,
              processed: true,
              totalItems: true,
              succeeded: true,
              failed: true,
              costUsd: true,
            },
          })

          if (!job) {
            controller.enqueue(encode({ error: 'Job not found' }))
            controller.close()
            return
          }

          const total = job.totalItems ?? 0
          const progress = total > 0 ? Math.round((job.processed / total) * 100) : 0

          controller.enqueue(
            encode({
              status: job.status,
              progress,
              processed: job.processed,
              total,
              succeeded: job.succeeded,
              failed: job.failed,
              costUsd: job.costUsd,
            })
          )

          if (job.status === 'COMPLETED' || job.status === 'FAILED') {
            controller.close()
            return
          }

          if (!req.signal.aborted) {
            setTimeout(poll, 1500)
          } else {
            controller.close()
          }
        } catch (err) {
          console.error('[SSE] stream error:', err)
          controller.close()
        }
      }

      req.signal.addEventListener('abort', () => controller.close())
      await poll()
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
