/**
 * POST /api/checkout/lock-price – Lock cart price.
 * TTL configurable via SiteSetting key "checkout_lock_ttl_minutes" (default 120).
 * Returns lockedUntil and lockTtlMinutes for frontend countdown.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { CartService } from '@/lib/services/cart.service'
import { getCartSessionId } from '@/lib/cart-session'
import { checkRateLimitUpstash } from '@/lib/utils/rate-limit-upstash'
import { prisma } from '@/lib/db/prisma'
import { handleApiError } from '@/lib/utils/api-helpers'

const DEFAULT_LOCK_TTL_MINUTES = 120

export async function POST(request: NextRequest) {
  try {
    const rate = await checkRateLimitUpstash(request, 'checkout')
    if (!rate.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const setting = await prisma.siteSetting.findUnique({
      where: { key: 'checkout_lock_ttl_minutes' },
      select: { value: true },
    })
    const lockTtlMinutes = setting?.value
      ? Math.max(1, Math.min(480, parseInt(setting.value, 10) || DEFAULT_LOCK_TTL_MINUTES))
      : DEFAULT_LOCK_TTL_MINUTES

    const sessionId = getCartSessionId(request.headers.get('cookie') ?? null)
    const cart = await CartService.getOrCreateCart(session.user.id, sessionId)
    if (cart.items.length === 0) {
      return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
    }

    const lockedUntil = new Date()
    lockedUntil.setMinutes(lockedUntil.getMinutes() + lockTtlMinutes)

    return NextResponse.json({
      locked: true,
      lockedAt: new Date().toISOString(),
      lockedUntil: lockedUntil.toISOString(),
      lockTtlMinutes,
      cartId: cart.id,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
