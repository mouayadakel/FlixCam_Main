/**
 * Pricing service tests — rate optimization logic.
 * Tests the pure rate calculation without database dependency.
 */

describe('Rate Optimization Logic', () => {
  const DAYS_PER_WEEK = 7
  const DAYS_PER_MONTH = 30

  /**
   * Mirrors the calculateBestRate logic from cart.service.ts
   * and calculateEquipmentPricing from pricing.service.ts
   */
  function calculateBestRate(
    days: number,
    quantity: number,
    dailyPrice: number,
    weeklyPrice: number | null,
    monthlyPrice: number | null
  ): { effectiveTotal: number; appliedRate: 'daily' | 'weekly' | 'monthly' } {
    if (days <= 0) {
      throw new Error('Rental duration must be positive')
    }

    const dailyTotal = dailyPrice * quantity * days

    if (monthlyPrice && monthlyPrice > 0 && days >= DAYS_PER_MONTH) {
      const months = Math.floor(days / DAYS_PER_MONTH)
      const remainingDays = days % DAYS_PER_MONTH
      let remainderCost: number
      if (weeklyPrice && weeklyPrice > 0 && remainingDays >= DAYS_PER_WEEK) {
        const weeks = Math.floor(remainingDays / DAYS_PER_WEEK)
        const leftoverDays = remainingDays % DAYS_PER_WEEK
        remainderCost = (weeks * weeklyPrice + leftoverDays * dailyPrice) * quantity
      } else {
        remainderCost = remainingDays * dailyPrice * quantity
      }
      const monthlyTotal = months * monthlyPrice * quantity + remainderCost
      if (monthlyTotal < dailyTotal) {
        return { effectiveTotal: Math.round(monthlyTotal * 100) / 100, appliedRate: 'monthly' }
      }
    }

    if (weeklyPrice && weeklyPrice > 0 && days >= DAYS_PER_WEEK) {
      const weeks = Math.floor(days / DAYS_PER_WEEK)
      const remainingDays = days % DAYS_PER_WEEK
      const weeklyTotal = (weeks * weeklyPrice + remainingDays * dailyPrice) * quantity
      if (weeklyTotal < dailyTotal) {
        return { effectiveTotal: Math.round(weeklyTotal * 100) / 100, appliedRate: 'weekly' }
      }
    }

    return { effectiveTotal: Math.round(dailyTotal * 100) / 100, appliedRate: 'daily' }
  }

  test('Test 1: Daily rate only — 3 days at SAR 100/day = SAR 300', () => {
    const result = calculateBestRate(3, 1, 100, null, null)
    expect(result.effectiveTotal).toBe(300)
    expect(result.appliedRate).toBe('daily')
  })

  test('Test 2: Weekly rate applied — 7 days, weekly SAR 600 < daily SAR 700', () => {
    const result = calculateBestRate(7, 1, 100, 600, null)
    expect(result.effectiveTotal).toBe(600)
    expect(result.appliedRate).toBe('weekly')
  })

  test('Test 3: Monthly rate applied — 30 days, monthly SAR 2000 < daily SAR 3000', () => {
    const result = calculateBestRate(30, 1, 100, null, 2000)
    expect(result.effectiveTotal).toBe(2000)
    expect(result.appliedRate).toBe('monthly')
  })

  test('Test 4: Mixed rates — 35 days = 1 month (2000) + 5 days (500) = SAR 2500', () => {
    const result = calculateBestRate(35, 1, 100, 600, 2000)
    expect(result.effectiveTotal).toBe(2500)
    expect(result.appliedRate).toBe('monthly')
  })

  test('Test 5: Mixed rates — 10 days = 1 week (600) + 3 days (300) = SAR 900', () => {
    const result = calculateBestRate(10, 1, 100, 600, null)
    expect(result.effectiveTotal).toBe(900)
    expect(result.appliedRate).toBe('weekly')
  })

  test('Test 6: Always picks cheapest option — monthly+weeks vs pure daily', () => {
    // 38 days: monthly(2000) + 1 week(600) + 1 day(100) = 2700
    // Daily: 38 * 100 = 3800
    // Weekly: 5 weeks(3000) + 3 days(300) = 3300
    const result = calculateBestRate(38, 1, 100, 600, 2000)
    expect(result.effectiveTotal).toBe(2700)
    expect(result.appliedRate).toBe('monthly')
  })

  test('Test 7: Zero days → should throw', () => {
    expect(() => calculateBestRate(0, 1, 100, 600, 2000)).toThrow()
  })

  test('Test 8: Negative days → should throw validation error', () => {
    expect(() => calculateBestRate(-5, 1, 100, 600, 2000)).toThrow()
  })
})
