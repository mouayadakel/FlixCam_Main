import {
  bookingPayableBreakdown,
  payableFromBookingExVatSubtotal,
  payableGrandTotalSar,
  toSarNumber,
} from '../checkout-totals'

const R15 = 0.15

describe('checkout-totals', () => {
  it('payableGrandTotalSar adds 15% VAT to ex-VAT net (e.g. 100 + 15 = 115)', () => {
    expect(payableGrandTotalSar(100, R15)).toBe(115)
  })

  it('payableFromBookingExVatSubtotal uses DB VAT when set', () => {
    expect(payableFromBookingExVatSubtotal(100, 15, R15)).toBe(115)
  })

  it('payableFromBookingExVatSubtotal recomputes VAT when DB has 0', () => {
    expect(payableFromBookingExVatSubtotal(4, 0, R15)).toBeCloseTo(4.6, 5)
  })

  it('bookingPayableBreakdown matches Moyasar halalah (15.00 SAR → 1500)', () => {
    const b = bookingPayableBreakdown(15, 0, R15)
    expect(b.grandTotalSar).toBeCloseTo(17.25, 2)
    expect(b.amountHalalah).toBe(1725)
  })

  it('toSarNumber parses string decimals from Prisma JSON', () => {
    expect(toSarNumber('15.00')).toBe(15)
    expect(toSarNumber(1)).toBe(1)
  })
})
