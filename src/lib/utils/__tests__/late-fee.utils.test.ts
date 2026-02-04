/**
 * Unit tests for late fee calculation (Phase 8.1).
 */

import { computeLateFee } from '../late-fee.utils'

describe('late-fee.utils', () => {
  const endDate = new Date('2026-02-10T00:00:00Z')

  it('returns 0 when return date is on or before end date', () => {
    expect(computeLateFee(endDate, new Date('2026-02-10T00:00:00Z'), [{ quantity: 1, dailyRate: 100 }])).toBe(0)
    expect(computeLateFee(endDate, new Date('2026-02-09T23:59:00Z'), [{ quantity: 1, dailyRate: 100 }])).toBe(0)
  })

  it('computes 150% of daily rate for one item one day late', () => {
    const returnDate = new Date('2026-02-11T00:00:00Z')
    expect(computeLateFee(endDate, returnDate, [{ quantity: 1, dailyRate: 100 }])).toBe(150)
  })

  it('computes for multiple days late', () => {
    const returnDate = new Date('2026-02-13T00:00:00Z') // 3 days
    expect(computeLateFee(endDate, returnDate, [{ quantity: 1, dailyRate: 100 }])).toBe(3 * 150)
  })

  it('computes for quantity > 1', () => {
    const returnDate = new Date('2026-02-11T00:00:00Z')
    expect(computeLateFee(endDate, returnDate, [{ quantity: 2, dailyRate: 100 }])).toBe(300)
  })

  it('sums multiple items', () => {
    const returnDate = new Date('2026-02-11T00:00:00Z')
    const items = [
      { quantity: 1, dailyRate: 100 },
      { quantity: 1, dailyRate: 200 },
    ]
    expect(computeLateFee(endDate, returnDate, items)).toBe(150 + 300)
  })
})
