/**
 * POST /api/quotes/[id]/add-to-cart
 * Add quote equipment items to the authenticated customer's cart.
 * Caller must be the quote customer.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { QuoteService } from '@/lib/services/quote.service'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id: quoteId } = await params
  if (!quoteId) {
    return NextResponse.json({ error: 'Quote ID required' }, { status: 400 })
  }

  try {
    const { cart } = await QuoteService.addQuoteToCart(quoteId, session.user.id)
    return NextResponse.json({ cart, message: 'Quote items added to cart' })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Failed to add quote to cart'
    const status =
      message.includes('permission') || message.includes('own')
        ? 403
        : message.includes('not found')
          ? 404
          : 400
    return NextResponse.json({ error: message }, { status })
  }
}
