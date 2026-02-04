/**
 * POST /api/cart/sync - Merge session cart into user cart after login (Phase 3.1).
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { CartService } from '@/lib/services/cart.service'
import { getCartSessionId } from '@/lib/cart-session'
import { checkRateLimitUpstash } from '@/lib/utils/rate-limit-upstash'

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
  if (!sessionId) {
    const cart = await CartService.getOrCreateCart(session.user.id, null)
    return NextResponse.json(cart)
  }

  try {
    const sessionCart = await CartService.getOrCreateCart(null, sessionId)
    if (sessionCart.userId) {
      return NextResponse.json(sessionCart)
    }
    const updated = await CartService.syncToUser(sessionCart.id, session.user.id)
    return NextResponse.json(updated)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to sync cart' },
      { status: 400 }
    )
  }
}
