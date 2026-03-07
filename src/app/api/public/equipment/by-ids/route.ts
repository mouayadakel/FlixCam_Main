/**
 * GET /api/public/equipment/by-ids?ids=id1,id2,id3
 * Returns equipment items by IDs (for blog related equipment, etc.).
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { rateLimitByTier } from '@/lib/utils/rate-limit'

const MAX_IDS = 12

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

  const ids = idsParam
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, MAX_IDS)

  if (ids.length === 0) {
    return NextResponse.json({ data: [] })
  }

  const items = await prisma.equipment.findMany({
    where: { id: { in: ids }, deletedAt: null, isActive: true },
    select: {
      id: true,
      sku: true,
      model: true,
      slug: true,
      dailyPrice: true,
      weeklyPrice: true,
      monthlyPrice: true,
      quantityAvailable: true,
      category: { select: { id: true, name: true, slug: true } },
      brand: { select: { id: true, name: true, slug: true } },
      media: { take: 1, select: { id: true, url: true, type: true } },
    },
  })

  const data = items.map((e) => ({
    id: e.id,
    sku: e.sku,
    model: e.model,
    slug: e.slug,
    dailyPrice: e.dailyPrice ? Number(e.dailyPrice) : 0,
    weeklyPrice: e.weeklyPrice ? Number(e.weeklyPrice) : null,
    monthlyPrice: e.monthlyPrice ? Number(e.monthlyPrice) : null,
    quantityAvailable: e.quantityAvailable ?? 0,
    category: e.category,
    brand: e.brand,
    media: e.media,
    imageUrl: e.media?.[0]?.url ?? null,
  }))

  return NextResponse.json({ data })
}
