/**
 * PUT /api/cart/addons - Persist checkout add-ons onto the cart.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { CartService } from '@/lib/services/cart.service'
import { getCartSessionId } from '@/lib/cart-session'
import { checkRateLimitUpstash } from '@/lib/utils/rate-limit-upstash'
import { prisma } from '@/lib/db/prisma'
import { normalizePersistedAddons } from '@/lib/pricing/checkout-addons'

/** Resolve cart userId: only use session user.id if that user exists in DB (avoids FK violation). */
async function resolveCartUserId(userId: string | undefined | null): Promise<string | null> {
  if (!userId) return null
  const user = await prisma.user.findUnique({
    where: { id: userId, deletedAt: null },
    select: { id: true },
  })
  return user?.id ?? null
}

export async function PUT(request: NextRequest) {
  const rate = await checkRateLimitUpstash(request, 'checkout')
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const session = await auth()
  const sessionId = getCartSessionId(request.headers.get('cookie') ?? null)
  const userId = await resolveCartUserId(session?.user?.id ?? null)

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  // Normalize + clamp (avoid arbitrary JSON / huge payloads)
  const addons = normalizePersistedAddons(body)

  const cart = await CartService.getOrCreateCart(userId, sessionId)
  const updated = await CartService.setAddons(cart.id, addons)
  return NextResponse.json(updated)
}

