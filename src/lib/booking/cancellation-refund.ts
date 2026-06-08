/**
 * Cancellation refund policy — shared between admin and portal cancel routes.
 */

export const FULL_REFUND_WINDOW_HOURS = 48
export const PARTIAL_REFUND_WINDOW_HOURS = 24
export const PARTIAL_REFUND_PERCENT = 50

export function calculateCancellationRefund(booking: {
  startDate: Date
  totalAmount: number | { toString(): string }
}): {
  refundPercentage: number
  refundAmountSar: number
  message: string
} {
  const now = Date.now()
  const hoursUntilStart =
    (new Date(booking.startDate).getTime() - now) / (1000 * 60 * 60)
  const totalAmount = Number(booking.totalAmount)

  if (hoursUntilStart >= FULL_REFUND_WINDOW_HOURS) {
    return {
      refundPercentage: 100,
      refundAmountSar: totalAmount,
      message: 'Full refund will be processed.',
    }
  }

  if (hoursUntilStart >= PARTIAL_REFUND_WINDOW_HOURS) {
    const refundAmountSar = Math.round(((totalAmount * PARTIAL_REFUND_PERCENT) / 100) * 100) / 100
    return {
      refundPercentage: PARTIAL_REFUND_PERCENT,
      refundAmountSar,
      message: 'Partial refund (50%) will be processed.',
    }
  }

  return {
    refundPercentage: 0,
    refundAmountSar: 0,
    message: 'No refund applicable for cancellations within 24 hours of start.',
  }
}
