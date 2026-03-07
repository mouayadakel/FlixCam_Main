/**
 * GET /api/public/equipment/featured - Featured equipment (no auth).
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { rateLimitByTier } from '@/lib/utils/rate-limit'
import { cacheGet, cacheSet } from '@/lib/cache'

export async function GET(request: NextRequest) {
  const rate = rateLimitByTier(request, 'public')
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const cached = await cacheGet<unknown[]>('equipmentList', 'featured')
  if (cached) return NextResponse.json({ data: cached })

  const data = await prisma.equipment.findMany({
    where: { deletedAt: null, isActive: true, featured: true },
    take: 8,
    select: {
      id: true,
      sku: true,
      model: true,
      dailyPrice: true,
      weeklyPrice: true,
      monthlyPrice: true,
      category: { select: { id: true, name: true, slug: true } },
      brand: { select: { id: true, name: true, slug: true } },
      media: { take: 1, select: { id: true, url: true, type: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  const out = data.map((e) => ({
    ...e,
    dailyPrice: e.dailyPrice ? Number(e.dailyPrice) : 0,
    weeklyPrice: e.weeklyPrice ? Number(e.weeklyPrice) : null,
    monthlyPrice: e.monthlyPrice ? Number(e.monthlyPrice) : null,
  }))
  await cacheSet('equipmentList', 'featured', out)
  return NextResponse.json({ data: out })
}
