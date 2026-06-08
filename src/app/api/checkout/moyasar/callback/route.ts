import { NextRequest, NextResponse } from 'next/server'
import { PaymentGatewayConfigService } from '@/lib/services/payment-gateway-config.service'
import { MoyasarClient } from '@/lib/integrations/moyasar/client'
import { logger } from '@/lib/logger'
import { PaymentService } from '@/lib/services/payment.service'

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams
  const bookingId = params.get('bookingId')
  const paymentId = params.get('id') || params.get('payment_id') || params.get('paymentId')
  const appUrl = process.env.NEXTAUTH_URL || process.env.APP_URL || 'http://localhost:3000'

  if (!bookingId) {
    return NextResponse.redirect(`${appUrl}/portal/bookings`)
  }

  if (!paymentId) {
    return NextResponse.redirect(`${appUrl}/booking/confirmation/${bookingId}?paymentStatus=pending`)
  }

  try {
    const config = await PaymentGatewayConfigService.getConfig('moyasar')
    const secretKey =
      process.env.MOYASAR_SECRET_KEY?.trim() || config?.secretKey
    if (!secretKey) {
      return NextResponse.redirect(`${appUrl}/booking/confirmation/${bookingId}?paymentStatus=unknown`)
    }

    const client = new MoyasarClient(secretKey)
    const payment = await client.getPayment(paymentId)
    const metadataBookingId = payment.metadata?.booking_id || payment.metadata?.bookingId

    if (!metadataBookingId || metadataBookingId !== bookingId) {
      logger.error('Moyasar callback rejected because payment metadata does not match booking', {
        requestedBookingId: bookingId,
        metadataBookingId: metadataBookingId ?? null,
        paymentId: payment.id,
        status: payment.status,
      })
      return NextResponse.redirect(
        `${appUrl}/booking/confirmation/${bookingId}?paymentStatus=metadata_mismatch`
      )
    }

    try {
      await PaymentService.handleGatewayWebhook('moyasar', {
        type: payment.status,
        bookingId: metadataBookingId,
        amount: payment.amount,
        externalId: payment.id,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      logger.warn('Moyasar callback could not reconcile payment immediately', {
        bookingId,
        paymentId,
        status: payment.status,
        error: message,
      })
      if (message.toLowerCase().includes('amount mismatch')) {
        return NextResponse.redirect(
          `${appUrl}/booking/confirmation/${bookingId}?paymentStatus=amount_mismatch`
        )
      }
    }

    return NextResponse.redirect(
      `${appUrl}/booking/confirmation/${bookingId}?paymentStatus=${encodeURIComponent(payment.status)}`
    )
  } catch {
    return NextResponse.redirect(`${appUrl}/booking/confirmation/${bookingId}?paymentStatus=unknown`)
  }
}
