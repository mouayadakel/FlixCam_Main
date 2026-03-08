/**
 * PATCH /api/cart/[itemId] - Update item. DELETE /api/cart/[itemId] - Remove item (Phase 3.1).
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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const rate = await checkRateLimitUpstash(request, 'checkout')
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { itemId } = await params
  let body: { quantity?: number; startDate?: string; endDate?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  try {
    const cart = await getCart(request)
    const updated = await CartService.updateItem(cart.id, itemId, {
      quantity: body.quantity,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
    })
    return NextResponse.json(updated)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to update' },
      { status: 400 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  const rate = await checkRateLimitUpstash(request, 'checkout')
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { itemId } = await params
  try {
    const cart = await getCart(request)
    const updated = await CartService.removeItem(cart.id, itemId)
    return NextResponse.json(updated)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Failed to remove' },
      { status: 400 }
    )
  }
}
