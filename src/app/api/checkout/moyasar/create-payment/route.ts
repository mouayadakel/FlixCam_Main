import { NextRequest, NextResponse } from 'next/server'
import { BookingStatus } from '@prisma/client'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { MoyasarClient } from '@/lib/integrations/moyasar/client'
import { logger } from '@/lib/logger'
import { resolveAuthoritativeBookingPaymentTotals } from '@/lib/services/booking-payment-totals.service'
import { PaymentGatewayConfigService } from '@/lib/services/payment-gateway-config.service'
import { assertMoyasarCheckoutChargeHalalah } from '@/lib/utils/moyasar-amount'
import { checkRateLimitUpstash } from '@/lib/utils/rate-limit-upstash'

function createRequestId() {
  return `myp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`
}

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const requestId = createRequestId()

  try {
    const rate = await checkRateLimitUpstash(request, 'payment')
    if (!rate.allowed) {
      return NextResponse.json({ error: 'Too many requests', requestId }, { status: 429 })
    }

    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized', requestId }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const bookingId = typeof body.bookingId === 'string' ? body.bookingId.trim() : ''
    const token = typeof body.token === 'string' ? body.token.trim() : ''

    if (!bookingId) {
      return NextResponse.json({ error: 'bookingId required', requestId }, { status: 400 })
    }
    if (!token) {
      return NextResponse.json({ error: 'token required', requestId }, { status: 400 })
    }

    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        customerId: session.user.id,
        deletedAt: null,
      },
      select: {
        id: true,
        bookingNumber: true,
        status: true,
        cartId: true,
        totalAmount: true,
        vatAmount: true,
      },
    })

    if (!booking) {
      return NextResponse.json({ error: 'الحجز غير موجود', requestId }, { status: 404 })
    }
    if (booking.status !== BookingStatus.PAYMENT_PENDING) {
      return NextResponse.json(
        {
          error: 'الحجز غير جاهز للدفع',
          requestId,
          bookingId: booking.id,
          status: booking.status,
        },
        { status: 400 }
      )
    }

    const config = await PaymentGatewayConfigService.getConfig('moyasar')
    const apiKey = process.env.MOYASAR_SECRET_KEY?.trim() || config?.secretKey

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Moyasar secret key is not configured', requestId },
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
        requestId,
      })
    const grandTotalSar = paymentSummary.grandTotalSar
    const amountHalalah = paymentSummary.amountHalalah

    if (!amountHalalah || amountHalalah <= 0) {
      throw new Error(`Invalid payment amount: ${amountHalalah}`)
    }
    assertMoyasarCheckoutChargeHalalah(amountHalalah, 'checkout:moyasar:create-payment')

    const appUrl = process.env.NEXTAUTH_URL || process.env.APP_URL || 'http://localhost:3000'
    const callbackUrl = `${appUrl}/api/checkout/moyasar/callback?bookingId=${booking.id}`

    logger.info('Moyasar create-payment request', {
      event: 'moyasar.checkout.create_payment',
      requestId,
      bookingId: booking.id,
      bookingNumber: booking.bookingNumber,
      subtotalExVatSar,
      vatSar,
      grandTotalSar,
      rawAmountHalalah: amountHalalah,
      currency: 'SAR',
    })

    const client = new MoyasarClient(apiKey)
    const payment = await client.createPaymentWithToken({
      amount: amountHalalah,
      currency: 'SAR',
      callback_url: callbackUrl,
      description: `Booking ${booking.bookingNumber}`,
      metadata: { booking_id: booking.id },
      token,
    })

    logger.info('Moyasar create-payment response', {
      event: 'moyasar.checkout.create_payment_response',
      requestId,
      bookingId: booking.id,
      paymentId: payment.id,
      paymentStatus: payment.status,
      paymentAmountHalalah: payment.amount,
    })

    return NextResponse.json(payment)
  } catch (error) {
    const message =
      error instanceof Error && error.message.trim().length > 0
        ? error.message
        : 'Failed to create Moyasar payment'

    logger.error('Moyasar create-payment failed', {
      event: 'moyasar.checkout.create_payment_failed',
      requestId,
      error: message,
    })

    return NextResponse.json({ error: message, requestId }, { status: 500 })
  }
}
