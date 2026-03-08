/**
 * GET /api/cart - Get current cart. POST /api/cart - Add item (Phase 3.1).
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { CartService } from '@/lib/services/cart.service'
import { getCartSessionId, setCartSessionCookie } from '@/lib/cart-session'
import { checkRateLimitUpstash } from '@/lib/utils/rate-limit-upstash'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'

/** Resolve cart userId: only use session user.id if that user exists in DB (avoids FK violation). */
async function resolveCartUserId(userId: string | undefined | null): Promise<string | null> {
  if (!userId) return null
  const user = await prisma.user.findUnique({
    where: { id: userId, deletedAt: null },
    select: { id: true },
  })
  return user?.id ?? null
}

export async function GET(request: NextRequest) {
  let rate = { allowed: true as boolean }
  try {
    rate = await checkRateLimitUpstash(request, 'checkout')
  } catch {
    rate = { allowed: true }
  }
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const session = await auth()
  const sessionId = getCartSessionId(request.headers.get('cookie') ?? null)
  const userId = await resolveCartUserId(session?.user?.id ?? null)

  try {
    const cart = await CartService.getOrCreateCart(userId, sessionId)
    const res = NextResponse.json(cart)
    if (!session?.user?.id && !sessionId && cart.sessionId) {
      res.headers.set('Set-Cookie', setCartSessionCookie(cart.sessionId))
    }
    return res
  } catch (e) {
    logger.error('Cart GET error', { error: e instanceof Error ? e.message : String(e) })
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to get cart' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  let rate = { allowed: true as boolean }
  try {
    rate = await checkRateLimitUpstash(request, 'checkout')
  } catch {
    rate = { allowed: true }
  }
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const session = await auth()
  const sessionId = getCartSessionId(request.headers.get('cookie') ?? null)

  let body: {
    itemType: 'EQUIPMENT' | 'STUDIO' | 'PACKAGE' | 'KIT'
    equipmentId?: string
    studioId?: string
    packageId?: string
    kitId?: string
    startDate?: string
    endDate?: string
    quantity?: number
    dailyRate?: number
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  if (!body.itemType) {
    return NextResponse.json({ error: 'itemType required' }, { status: 400 })
  }

  const userId = await resolveCartUserId(session?.user?.id ?? null)

  try {
    const cart = await CartService.getOrCreateCart(userId, sessionId)

    await CartService.addItem(cart.id, {
      itemType: body.itemType,
      equipmentId: body.equipmentId,
      studioId: body.studioId,
      packageId: body.packageId,
      kitId: body.kitId,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      quantity: body.quantity,
      dailyRate: body.dailyRate,
    })

    const updated = await CartService.getOrCreateCart(userId, cart.sessionId ?? sessionId)
    const res = NextResponse.json(updated)
    if (!session?.user?.id && !sessionId && updated.sessionId) {
      res.headers.set('Set-Cookie', setCartSessionCookie(updated.sessionId))
    }
    return res
  } catch (e) {
    logger.error('Cart POST error', { error: e instanceof Error ? e.message : String(e) })
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to add to cart' },
      { status: 400 }
    )
  }
}
