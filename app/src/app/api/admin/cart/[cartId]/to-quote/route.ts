/**
 * POST /api/admin/cart/[cartId]/to-quote
 * Create a quote from a client's cart. Admin-only.
 * Cart must belong to a user (not guest session).
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { QuoteService } from '@/lib/services/quote.service'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ cartId: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { cartId } = await params
  if (!cartId) {
    return NextResponse.json({ error: 'Cart ID required' }, { status: 400 })
  }

  try {
    const quote = await QuoteService.createQuoteFromCart(
      cartId,
      session.user.id
    )
    return NextResponse.json({
      quote,
      message: 'Quote created from cart',
    })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to create quote from cart'
    const status =
      message.includes('permission') ? 403
      : message.includes('not found') ? 404
      : 400
    return NextResponse.json({ error: message }, { status })
  }
}
