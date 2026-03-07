/**
 * POST /api/cart/add-studio - Add studio booking from URL params (slug, date, start, duration, package, addOn)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { CartService } from '@/lib/services/cart.service'
import { getCartSessionId, setCartSessionCookie } from '@/lib/cart-session'
import { checkRateLimitUpstash } from '@/lib/utils/rate-limit-upstash'
import { logger } from '@/lib/logger'
import { z } from 'zod'

const bodySchema = z.object({
  studio: z.string().min(1),
  date: z.string(),
  start: z.string(),
  duration: z.number().int().min(1).max(24),
  package: z.string().optional(),
  addOn: z.array(z.string()).optional(),
})

export async function POST(request: NextRequest) {
  const rate = await checkRateLimitUpstash(request, 'checkout')
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const session = await auth()
  const sessionId = getCartSessionId(request.headers.get('cookie') ?? null)

  let body: z.infer<typeof bodySchema>
  try {
    body = bodySchema.parse(await request.json())
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const studio = await prisma.studio.findFirst({
    where: { slug: body.studio, deletedAt: null, isActive: true },
    include: {
      packages: { where: { deletedAt: null, isActive: true } },
      addOns: { where: { deletedAt: null, isActive: true } },
    },
  })
  if (!studio) {
    return NextResponse.json({ error: 'Studio not found' }, { status: 404 })
  }

  const startDate = body.start.includes('T')
    ? new Date(body.start)
    : new Date(`${body.date}T${body.start}`)
  if (Number.isNaN(startDate.getTime())) {
    return NextResponse.json({ error: 'Invalid start time' }, { status: 400 })
  }
  const endDate = new Date(startDate.getTime() + body.duration * 60 * 60 * 1000)

  let total = 0
  const selectedPkg = body.package ? studio.packages.find((p) => p.id === body.package) : null
  if (selectedPkg) {
    total = Number(selectedPkg.price)
  } else {
    total = Number(studio.hourlyRate) * body.duration
  }
  const addOnIds = body.addOn ?? []
  for (const id of addOnIds) {
    const addOn = studio.addOns.find((a) => a.id === id)
    if (addOn) total += Number(addOn.price)
  }

  try {
    const cart = await CartService.getOrCreateCart(session?.user?.id ?? null, sessionId)
    await CartService.addItem(cart.id, {
      itemType: 'STUDIO',
      studioId: studio.id,
      startDate,
      endDate,
      quantity: 1,
      dailyRate: total,
    })
    const updated = await CartService.getOrCreateCart(
      session?.user?.id ?? null,
      cart.sessionId ?? sessionId
    )
    const res = NextResponse.json(updated)
    if (!session?.user?.id && !sessionId && updated.sessionId) {
      res.headers.set('Set-Cookie', setCartSessionCookie(updated.sessionId))
    }
    return res
  } catch (e) {
    logger.error('Cart add-studio error', { error: e instanceof Error ? e.message : String(e) })
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to add to cart' },
      { status: 400 }
    )
  }
}
