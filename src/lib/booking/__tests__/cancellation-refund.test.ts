import {
  calculateCancellationRefund,
  FULL_REFUND_WINDOW_HOURS,
  PARTIAL_REFUND_WINDOW_HOURS,
} from '@/lib/booking/cancellation-refund'

describe('calculateCancellationRefund', () => {
  const totalAmount = 1000

  it('returns full refund when start is beyond full refund window', () => {
    const startDate = new Date(Date.now() + (FULL_REFUND_WINDOW_HOURS + 1) * 60 * 60 * 1000)
    const result = calculateCancellationRefund({ startDate, totalAmount })
    expect(result.refundPercentage).toBe(100)
    expect(result.refundAmountSar).toBe(1000)
  })

  it('returns partial refund between partial and full windows', () => {
    const startDate = new Date(
      Date.now() + (PARTIAL_REFUND_WINDOW_HOURS + 1) * 60 * 60 * 1000
    )
    const result = calculateCancellationRefund({ startDate, totalAmount })
    expect(result.refundPercentage).toBe(50)
    expect(result.refundAmountSar).toBe(500)
  })

  it('returns no refund within partial window', () => {
    const startDate = new Date(Date.now() + 12 * 60 * 60 * 1000)
    const result = calculateCancellationRefund({ startDate, totalAmount })
    expect(result.refundPercentage).toBe(0)
    expect(result.refundAmountSar).toBe(0)
  })
})
