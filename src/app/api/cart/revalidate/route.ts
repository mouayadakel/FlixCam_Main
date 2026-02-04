/**
 * POST /api/cart/revalidate - Revalidate cart item availability (Phase 3.1).
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
  const sessionId = getCartSessionId(request.headers.get('cookie') ?? null)

  try {
    const cart = await CartService.getOrCreateCart(
      session?.user?.id ?? null,
      sessionId
    )
    const updated = await CartService.revalidate(cart.id)
    return NextResponse.json(updated)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to revalidate' },
      { status: 400 }
    )
  }
}
