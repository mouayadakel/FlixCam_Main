/**
 * POST /api/checkout/initiate-payment – Create payment charge for existing booking (after PN signed)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { PaymentGatewayConfigService } from '@/lib/services/payment-gateway-config.service'
import { getAdapter, isSupportedSlug } from '@/lib/integrations/payment-gateway/registry'
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
    let gatewaySlug: string
    if (body.gateway && isSupportedSlug(body.gateway)) {
      gatewaySlug = body.gateway
    } else {
      const enabled = await PaymentGatewayConfigService.getEnabledGateways()
      gatewaySlug = enabled[0]?.slug ?? 'tap'
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

    const resolvedSlug = typeof gatewaySlug === 'string' ? gatewaySlug : 'tap'
    const config = await PaymentGatewayConfigService.getConfig(resolvedSlug)
    if (!config || Object.keys(config).length === 0) {
      return NextResponse.json({
        redirectUrl: redirectSuccess,
        bookingId: booking.id,
      })
    }

    const totalAmount = Number(booking.totalAmount)
    const adapter = getAdapter(resolvedSlug as 'tap', config)
    const customer = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, phone: true },
    })
    const name = customer?.name ?? ''
    const parts = typeof name === 'string' ? name.split(/\s+/) : []
    const firstName = parts[0] ?? ''
    const lastName = parts.slice(1).join(' ') || undefined

    const result = await adapter.createPayment({
      amount: Math.round(totalAmount * 100),
      currency: 'SAR',
      customer: {
        email: customer?.email ?? '',
        phone: customer?.phone ?? '',
        firstName: firstName || undefined,
        lastName: lastName || undefined,
      },
      metadata: { booking_id: booking.id },
      description: `Booking ${booking.bookingNumber}`,
      redirectUrl: redirectSuccess,
    })

    const redirectUrl = result.success && result.redirectUrl ? result.redirectUrl : redirectSuccess
    return NextResponse.json({ redirectUrl, bookingId: booking.id })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
