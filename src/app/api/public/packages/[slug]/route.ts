/**
 * GET /api/public/packages/[slug] - Single package/kit by slug (no auth).
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { rateLimitByTier } from '@/lib/utils/rate-limit'
import { cacheGet, cacheSet } from '@/lib/cache'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const rate = rateLimitByTier(request, 'public')
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { slug } = await params
  const cached = await cacheGet<unknown>('equipmentDetail', `kit:${slug}`)
  if (cached) return NextResponse.json(cached)

  const kit = await prisma.kit.findFirst({
    where: { slug, deletedAt: null, isActive: true },
    include: {
      items: {
        include: {
          equipment: {
            select: {
              id: true,
              sku: true,
              model: true,
              dailyPrice: true,
              media: { take: 1, select: { id: true, url: true, type: true } },
            },
          },
        },
      },
    },
  })

  if (!kit) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const items = kit.items.map((i) => ({
    equipmentId: i.equipmentId,
    quantity: i.quantity,
    equipment: {
      ...i.equipment,
      dailyPrice: i.equipment.dailyPrice ? Number(i.equipment.dailyPrice) : 0,
    },
  }))

  const subtotal = items.reduce(
    (sum, i) => sum + i.equipment.dailyPrice * i.quantity,
    0
  )
  const discountPercent = kit.discountPercent ? Number(kit.discountPercent) : 0
  const total = discountPercent > 0 ? subtotal * (1 - discountPercent / 100) : subtotal

  const out = {
    id: kit.id,
    name: kit.name,
    slug: kit.slug,
    description: kit.description ?? null,
    discountPercent,
    items,
    subtotal,
    total,
  }
  await cacheSet('equipmentDetail', `kit:${slug}`, out)
  return NextResponse.json(out)
}
