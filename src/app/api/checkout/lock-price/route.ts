/**
 * POST /api/checkout/lock-price – Lock cart price for 15 min (Phase 3.4).
 * Returns lockedUntil; actual price lock is enforced when creating booking/payment in Phase 3.5.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { CartService } from '@/lib/services/cart.service'
import { getCartSessionId } from '@/lib/cart-session'
import { checkRateLimitUpstash } from '@/lib/utils/rate-limit-upstash'

const LOCK_TTL_MINUTES = 15

export async function POST(request: NextRequest) {
  const rate = await checkRateLimitUpstash(request, 'checkout')
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const sessionId = getCartSessionId(request.headers.get('cookie') ?? null)
  const cart = await CartService.getOrCreateCart(session.user.id, sessionId)
  if (cart.items.length === 0) {
    return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
  }

  const lockedUntil = new Date()
  lockedUntil.setMinutes(lockedUntil.getMinutes() + LOCK_TTL_MINUTES)

  return NextResponse.json({
    locked: true,
    lockedAt: new Date().toISOString(),
    lockedUntil: lockedUntil.toISOString(),
    cartId: cart.id,
  })
}
