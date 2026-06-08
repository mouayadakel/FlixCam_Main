/**
 * Shared rental day calculation (weekend logic: Fri–Mon counts as 1 day).
 * Used by cart, quotes, invoices, and unified pricing.
 */

export function calculateRentalDays(startDate: Date, endDate: Date): number {
  let days = 0
  const current = new Date(startDate)

  while (current < endDate) {
    const dayOfWeek = current.getDay()

    if (dayOfWeek === 5) {
      const nextDay = new Date(current)
      nextDay.setDate(nextDay.getDate() + 1)
      if (nextDay.getDay() === 6 && nextDay < endDate) {
        current.setDate(current.getDate() + 3)
        days += 1
        continue
      }
    }

    days += 1
    current.setDate(current.getDate() + 1)
  }

  return Math.max(1, days)
}
