/**
 * @file route.ts
 * @description GET estimate of how many products would be included in a fill-all job
 * @module app/api/admin/ai/backfill/estimate
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasAIPermission } from '@/lib/auth/permissions'
import { aiRateLimitResponse } from '@/lib/utils/rate-limit-upstash'
import { getProductIdsWithGaps } from '@/lib/services/content-health.service'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const querySchema = z.object({
  revenueWeighted: z
    .string()
    .optional()
    .transform((v) => v === 'true' || v === '1'),
  minQualityScore: z.coerce.number().int().min(0).max(100).optional(),
})

/**
 * GET /api/admin/ai/backfill/estimate?revenueWeighted=false&minQualityScore=0
 * Returns { count } for use in Fill dialog cost estimate.
 */
export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!(await hasAIPermission(session.user.id, 'view'))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  const rateLimitRes = await aiRateLimitResponse(request, session.user.id)
  if (rateLimitRes) return rateLimitRes

  const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries())
  const parsed = querySchema.safeParse(searchParams)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid query', details: parsed.error.flatten() },
      { status: 400 }
    )
  }

  try {
    const ids = await getProductIdsWithGaps({
      revenueWeighted: parsed.data.revenueWeighted ?? false,
      minQualityScore: parsed.data.minQualityScore,
    })
    return NextResponse.json({ count: ids.length })
  } catch (error) {
    console.error('Backfill estimate failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Estimate failed' },
      { status: 500 }
    )
  }
}
