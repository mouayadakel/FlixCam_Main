/**
 * GET /api/cart - Get current cart. POST /api/cart - Add item (Phase 3.1).
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { CartService } from '@/lib/services/cart.service'
import { getCartSessionId, setCartSessionCookie } from '@/lib/cart-session'
import { checkRateLimitUpstash } from '@/lib/utils/rate-limit-upstash'

export async function GET(request: NextRequest) {
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
    const res = NextResponse.json(cart)
    if (!session?.user?.id && !sessionId && cart.sessionId) {
      res.headers.set('Set-Cookie', setCartSessionCookie(cart.sessionId))
    }
    return res
  } catch (e) {
    console.error('Cart GET error:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to get cart' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  const rate = await checkRateLimitUpstash(request, 'checkout')
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

  try {
    const cart = await CartService.getOrCreateCart(
      session?.user?.id ?? null,
      sessionId
    )

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
    console.error('Cart POST error:', e)
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to add to cart' },
      { status: 400 }
    )
  }
}
