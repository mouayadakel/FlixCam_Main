/**
 * GET /api/public/recommendations/[equipmentId] - Related equipment (same category).
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { rateLimitByTier } from '@/lib/utils/rate-limit'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ equipmentId: string }> }
) {
  const rate = rateLimitByTier(request, 'public')
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { equipmentId } = await params

  const equipment = await prisma.equipment.findFirst({
    where: { id: equipmentId, deletedAt: null },
    select: { categoryId: true },
  })

  if (!equipment?.categoryId) {
    return NextResponse.json({ data: [] })
  }

  const data = await prisma.equipment.findMany({
    where: {
      deletedAt: null,
      isActive: true,
      categoryId: equipment.categoryId,
      id: { not: equipmentId },
    },
    take: 4,
    select: {
      id: true,
      sku: true,
      model: true,
      dailyPrice: true,
      category: { select: { id: true, name: true, slug: true } },
      brand: { select: { id: true, name: true, slug: true } },
      media: { take: 1, select: { id: true, url: true, type: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const out = data.map((e) => ({
    ...e,
    dailyPrice: e.dailyPrice ? Number(e.dailyPrice) : 0,
  }))

  return NextResponse.json({ data: out })
}
