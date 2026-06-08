import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { CartService } from '@/lib/services/cart.service'
import { calculateVAT, getVATRate } from '@/lib/vat'
import {
  bookingPayableBreakdown,
  type BookingPayableBreakdown,
  toSarNumber,
} from '@/lib/utils/checkout-totals'

interface ResolveBookingPaymentTotalsInput {
  bookingId: string
  bookingNumber?: string
  cartId?: string | null
  storedSubtotalExVat: unknown
  storedVat: unknown
  updatedBy?: string
  requestId?: string
}

interface ResolveBookingPaymentTotalsResult {
  subtotalExVatSar: number
  vatSar: number
  paymentSummary: BookingPayableBreakdown
  syncedBookingTotals: boolean
}

export async function resolveAuthoritativeBookingPaymentTotals(
  input: ResolveBookingPaymentTotalsInput
): Promise<ResolveBookingPaymentTotalsResult> {
  const storedSubtotalExVatSar = toSarNumber(input.storedSubtotalExVat)
  const storedVatSar = toSarNumber(input.storedVat)

  const rateDecimal = await getVATRate()
  const vatRateNum = rateDecimal.toNumber()

  let subtotalExVatSar = storedSubtotalExVatSar
  let vatSar =
    storedVatSar > 0 ? storedVatSar : calculateVAT(storedSubtotalExVatSar, rateDecimal).toNumber()

  if (input.cartId) {
    const refreshedCart = await CartService.refreshTotalsFromLineItems(input.cartId)
    subtotalExVatSar = toSarNumber(refreshedCart.total)
    vatSar = calculateVAT(subtotalExVatSar, rateDecimal).toNumber()
  }

  const syncedBookingTotals =
    Math.abs(subtotalExVatSar - storedSubtotalExVatSar) > 0.01 ||
    Math.abs(vatSar - storedVatSar) > 0.01

  if (syncedBookingTotals) {
    await prisma.booking.update({
      where: { id: input.bookingId },
      data: {
        totalAmount: subtotalExVatSar,
        vatAmount: vatSar,
        updatedBy: input.updatedBy,
      },
    })

    logger.warn('checkout: synced stale booking totals from authoritative amount source', {
      event: 'checkout.booking_total_synced',
      requestId: input.requestId,
      bookingId: input.bookingId,
      bookingNumber: input.bookingNumber,
      cartId: input.cartId,
      storedSubtotalExVatSar,
      storedVatSar,
      authoritativeSubtotalExVatSar: subtotalExVatSar,
      authoritativeVatSar: vatSar,
      authoritativeGrandTotalSar: bookingPayableBreakdown(subtotalExVatSar, vatSar, vatRateNum)
        .grandTotalSar,
    })
  }

  return {
    subtotalExVatSar,
    vatSar,
    paymentSummary: bookingPayableBreakdown(subtotalExVatSar, vatSar, vatRateNum),
    syncedBookingTotals,
  }
}
