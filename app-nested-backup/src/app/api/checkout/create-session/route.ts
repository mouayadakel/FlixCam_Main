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
import { prisma } from '@/lib/db/prisma'
import { PaymentGatewayConfigService } from '@/lib/services/payment-gateway-config.service'
import { getAdapter, isSupportedSlug } from '@/lib/integrations/payment-gateway/registry'
import { EmailService } from '@/lib/services/email.service'
import { getPromissoryNoteSettings } from '@/lib/settings/promissory-note-settings'

export async function POST(request: NextRequest) {
  const rate = await checkRateLimitUpstash(request, 'payment')
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    gateway?: string
    checkoutDetails?: { name: string; email: string; phone: string }
    receiver?: {
      name?: string
      idNumber?: string
      phone?: string
      idPhotoUrl?: string
    }
    fulfillmentMethod?: string
    deliveryAddress?: { city?: string; street?: string; notes?: string }
    deliveryLat?: number
    deliveryLng?: number
    preferredTimeSlot?: string
    emergencyContact?: { name?: string; phone?: string; relation?: string }
    checkoutFormData?: Record<string, unknown>
  }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const deliveryAddrStr =
    body.deliveryAddress &&
    [body.deliveryAddress.street, body.deliveryAddress.city, body.deliveryAddress.notes]
      .filter(Boolean)
      .join(', ')
  const deliveryAddr = deliveryAddrStr || undefined

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
      cartId: cart.id,
      startDate: start,
      endDate: end,
      equipment,
      studioId,
      studioStartTime,
      studioEndTime,
      totalAmount,
      vatAmount,
      receiverName: body.receiver?.name,
      receiverPhone: body.receiver?.phone,
      receiverIdNumber: body.receiver?.idNumber,
      receiverIdPhotoUrl: body.receiver?.idPhotoUrl,
      fulfillmentMethod: body.fulfillmentMethod ?? undefined,
      deliveryAddress: deliveryAddr,
      deliveryLat: body.deliveryLat,
      deliveryLng: body.deliveryLng,
      preferredTimeSlot: body.preferredTimeSlot,
      emergencyContactName: body.emergencyContact?.name,
      emergencyContactPhone: body.emergencyContact?.phone,
      emergencyContactRelation: body.emergencyContact?.relation,
      checkoutFormData: body.checkoutFormData,
    },
    session.user.id
  )

  if (
    body.checkoutFormData?.receiver_save_for_later === true &&
    body.receiver?.name &&
    body.receiver?.phone
  ) {
    const existing = await prisma.receiver.findFirst({
      where: {
        userId: session.user.id,
        phone: body.receiver.phone,
        deletedAt: null,
      },
    })
    if (!existing) {
      await prisma.receiver.create({
        data: {
          userId: session.user.id,
          name: body.receiver.name,
          idNumber: body.receiver.idNumber ?? '',
          phone: body.receiver.phone,
          idPhotoUrl: body.receiver.idPhotoUrl ?? '',
        },
      })
    }
  }

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

  const pnSettings = await getPromissoryNoteSettings()
  const pnRequired =
    (hasEquipment && pnSettings.pn_enabled_for_equipment) ||
    (hasStudio && !hasEquipment && pnSettings.pn_enabled_for_studio)

  if (pnRequired) {
    return NextResponse.json({
      redirectUrl: `${appUrl}/checkout/promissory-note/${booking.id}`,
      bookingId: booking.id,
      depositAmount,
    })
  }

  let gatewaySlug = body.gateway && isSupportedSlug(body.gateway) ? body.gateway : null
  if (!gatewaySlug) {
    const enabled = await PaymentGatewayConfigService.getEnabledGateways()
    gatewaySlug = enabled.length > 0 ? (enabled[0].slug as 'tap') : 'tap'
  }

  const config = await PaymentGatewayConfigService.getConfig(gatewaySlug)
  if (config && Object.keys(config).length > 0) {
    try {
      const adapter = getAdapter(gatewaySlug as 'tap', config)
      const customer = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { name: true, email: true, phone: true },
      })
      const name = customer?.name ?? body.checkoutDetails?.name ?? ''
      const parts = typeof name === 'string' ? name.split(/\s+/) : []
      const firstName = parts[0] ?? ''
      const lastName = parts.slice(1).join(' ') || undefined
      const result = await adapter.createPayment({
        amount: Math.round(totalAmount * 100),
        currency: 'SAR',
        customer: {
          email: customer?.email ?? body.checkoutDetails?.email ?? '',
          phone: customer?.phone ?? body.checkoutDetails?.phone ?? '',
          firstName: firstName || undefined,
          lastName: lastName || undefined,
        },
        metadata: { booking_id: booking.id },
        description: `Booking ${booking.bookingNumber}`,
        redirectUrl: redirectSuccess,
      })
      if (result.success && result.redirectUrl) {
        return NextResponse.json({ redirectUrl: result.redirectUrl, bookingId: booking.id, depositAmount })
      }
      if (!result.success && result.error) {
        return NextResponse.json(
          { error: result.error, redirectUrl: redirectSuccess },
          { status: 200 }
        )
      }
    } catch (e) {
      console.error('Payment gateway createPayment error:', e)
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
