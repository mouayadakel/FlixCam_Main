/**
 * GET /api/admin/ai/quality/products?sort=score&order=asc&limit=20&offset=0&gap=photos
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasAIPermission } from '@/lib/auth/permissions'
import { aiRateLimitResponse } from '@/lib/utils/rate-limit-upstash'
import { getCachedScan } from '@/lib/services/quality-scorer.service'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const querySchema = z.object({
  sort: z.enum(['score', 'name', 'revenue']).optional().default('score'),
  order: z.enum(['asc', 'desc']).optional().default('asc'),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  offset: z.coerce.number().int().min(0).optional().default(0),
  gap: z.enum(['description', 'seo', 'photos', 'translations', 'specs']).optional(),
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
    const { sort, order, limit, offset, gap } = parsed.success ? parsed.data : querySchema.parse({})
    const scan = await getCachedScan()
    let list = scan.products.map((p) => {
      const priceDaily = (p as { priceDaily?: number }).priceDaily ?? 0
      const revenueWeight = priceDaily
      const priorityScore = (100 - p.contentScore) * Math.max(0, priceDaily) // higher gap + higher revenue = higher priority
      return {
        id: p.id,
        name: p.name,
        score: p.contentScore,
        gap: p.gaps.join(','),
        gaps: p.gaps,
        revenueWeight,
        priorityScore,
      }
    })
    if (gap) {
      list = list.filter((p) => p.gaps.includes(gap))
    }
    const total = list.length
    const sorted =
      sort === 'name'
        ? [...list].sort((a, b) =>
            order === 'asc' ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name)
          )
        : sort === 'revenue'
          ? [...list].sort((a, b) =>
              order === 'asc'
                ? a.revenueWeight - b.revenueWeight
                : b.revenueWeight - a.revenueWeight
            )
          : [...list].sort((a, b) => (order === 'asc' ? a.score - b.score : b.score - a.score))
    const products = sorted
      .slice(offset, offset + limit)
      .map(({ gaps, revenueWeight, priorityScore, ...rest }) => ({
        ...rest,
        missingFields: gaps,
        revenueWeight,
        priorityScore,
      }))
    return NextResponse.json({
      data: { products, total },
    })
  } catch (error) {
    console.error('Quality products failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Quality products failed' },
      { status: 500 }
    )
  }
}
