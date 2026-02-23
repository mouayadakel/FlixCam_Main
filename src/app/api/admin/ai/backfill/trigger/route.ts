/**
 * POST /api/admin/ai/backfill/trigger
 * Body: BackfillOptions (types, forceReprocess?, productIds?, minQualityScore?, maxProducts?, dryRun?, trigger)
 * Returns: { jobId, report }
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasAIPermission } from '@/lib/auth/permissions'
import { aiRateLimitResponse } from '@/lib/utils/rate-limit-upstash'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const bodySchema = z.object({
  types: z
    .array(z.enum(['text', 'photo', 'spec']))
    .min(1)
    .default(['text']),
  forceReprocess: z.boolean().optional(),
  productIds: z.array(z.string().cuid()).optional(),
  minQualityScore: z.number().int().min(0).max(100).optional(),
  maxProducts: z.number().int().min(1).optional(),
  dryRun: z.boolean().optional().default(false),
  trigger: z.enum(['manual', 'scheduled', 'event', 'import']).default('manual'),
  previewMode: z.boolean().optional().default(false),
})

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!(await hasAIPermission(session.user.id, 'run'))) {
    return NextResponse.json({ error: 'Forbidden - ai.use required' }, { status: 403 })
  }
  const rateLimitRes = await aiRateLimitResponse(request, session.user.id)
  if (rateLimitRes) return rateLimitRes

  try {
    const body = await request.json().catch(() => ({}))
    const parsed = bodySchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid body', details: parsed.error.flatten() },
        { status: 400 }
      )
    }
    const { scanAndQueue } = await import('@/lib/services/catalog-scanner.service')
    const { jobId, report } = await scanAndQueue({
      ...parsed.data,
      triggeredBy: session.user.id,
    })
    const { logAiAudit } = await import('@/lib/services/ai-audit.service')
    await logAiAudit({
      userId: session.user.id,
      action: 'backfill.trigger',
      resourceType: 'AiJob',
      resourceId: jobId ?? undefined,
      metadata: {
        totalProducts: report.totalProducts,
        productsQueued: report.products?.length ?? 0,
      },
    })
    return NextResponse.json({
      data: {
        jobId,
        totalProducts: report.totalProducts,
        catalogQualityScore: report.catalogQualityScore,
        byGapType: report.byGapType,
        productsQueued: jobId ? report.products.length : 0,
      },
    })
  } catch (error) {
    console.error('Backfill trigger failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Backfill trigger failed' },
      { status: 500 }
    )
  }
}
