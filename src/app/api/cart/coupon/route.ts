/**
 * POST /api/cart/coupon - Apply coupon. DELETE /api/cart/coupon - Remove coupon (Phase 3.1).
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { CartService } from '@/lib/services/cart.service'
import { getCartSessionId } from '@/lib/cart-session'
import { checkRateLimitUpstash } from '@/lib/utils/rate-limit-upstash'

async function getCart(request: NextRequest) {
  const session = await auth()
  const sessionId = getCartSessionId(request.headers.get('cookie') ?? null)
  return CartService.getOrCreateCart(session?.user?.id ?? null, sessionId)
}

export async function POST(request: NextRequest) {
  const rate = await checkRateLimitUpstash(request, 'checkout')
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  let body: { code?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }
  const code = body.code?.trim()
  if (!code) {
    return NextResponse.json({ error: 'code required' }, { status: 400 })
  }

  try {
    const cart = await getCart(request)
    const updated = await CartService.applyCoupon(cart.id, code)
    return NextResponse.json(updated)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Invalid coupon' },
      { status: 400 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  const rate = await checkRateLimitUpstash(request, 'checkout')
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const cart = await getCart(request)
    const updated = await CartService.removeCoupon(cart.id)
    return NextResponse.json(updated)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Failed' }, { status: 400 })
  }
}
