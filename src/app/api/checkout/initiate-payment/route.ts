/**
 * POST /api/checkout/initiate-payment – Create TAP charge for existing booking (after PN signed)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { TapClient } from '@/lib/integrations/tap/client'
import { getPromissoryNoteSettings } from '@/lib/settings/promissory-note-settings'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const bookingId = body.bookingId
    if (!bookingId || typeof bookingId !== 'string') {
      return NextResponse.json({ error: 'bookingId required' }, { status: 400 })
    }

    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, deletedAt: null },
      include: {
        customer: { select: { name: true, email: true, phone: true } },
        equipment: { include: { equipment: true } },
      },
    })

    if (!booking) return NextResponse.json({ error: 'الحجز غير موجود' }, { status: 404 })
    if (booking.customerId !== session.user.id) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 403 })
    }
    if (booking.status !== 'PAYMENT_PENDING') {
      return NextResponse.json(
        { error: 'الحجز غير جاهز للدفع', redirectUrl: `/portal/bookings` },
        { status: 400 }
      )
    }

    const pnSettings = await getPromissoryNoteSettings()
    const hasEquipment = booking.equipment.length > 0
    const hasStudio = !!booking.studioId
    const pnRequired =
      (hasEquipment && pnSettings.pn_enabled_for_equipment) ||
      (hasStudio && !hasEquipment && pnSettings.pn_enabled_for_studio)

    if (pnRequired) {
      const pn = await prisma.promissoryNote.findFirst({
        where: { bookingId, status: 'SIGNED' },
      })
      if (!pn) {
        return NextResponse.json(
          { error: 'يجب التوقيع على سند الأمر أولاً' },
          { status: 400 }
        )
      }
    }

    const appUrl = process.env.NEXTAUTH_URL || process.env.APP_URL || 'http://localhost:3000'
    const redirectSuccess = `${appUrl}/booking/confirmation/${booking.id}`
    const apiKey = process.env.TAP_API_KEY || process.env.TAP_SECRET_KEY
    const webhookSecret = process.env.TAP_WEBHOOK_SECRET

    if (!apiKey || !webhookSecret) {
      return NextResponse.json({
        redirectUrl: redirectSuccess,
        bookingId: booking.id,
      })
    }

    const totalAmount = Number(booking.totalAmount)
    const tap = new TapClient(apiKey, webhookSecret)
    const customer = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, phone: true },
    })

    const charge = await tap.createCharge({
      amount: Math.round(totalAmount * 100),
      currency: 'SAR',
      customer: {
        email: customer?.email ?? '',
        phone: customer?.phone ?? '',
        first_name: customer?.name ?? undefined,
      },
      metadata: { booking_id: booking.id },
      redirect_url: redirectSuccess,
      description: `Booking ${booking.bookingNumber}`,
    })

    const redirectUrl = charge.redirect?.url || charge.transaction?.url || redirectSuccess
    return NextResponse.json({ redirectUrl, bookingId: booking.id })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
