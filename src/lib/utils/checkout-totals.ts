/**
 * @file checkout-totals.ts
 * @description Cart `total` is subtotal after discount, EXCLUDING VAT. Grand total = net + VAT.
 * @remarks Pass `vatRate` from `getVATRate()` on the server or `/api/public/vat-rate` on the client.
 */

import { sarToMoyasarHalalah } from '@/lib/utils/moyasar-amount'

export function vatFromSubtotalExVat(subtotalExVat: number, vatRate: number): number {
  return Math.round(subtotalExVat * vatRate * 100) / 100
}

/**
 * @param subtotalExVat - Same as `cart.total`: sum of line subtotals minus coupon, before VAT.
 * @param vatRate - Decimal rate (e.g. 0.15 for 15%).
 */
export function payableGrandTotalSar(subtotalExVat: number, vatRate: number): number {
  const vat = vatFromSubtotalExVat(subtotalExVat, vatRate)
  return Math.round((subtotalExVat + vat) * 100) / 100
}

export interface BookingPayableBreakdown {
  /** ex-VAT net (same convention as `booking.totalAmount`) */
  subtotalExVatSar: number
  vatSar: number
  /** Amount to collect (matches Moyasar `amount` / 100) */
  grandTotalSar: number
  /** Moyasar `amount` field (halalah) */
  amountHalalah: number
}

/**
 * @param subtotalExVat - Booking `totalAmount` when stored ex-VAT.
 * @param vatAmount - VAT portion already stored on the booking; if 0, recomputed from subtotal using `vatRate`.
 */
export function payableFromBookingExVatSubtotal(
  subtotalExVat: number,
  vatAmount: number,
  vatRate: number
): number {
  return bookingPayableBreakdown(subtotalExVat, vatAmount, vatRate).grandTotalSar
}

/**
 * Ex-VAT subtotal, VAT line, and grand total — same numbers as `initiate-payment` and Moyasar charge.
 */
export function bookingPayableBreakdown(
  subtotalExVat: number,
  vatStored: number,
  vatRate: number
): BookingPayableBreakdown {
  const vat = vatStored > 0 ? vatStored : vatFromSubtotalExVat(subtotalExVat, vatRate)
  const grandTotalSar = Math.round((subtotalExVat + vat) * 100) / 100
  return {
    subtotalExVatSar: subtotalExVat,
    vatSar: vat,
    grandTotalSar,
    amountHalalah: sarToMoyasarHalalah(grandTotalSar),
  }
}

/**
 * Prisma `Decimal` and JSON may arrive as `number` or `string`.
 */
export function toSarNumber(value: unknown): number {
  if (value == null) return 0
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const n = Number(value)
    return Number.isFinite(n) ? n : 0
  }
  if (typeof value === 'object' && value !== null) {
    const s = String(value)
    const n = Number(s)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}
