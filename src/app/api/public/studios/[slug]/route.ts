/**
 * GET /api/public/studios/[slug] - Single studio by slug (no auth). Cached.
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
  const cached = await cacheGet<unknown>('equipmentDetail', `studio:${slug}`)
  if (cached) return NextResponse.json(cached)

  const studio = await prisma.studio.findFirst({
    where: { slug, deletedAt: null, isActive: true },
    include: {
      media: { select: { id: true, url: true, type: true } },
      addOns: { where: { isActive: true }, select: { id: true, name: true, price: true } },
    },
  })

  if (!studio) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const out = {
    ...studio,
    hourlyRate: studio.hourlyRate ? Number(studio.hourlyRate) : 0,
    addOns: studio.addOns?.map((a) => ({ ...a, price: a.price ? Number(a.price) : 0 })) ?? [],
  }
  await cacheSet('equipmentDetail', `studio:${slug}`, out)
  return NextResponse.json(out)
}
