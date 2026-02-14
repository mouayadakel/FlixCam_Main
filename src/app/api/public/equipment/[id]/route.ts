/**
 * GET /api/public/equipment/[id] - Single equipment (no auth). Cached.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { rateLimitByTier } from '@/lib/utils/rate-limit'
import { cacheGet, cacheSet, cacheKeys } from '@/lib/cache'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rate = rateLimitByTier(request, 'public')
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { id } = await params
  const cached = await cacheGet<unknown>('equipmentDetail', id)
  if (cached) return NextResponse.json(cached)

  const equipment = await prisma.equipment.findFirst({
    where: { id, deletedAt: null, isActive: true },
    include: {
      category: { select: { id: true, name: true, slug: true } },
      brand: { select: { id: true, name: true, slug: true } },
      media: { select: { id: true, url: true, type: true } },
      vendor: {
        select: { id: true, companyName: true, logo: true, isNameVisible: true },
      },
    },
  })

  if (!equipment) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const v = equipment.vendor as { companyName: string; logo: string | null; isNameVisible: boolean } | null
  const vendor = v?.isNameVisible ? { companyName: v.companyName, logo: v.logo } : null

  const out = {
    ...equipment,
    vendor,
    dailyPrice: equipment.dailyPrice ? Number(equipment.dailyPrice) : 0,
    weeklyPrice: equipment.weeklyPrice ? Number(equipment.weeklyPrice) : null,
    monthlyPrice: equipment.monthlyPrice ? Number(equipment.monthlyPrice) : null,
  }
  await cacheSet('equipmentDetail', id, out)
  return NextResponse.json(out)
}
