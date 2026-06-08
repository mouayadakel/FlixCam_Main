/**
 * POST /api/checkout/initiate-payment – Create payment charge for existing booking (after PN signed)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { PaymentGatewayConfigService } from '@/lib/services/payment-gateway-config.service'
import { getAdapter, isSupportedSlug } from '@/lib/integrations/payment-gateway/registry'
import { resolveAuthoritativeBookingPaymentTotals } from '@/lib/services/booking-payment-totals.service'
import { getPromissoryNoteSettings } from '@/lib/settings/promissory-note-settings'
import { checkRateLimitUpstash } from '@/lib/utils/rate-limit-upstash'
import { logger } from '@/lib/logger'
import { assertMoyasarCheckoutChargeHalalah } from '@/lib/utils/moyasar-amount'
import { toGatewayAmount } from '@/lib/payment/money'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const rate = await checkRateLimitUpstash(request, 'payment')
    if (!rate.allowed) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }

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
        return NextResponse.json({ error: 'يجب التوقيع على سند الأمر أولاً' }, { status: 400 })
      }
    }

    const appUrl = process.env.NEXTAUTH_URL || process.env.APP_URL || 'http://localhost:3000'
    const redirectSuccess = `${appUrl}/booking/confirmation/${booking.id}`
    const moyasarCallbackUrl = `${appUrl}/api/checkout/moyasar/callback?bookingId=${booking.id}`

    const resolvedSlug = typeof gatewaySlug === 'string' ? gatewaySlug : 'tap'
    const config = await PaymentGatewayConfigService.getConfig(resolvedSlug)
    if (!config || Object.keys(config).length === 0) {
      return NextResponse.json(
        {
          error: 'Payment gateway is not configured',
          gateway: resolvedSlug,
          bookingId: booking.id,
        },
        { status: 503 }
      )
    }

    const { subtotalExVatSar, vatSar, paymentSummary } =
      await resolveAuthoritativeBookingPaymentTotals({
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        cartId: booking.cartId,
        storedSubtotalExVat: booking.totalAmount,
        storedVat: booking.vatAmount,
        updatedBy: session.user.id,
      })
    const subtotalExVat = subtotalExVatSar
    const grandTotalPayableSar = paymentSummary.grandTotalSar
    if (booking.cartId) {
      const priceLock = await prisma.priceLock.findUnique({
        where: { cartId: booking.cartId },
        select: { expiresAt: true, totalAmount: true },
      })
      if (!priceLock || priceLock.expiresAt < new Date()) {
        return NextResponse.json(
          { error: 'Price lock expired. Please refresh your cart before payment.', code: 'PRICE_LOCK_EXPIRED' },
          { status: 409 }
        )
      }
      if (Math.abs(Number(priceLock.totalAmount) - grandTotalPayableSar) > 0.01) {
        logger.warn('checkout initiate-payment: price lock total differs from legacy booking total', {
          event: 'checkout.price_lock_mismatch',
          bookingId: booking.id,
          cartId: booking.cartId,
          priceLockTotal: Number(priceLock.totalAmount),
          payableTotal: grandTotalPayableSar,
        })
      }
    }
    if (grandTotalPayableSar < 1) {
      return NextResponse.json(
        {
          error: 'لا يمكن الدفع: المبلغ يجب أن يكون 1 ر.س. على الأقل',
          bookingId,
          code: 'INVALID_BOOKING_TOTAL',
        },
        { status: 400 }
      )
    }
    if (resolvedSlug === 'moyasar') {
      const publishableKey =
        process.env.MOYASAR_PUBLISHABLE_KEY?.trim() || config.publishableKey || config.publicKey

      if (!publishableKey) {
        return NextResponse.json(
          { error: 'Moyasar publishable key is not configured', gateway: resolvedSlug },
          { status: 400 }
        )
      }

      // Moyasar expects amount in halalahs. 1 SAR = 100 — never pass riyal major units as `amount`
      const moyasarAmountHalalah = paymentSummary.amountHalalah
      assertMoyasarCheckoutChargeHalalah(moyasarAmountHalalah, 'initiate-payment:moyasar')
      logger.info('Moyasar session payload (initiate-payment, existing booking)', {
        event: 'moyasar.checkout.initiate_payment',
        bookingId: booking.id,
        bookingNumber: booking.bookingNumber,
        exVatSar: subtotalExVat,
        vatSar,
        grandTotalSar: grandTotalPayableSar,
        moyasarAmountHalalah,
        moyasarCurrency: 'SAR',
        description: `Booking ${booking.bookingNumber}`,
      })

      return NextResponse.json({
        gateway: 'moyasar',
        bookingId: booking.id,
        paymentSummary,
        moyasar: {
          publishableKey,
          // Moyasar `amount` must be integer halalah (1 SAR = 100), not riyal major units
          amount: moyasarAmountHalalah,
          currency: 'SAR',
          callbackUrl: moyasarCallbackUrl,
          description: `Booking ${booking.bookingNumber}`,
          metadata: { booking_id: booking.id },
        },
      })
    }

    const adapter = getAdapter(resolvedSlug as 'tap', config)
    const customer = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true, phone: true },
    })
    const name = customer?.name ?? ''
    const parts = typeof name === 'string' ? name.split(/\s+/) : []
    const firstName = parts[0] ?? ''
    const lastName = parts.slice(1).join(' ') || undefined

    const tapAmountSar = toGatewayAmount(paymentSummary.grandTotalSar, 'tap')
    const result = await adapter.createPayment({
      amount: tapAmountSar,
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

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Payment initiation failed', gateway: resolvedSlug },
        { status: 400 }
      )
    }

    if (!result.redirectUrl) {
      return NextResponse.json(
        {
          error: 'Payment session created without provider redirect URL',
          gateway: resolvedSlug,
          bookingId: booking.id,
        },
        { status: 502 }
      )
    }

    const redirectUrl = result.redirectUrl
    return NextResponse.json({ redirectUrl, bookingId: booking.id, paymentSummary })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
