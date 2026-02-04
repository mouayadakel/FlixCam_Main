/**
 * Late return fee calculation (150% of daily rate per late day). Phase 4.5 / 8.1.
 */

export interface LateFeeItem {
  quantity: number
  dailyRate: number
}

/**
 * Compute total late fee for items returned after endDate.
 * Fee = 1.5 × (sum of quantity × dailyRate per item) × lateDays.
 */
export function computeLateFee(
  endDate: Date,
  actualReturnDate: Date,
  items: LateFeeItem[]
): number {
  if (actualReturnDate <= endDate) return 0
  const lateMs = actualReturnDate.getTime() - endDate.getTime()
  const lateDays = Math.ceil(lateMs / (24 * 60 * 60 * 1000))
  let total = 0
  for (const item of items) {
    total += item.quantity * item.dailyRate * lateDays * 1.5
  }
  return total
}
