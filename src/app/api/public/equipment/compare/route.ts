/**
 * GET /api/public/equipment/compare?ids=id1,id2,id3
 * Returns specs for up to 4 equipment items for side-by-side comparison.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { rateLimitByTier } from '@/lib/utils/rate-limit'

export async function GET(request: NextRequest) {
  const rate = rateLimitByTier(request, 'public')
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const idsParam = request.nextUrl.searchParams.get('ids')
  if (!idsParam) {
    return NextResponse.json(
      { error: 'ids query param required (comma-separated)' },
      { status: 400 }
    )
  }

  const ids = idsParam.split(',').slice(0, 4)
  if (ids.length < 2) {
    return NextResponse.json({ error: 'At least 2 equipment IDs required' }, { status: 400 })
  }

  const items = await prisma.equipment.findMany({
    where: { id: { in: ids }, deletedAt: null, isActive: true },
    select: {
      id: true,
      sku: true,
      model: true,
      dailyPrice: true,
      weeklyPrice: true,
      monthlyPrice: true,
      quantityAvailable: true,
      specifications: true,
      category: { select: { name: true } },
      brand: { select: { name: true } },
      media: { take: 1, select: { url: true } },
    },
  })

  const data = items.map((e) => ({
    id: e.id,
    sku: e.sku,
    model: e.model,
    dailyPrice: e.dailyPrice ? Number(e.dailyPrice) : 0,
    weeklyPrice: e.weeklyPrice ? Number(e.weeklyPrice) : null,
    monthlyPrice: e.monthlyPrice ? Number(e.monthlyPrice) : null,
    quantityAvailable: e.quantityAvailable ?? 0,
    specifications: e.specifications,
    category: e.category?.name ?? null,
    brand: e.brand?.name ?? null,
    image: e.media?.[0]?.url ?? null,
  }))

  return NextResponse.json({ data })
}
