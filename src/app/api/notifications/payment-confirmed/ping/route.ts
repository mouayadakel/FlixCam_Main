/**
 * POST /api/notifications/payment-confirmed/ping
 *
 * Used by the booking confirmation page as a fast hint to notify staff (Admin/Warehouse).
 * Webhook remains the source of truth; staff notification is idempotent per booking.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { OrderNotificationService } from '@/lib/services/order-notification.service'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const bookingId = body?.bookingId
    if (!bookingId || typeof bookingId !== 'string') {
      return NextResponse.json({ error: 'bookingId required' }, { status: 400 })
    }

    // Client may only ping for their own booking.
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        customerId: session.user.id,
        deletedAt: null,
      },
      select: {
        id: true,
        status: true,
        totalAmount: true,
        vatAmount: true,
      },
    })

    if (!booking) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    // Only send staff notification when booking is already confirmed.
    // (If pending, webhook will handle it later.)
    if (booking.status !== 'CONFIRMED') {
      return NextResponse.json({ ok: true, skipped: true, reason: 'not_confirmed' })
    }

    const amount = Number(booking.totalAmount || 0) + Number(booking.vatAmount || 0)
    await OrderNotificationService.notifyStaffPaymentConfirmed(booking.id, amount)

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Internal server error' },
      { status: 500 }
    )
  }
}

