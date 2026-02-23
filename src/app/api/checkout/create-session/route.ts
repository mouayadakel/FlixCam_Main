/**
 * POST /api/checkout/create-session – Create booking from cart + TAP charge, return redirect URL (Phase 3.5).
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { CartService } from '@/lib/services/cart.service'
import { BookingService } from '@/lib/services/booking.service'
import { PricingService } from '@/lib/services/pricing.service'
import { getCartSessionId } from '@/lib/cart-session'
import { checkRateLimitUpstash } from '@/lib/utils/rate-limit-upstash'
import { TapClient } from '@/lib/integrations/tap/client'
import { prisma } from '@/lib/db/prisma'
import { EmailService } from '@/lib/services/email.service'

export async function POST(request: NextRequest) {
  const rate = await checkRateLimitUpstash(request, 'payment')
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { checkoutDetails?: { name: string; email: string; phone: string } }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const sessionId = getCartSessionId(request.headers.get('cookie') ?? null)
  const cart = await CartService.getOrCreateCart(session.user.id, sessionId)
  if (!cart.items.length) {
    return NextResponse.json({ error: 'Cart is empty' }, { status: 400 })
  }

  const equipment: { equipmentId: string; quantity: number }[] = []
  const studioItems = cart.items.filter(
    (i): i is typeof i & { studioId: string; startDate: Date; endDate: Date } =>
      i.itemType === 'STUDIO' && !!i.studioId && !!i.startDate && !!i.endDate
  )
  let startDate: Date | null = null
  let endDate: Date | null = null

  for (const item of cart.items) {
    if (item.startDate) startDate = startDate || item.startDate
    if (item.endDate) endDate = endDate || item.endDate
    if (item.itemType === 'EQUIPMENT' && item.equipmentId) {
      equipment.push({ equipmentId: item.equipmentId, quantity: item.quantity })
    } else if ((item.itemType === 'KIT' || item.itemType === 'PACKAGE') && item.kitId) {
      const kitItems = await prisma.kitEquipment.findMany({
        where: { kitId: item.kitId },
      })
      for (const ki of kitItems) {
        const existing = equipment.find((e) => e.equipmentId === ki.equipmentId)
        if (existing) existing.quantity += ki.quantity * item.quantity
        else equipment.push({ equipmentId: ki.equipmentId, quantity: ki.quantity * item.quantity })
      }
    }
  }

  const hasEquipment = equipment.length > 0
  const hasStudio = studioItems.length > 0
  if (!hasEquipment && !hasStudio) {
    return NextResponse.json(
      { error: 'Cart must contain at least one equipment, kit, or studio booking' },
      { status: 400 }
    )
  }

  let studioId: string | undefined
  let studioStartTime: Date | undefined
  let studioEndTime: Date | undefined

  let start = startDate ?? new Date()
  let end = endDate ?? new Date(Date.now() + 24 * 60 * 60 * 1000)
  if (hasStudio) {
    const first = studioItems[0]
    studioId = first.studioId
    studioStartTime = first.startDate instanceof Date ? first.startDate : new Date(first.startDate)
    studioEndTime = first.endDate instanceof Date ? first.endDate : new Date(first.endDate)
    start = studioStartTime
    end = studioEndTime
  }

  if (end <= start) {
    return NextResponse.json({ error: 'Invalid dates' }, { status: 400 })
  }

  const totalAmount = cart.total
  const vatAmount = totalAmount * 0.15
  const depositAmount = hasEquipment ? await PricingService.calculateDeposit(equipment) : 0

  const booking = await BookingService.create(
    {
      customerId: session.user.id,
      startDate: start,
      endDate: end,
      equipment,
      studioId,
      studioStartTime,
      studioEndTime,
      totalAmount,
      vatAmount,
    },
    session.user.id
  )

  // Send confirmation email (fire-and-forget)
  const emailCustomer = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true },
  })
  if (emailCustomer?.email) {
    const studioRecord = studioId
      ? await prisma.studio.findUnique({
          where: { id: studioId },
          select: { name: true, address: true },
        })
      : null
    const eqNames = equipment.length
      ? await prisma.equipment
          .findMany({
            where: { id: { in: equipment.map((e) => e.equipmentId) } },
          })
          .then((rows) => rows.map((r) => (r as any).name as string).filter(Boolean))
      : []
    EmailService.sendBookingConfirmation({
      to: emailCustomer.email,
      customerName: emailCustomer.name || 'عميل',
      bookingNumber: booking.bookingNumber,
      bookingId: booking.id,
      startDate: start,
      endDate: end,
      totalAmount,
      studioName: studioRecord?.name,
      studioAddress: (studioRecord as any)?.address,
      studioStartTime: studioStartTime ?? null,
      studioEndTime: studioEndTime ?? null,
      equipmentList: eqNames,
    }).catch((e) => console.error('Booking confirmation email error:', e))
  }

  await BookingService.performRiskCheck(booking.id, session.user.id)
  const updated = await prisma.booking.findUnique({
    where: { id: booking.id },
    select: { status: true },
  })
  if (updated?.status !== 'PAYMENT_PENDING') {
    return NextResponse.json(
      {
        error: 'الحجز قيد المراجعة. سنتواصل معك قريباً.',
        redirectUrl: `${process.env.NEXTAUTH_URL || process.env.APP_URL || 'http://localhost:3000'}/portal/bookings`,
      },
      { status: 200 }
    )
  }

  const appUrl = process.env.NEXTAUTH_URL || process.env.APP_URL || 'http://localhost:3000'
  const redirectSuccess = `${appUrl}/booking/confirmation/${booking.id}`

  const apiKey = process.env.TAP_API_KEY || process.env.TAP_SECRET_KEY
  const webhookSecret = process.env.TAP_WEBHOOK_SECRET

  if (apiKey && webhookSecret) {
    try {
      const tap = new TapClient(apiKey, webhookSecret)
      const customer = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, email: true, phone: true },
      })
      const charge = await tap.createCharge({
        amount: Math.round(totalAmount * 100),
        currency: 'SAR',
        customer: {
          email: customer?.email ?? body.checkoutDetails?.email ?? '',
          phone: customer?.phone ?? body.checkoutDetails?.phone ?? '',
          first_name: customer?.name ?? body.checkoutDetails?.name ?? undefined,
        },
        metadata: { booking_id: booking.id },
        redirect_url: redirectSuccess,
        description: `Booking ${booking.bookingNumber}`,
      })
      const redirectUrl = charge.redirect?.url || charge.transaction?.url || redirectSuccess
      return NextResponse.json({ redirectUrl, bookingId: booking.id, depositAmount })
    } catch (e) {
      console.error('Tap createCharge error:', e)
      return NextResponse.json(
        { error: 'Payment provider error', redirectUrl: redirectSuccess },
        { status: 200 }
      )
    }
  }

  return NextResponse.json({
    redirectUrl: redirectSuccess,
    bookingId: booking.id,
    depositAmount,
  })
}
