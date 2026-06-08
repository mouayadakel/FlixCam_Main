import { calculateRentalDays } from '@/lib/pricing/rental-days'

describe('calculateRentalDays', () => {
  it('counts calendar days for a mid-week range', () => {
    const start = new Date('2026-06-02T10:00:00')
    const end = new Date('2026-06-05T10:00:00')
    expect(calculateRentalDays(start, end)).toBe(3)
  })

  it('treats Fri–Mon as one rental day (weekend logic)', () => {
    const start = new Date('2026-06-05T10:00:00')
    const end = new Date('2026-06-08T10:00:00')
    expect(calculateRentalDays(start, end)).toBe(1)
  })

  it('returns at least 1 day for same-day rentals', () => {
    const start = new Date('2026-06-02T09:00:00')
    const end = new Date('2026-06-02T18:00:00')
    expect(calculateRentalDays(start, end)).toBe(1)
  })
})
