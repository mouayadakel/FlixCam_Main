/**
 * GET /api/public/shoot-types/[slug]/recommendations
 * Params: ?budgetTier=PROFESSIONAL&categoryId=xxx
 * Returns recommended equipment for shoot type + budget tier + category.
 */

import { NextRequest, NextResponse } from 'next/server'
import { rateLimitByTier } from '@/lib/utils/rate-limit'
import { ShootTypeService } from '@/lib/services/shoot-type.service'
import type { BudgetTier } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const rate = rateLimitByTier(request, 'public')
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { slug } = await params
  const searchParams = request.nextUrl.searchParams
  const budgetTier = searchParams.get('budgetTier') as BudgetTier | null
  const categoryId = searchParams.get('categoryId') ?? undefined

  const shootType = await ShootTypeService.getBySlug(slug)
  if (!shootType) {
    return NextResponse.json({ error: 'Shoot type not found' }, { status: 404 })
  }

  if (!categoryId) {
    return NextResponse.json(
      { error: 'categoryId is required' },
      { status: 400 }
    )
  }

  const recommendations = await ShootTypeService.getRecommendationsForCategory(
    shootType.id,
    categoryId,
    budgetTier ?? undefined
  )

  return NextResponse.json({
    data: recommendations.map((r) => ({
      equipmentId: r.equipmentId,
      budgetTier: r.budgetTier,
      isPreSelected: r.isAutoSelect,
      defaultQty: r.defaultQuantity,
      reason: r.reason,
      reasonAr: r.reasonAr,
      sortOrder: r.sortOrder,
      equipment: {
        id: r.equipment.id,
        sku: r.equipment.sku,
        model: r.equipment.model,
        dailyPrice: typeof r.equipment.dailyPrice === 'object' && r.equipment.dailyPrice != null && 'toNumber' in r.equipment.dailyPrice
          ? (r.equipment.dailyPrice as { toNumber: () => number }).toNumber()
          : Number(r.equipment.dailyPrice),
        categoryId: r.equipment.categoryId,
        category: r.equipment.category,
        brand: r.equipment.brand,
        media: r.equipment.media,
      },
    })),
  })
}
