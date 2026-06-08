/**
 * POST /api/checkout/create-session – Create booking from cart + TAP charge, return redirect URL (Phase 3.5).
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { CartService } from '@/lib/services/cart.service'
import { BookingService } from '@/lib/services/booking.service'
import { PricingService } from '@/lib/services/pricing.service'
import { calculateVAT, getVATRate } from '@/lib/vat'
import { getCartSessionId } from '@/lib/cart-session'
import { checkRateLimitUpstash } from '@/lib/utils/rate-limit-upstash'
import { prisma } from '@/lib/db/prisma'
import { PaymentGatewayConfigService } from '@/lib/services/payment-gateway-config.service'
import { getAdapter, isSupportedSlug } from '@/lib/integrations/payment-gateway/registry'
import { getPromissoryNoteSettings } from '@/lib/settings/promissory-note-settings'
import { AppError } from '@/lib/errors'
import { logger } from '@/lib/logger'
import { bookingPayableBreakdown, payableGrandTotalSar } from '@/lib/utils/checkout-totals'
import { assertMoyasarCheckoutChargeHalalah, sarToMoyasarHalalah } from '@/lib/utils/moyasar-amount'
import { toGatewayAmount } from '@/lib/payment/money'
import { resolveCheckoutCustomer } from '@/lib/checkout/resolve-checkout-customer'
import { ensureCartPriceLock } from '@/lib/checkout/cart-price-lock'
import { ValidationError } from '@/lib/errors'

function createRequestId() {
  return `chk_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

/** Safe diagnostic: never log the full key */
function moyasarPublishableKeyMode(publishableKey: string): 'live' | 'test' | 'unknown' {
  const p = publishableKey.trim()
  if (p.startsWith('pk_live')) return 'live'
  if (p.startsWith('pk_test')) return 'test'
  return 'unknown'
}

function isCartUniqueConstraintError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error)
  const lowered = message.toLowerCase()
  return lowered.includes('unique constraint failed') && lowered.includes('cartid')
}

export async function POST(request: NextRequest) {
  const rate = await checkRateLimitUpstash(request, 'payment')
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const session = await auth()

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

  const requestId = createRequestId()

  try {
    const checkoutContact = {
      name: body.checkoutDetails?.name?.trim() || body.receiver?.name?.trim() || '',
      email: body.checkoutDetails?.email?.trim() || '',
      phone: body.checkoutDetails?.phone?.trim() || body.receiver?.phone?.trim() || '',
    }

    let customerId: string
    let actorId: string
    let isGuest = false
    try {
      const resolved = await resolveCheckoutCustomer(session, checkoutContact)
      customerId = resolved.customerId
      actorId = resolved.actorId
      isGuest = resolved.isGuest
    } catch (error) {
      if (error instanceof ValidationError) {
        return NextResponse.json({ error: error.message, requestId }, { status: 400 })
      }
      throw error
    }

    const deliveryAddrStr =
      body.deliveryAddress &&
      [body.deliveryAddress.street, body.deliveryAddress.city, body.deliveryAddress.notes]
        .filter(Boolean)
        .join(', ')
    const deliveryAddr = deliveryAddrStr || undefined

    const sessionId = getCartSessionId(request.headers.get('cookie') ?? null)
    const cartUserId = session?.user?.id ?? null
    const cart = await CartService.getOrCreateCart(cartUserId, sessionId)
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
          else
            equipment.push({ equipmentId: ki.equipmentId, quantity: ki.quantity * item.quantity })
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
      studioStartTime =
        first.startDate instanceof Date ? first.startDate : new Date(first.startDate)
      studioEndTime = first.endDate instanceof Date ? first.endDate : new Date(first.endDate)
      start = studioStartTime
      end = studioEndTime
    }

    if (end <= start) {
      return NextResponse.json({ error: 'Invalid dates' }, { status: 400 })
    }

    const rateDecimal = await getVATRate()
    const vatRateNum = rateDecimal.toNumber()

    // cart.total = subtotal minus coupon (ex-VAT). VAT uses company settings; customer pays net + VAT.
    const totalAmount = cart.total
    const vatAmount = calculateVAT(totalAmount, rateDecimal).toNumber()
    const depositAmount = hasEquipment ? await PricingService.calculateDeposit(equipment) : 0

    const existingBookingForCart = await prisma.booking.findFirst({
      where: {
        cartId: cart.id,
        customerId,
        deletedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    })

    let booking = existingBookingForCart
    const hasExistingBooking = !!existingBookingForCart

    if (!booking) {
      try {
        booking = await BookingService.create(
          {
            customerId,
            cartId: cart.id,
            startDate: start,
            endDate: end,
            equipment,
            studioId,
            studioStartTime,
            studioEndTime,
            totalAmount,
            vatAmount,
            depositAmount,
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
            checkoutFormData: {
              ...(typeof body.checkoutFormData === 'object' && body.checkoutFormData ? body.checkoutFormData : {}),
              checkoutAddons: cart.addons ?? {},
            },
          },
          actorId
        )
      } catch (error) {
        if (!isCartUniqueConstraintError(error)) {
          throw error
        }
        booking = await prisma.booking.findFirst({
          where: {
            cartId: cart.id,
            customerId,
            deletedAt: null,
          },
          orderBy: { createdAt: 'desc' },
        })
        if (!booking) {
          throw error
        }
      }
    }

    if (booking.status === 'CONFIRMED') {
      const appUrl = process.env.NEXTAUTH_URL || process.env.APP_URL || 'http://localhost:3000'
      return NextResponse.json({
        redirectUrl: `${appUrl}/booking/confirmation/${booking.id}`,
        bookingId: booking.id,
      })
    }

    if (isGuest && !cart.userId) {
      await prisma.cart.update({
        where: { id: cart.id },
        data: { userId: customerId, sessionId: null },
      })
    }

    if (
      !isGuest &&
      !hasExistingBooking &&
      body.checkoutFormData?.receiver_save_for_later === true &&
      body.receiver?.name &&
      body.receiver?.phone
    ) {
      const existing = await prisma.receiver.findFirst({
        where: {
          userId: customerId,
          phone: body.receiver.phone,
          deletedAt: null,
        },
      })
      if (!existing) {
        await prisma.receiver.create({
          data: {
            userId: customerId,
            name: body.receiver.name,
            idNumber: body.receiver.idNumber ?? '',
            phone: body.receiver.phone,
            idPhotoUrl: body.receiver.idPhotoUrl ?? '',
          },
        })
      }
    }

    if (!hasExistingBooking) {
      await BookingService.performRiskCheck(booking.id, actorId)
    }
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

    // Authoritative ex-VAT net: recompute cart totals from line items (fixes stale `cart.total` vs UI)
    const refreshedCart = await CartService.refreshTotalsFromLineItems(cart.id)
    const exVatCharged = refreshedCart.total
    if (Math.abs(exVatCharged - totalAmount) > 0.01) {
      logger.warn('checkout create-session: cart.total corrected from line items before payment', {
        event: 'checkout.cart_total_synced',
        requestId,
        cartId: cart.id,
        totalFromFirstRead: totalAmount,
        totalAfterRecalc: exVatCharged,
      })
    }
    const vatForPayment = calculateVAT(exVatCharged, rateDecimal).toNumber()
    const grandTotalPayableSar = payableGrandTotalSar(exVatCharged, vatRateNum)
    const paymentSummary = bookingPayableBreakdown(exVatCharged, vatForPayment, vatRateNum)
    const priceLock = await ensureCartPriceLock(refreshedCart, customerId)
    if (Math.abs(priceLock.totalAmount - grandTotalPayableSar) > 0.01) {
      logger.warn('checkout create-session: price lock total differs from legacy cart total', {
        event: 'checkout.price_lock_mismatch',
        requestId,
        cartId: cart.id,
        priceLockTotal: priceLock.totalAmount,
        payableTotal: grandTotalPayableSar,
      })
    }
    const storedBookingSubtotal = Number(booking.totalAmount ?? 0)
    const storedBookingVat = Number(booking.vatAmount ?? 0)

    if (
      Math.abs(exVatCharged - storedBookingSubtotal) > 0.01 ||
      Math.abs(vatForPayment - storedBookingVat) > 0.01
    ) {
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          totalAmount: exVatCharged,
          vatAmount: vatForPayment,
          updatedBy: actorId,
        },
      })

      logger.warn('checkout create-session: synced stale booking totals from refreshed cart', {
        event: 'checkout.booking_total_synced',
        requestId,
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        cartId: cart.id,
        storedSubtotalExVatSar: storedBookingSubtotal,
        storedVatSar: storedBookingVat,
        authoritativeSubtotalExVatSar: exVatCharged,
        authoritativeVatSar: vatForPayment,
        authoritativeGrandTotalSar: grandTotalPayableSar,
      })
    }

    if (grandTotalPayableSar < 1) {
      return NextResponse.json(
        {
          error: 'لا يمكن الدفع: المبلغ الإجمالي يجب أن يكون 1 ر.س. على الأقل',
          requestId,
          code: 'INVALID_CART_TOTAL',
        },
        { status: 400 }
      )
    }

    const appUrl = process.env.NEXTAUTH_URL || process.env.APP_URL || 'http://localhost:3000'
    const redirectSuccess = `${appUrl}/booking/confirmation/${booking.id}`
    const moyasarCallbackUrl = `${appUrl}/api/checkout/moyasar/callback?bookingId=${booking.id}`

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
      const envDefaultGateway = (process.env.PAYMENT_DEFAULT_GATEWAY || 'moyasar').toLowerCase()
      const fallbackGateway = isSupportedSlug(envDefaultGateway) ? envDefaultGateway : 'tap'
      gatewaySlug =
        enabled.length > 0 && isSupportedSlug(enabled[0].slug) ? enabled[0].slug : fallbackGateway
    }

    const config = await PaymentGatewayConfigService.getConfig(gatewaySlug)
    console.info('[checkout:create-session] payment init', {
      requestId,
      userId: customerId,
      isGuest,
      bookingId: booking.id,
      gateway: gatewaySlug,
      configKeys: config ? Object.keys(config) : [],
      hasCheckoutDetails: !!body.checkoutDetails,
      hasReceiver: !!body.receiver,
    })
    if (config && Object.keys(config).length > 0) {
      try {
        if (gatewaySlug === 'moyasar') {
          // Prefer MOYASAR_* from the process environment (e.g. live keys in .env) over DB-backed merge.
          const publishableKey =
            process.env.MOYASAR_PUBLISHABLE_KEY?.trim() || config.publishableKey || config.publicKey

          if (!publishableKey) {
            return NextResponse.json(
              { error: 'Moyasar publishable key is not configured', requestId },
              { status: 400 }
            )
          }

          console.info('[checkout:create-session] moyasar key mode', {
            requestId,
            moyasarPublishableKeyMode: moyasarPublishableKeyMode(publishableKey),
          })

          // Moyasar expects amount in halalahs (smallest unit). 1 SAR = 100 — never send riyal major units as `amount`
          const moyasarAmountHalalah = sarToMoyasarHalalah(grandTotalPayableSar)
          assertMoyasarCheckoutChargeHalalah(moyasarAmountHalalah, 'create-session:moyasar')
          // Same action as "إتمام الحجز" (cart) — inspect server stdout / log drain for this line
          logger.info('Moyasar session payload (create-session, checkout complete booking)', {
            event: 'moyasar.checkout.create_session',
            requestId,
            bookingId: booking.id,
            bookingNumber: booking.bookingNumber,
            exVatSar: exVatCharged,
            vatSar: vatForPayment,
            grandTotalSar: grandTotalPayableSar,
            moyasarAmountHalalah,
            moyasarCurrency: 'SAR',
            description: `Booking ${booking.bookingNumber}`,
            cartExVatAtFirstRead: totalAmount,
          })

          return NextResponse.json({
            gateway: 'moyasar',
            bookingId: booking.id,
            depositAmount,
            paymentSummary,
            moyasar: {
              publishableKey,
              // Moyasar `amount` must be integer halalah (1 SAR = 100)
              amount: moyasarAmountHalalah,
              currency: 'SAR',
              callbackUrl: moyasarCallbackUrl,
              description: `Booking ${booking.bookingNumber}`,
              metadata: { booking_id: booking.id },
            },
          })
        }

        const adapter = getAdapter(gatewaySlug as 'tap', config)
        const customer = await prisma.user.findUnique({
          where: { id: customerId },
          select: { name: true, email: true, phone: true },
        })
        const name = customer?.name ?? body.checkoutDetails?.name ?? ''
        const parts = typeof name === 'string' ? name.split(/\s+/) : []
        const firstName = parts[0] ?? ''
        const lastName = parts.slice(1).join(' ') || undefined
        const tapAmountSar = toGatewayAmount(grandTotalPayableSar, 'tap')
        const result = await adapter.createPayment({
          amount: tapAmountSar,
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
          return NextResponse.json({
            redirectUrl: result.redirectUrl,
            bookingId: booking.id,
            depositAmount,
          })
        }
        if (result.success && !result.redirectUrl) {
          return NextResponse.json(
            {
              error: 'Payment session created without provider redirect URL',
              gateway: gatewaySlug,
              requestId,
              bookingId: booking.id,
            },
            { status: 502 }
          )
        }
        if (!result.success && result.error) {
          return NextResponse.json(
            { error: result.error, gateway: gatewaySlug, requestId },
            { status: 400 }
          )
        }
      } catch (e) {
        console.error('[checkout:create-session] payment provider error', {
          requestId,
          userId: customerId,
          bookingId: booking.id,
          gateway: gatewaySlug,
          error: e instanceof Error ? e.message : String(e),
        })
        return NextResponse.json(
          { error: 'Payment provider error', gateway: gatewaySlug, requestId },
          { status: 502 }
        )
      }
    }

    return NextResponse.json(
      {
        error: 'Payment gateway is not configured',
        gateway: gatewaySlug,
        requestId,
        bookingId: booking.id,
      },
      { status: 503 }
    )
  } catch (e) {
    if (e instanceof AppError) {
      console.warn('[checkout:create-session] handled app error', {
        requestId,
        userId: session?.user?.id ?? null,
        code: e.code,
        statusCode: e.statusCode,
        message: e.message,
      })
      return NextResponse.json(
        { error: e.message, code: e.code, requestId },
        { status: e.statusCode || 400 }
      )
    }

    console.error('[checkout:create-session] unhandled error', {
      requestId,
      userId: session?.user?.id ?? null,
      gateway: body.gateway ?? null,
      hasCheckoutDetails: !!body.checkoutDetails,
      hasReceiver: !!body.receiver,
      fulfillmentMethod: body.fulfillmentMethod ?? null,
      error: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : undefined,
    })
    return NextResponse.json({ error: 'فشل إنشاء جلسة الدفع', requestId }, { status: 500 })
  }
}
