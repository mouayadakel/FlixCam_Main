/**
 * Unit tests for reports.validator
 */

import {
  reportTypeSchema,
  reportPeriodSchema,
  reportFilterSchema,
} from '../reports.validator'

describe('reports.validator', () => {
  describe('reportTypeSchema', () => {
    it('accepts valid types', () => {
      expect(reportTypeSchema.safeParse('revenue').success).toBe(true)
      expect(reportTypeSchema.safeParse('bookings').success).toBe(true)
    })
    it('rejects invalid type', () => {
      expect(reportTypeSchema.safeParse('invalid').success).toBe(false)
    })
  })

  describe('reportPeriodSchema', () => {
    it('accepts valid periods', () => {
      expect(reportPeriodSchema.safeParse('monthly').success).toBe(true)
    })
  })

  describe('reportFilterSchema', () => {
    it('accepts valid filter', () => {
      const result = reportFilterSchema.safeParse({
        dateFrom: '2026-01-01',
        dateTo: '2026-12-31',
      })
      expect(result.success).toBe(true)
    })
    it('accepts when dateTo equals dateFrom', () => {
      const result = reportFilterSchema.safeParse({
        dateFrom: '2026-01-15',
        dateTo: '2026-01-15',
      })
      expect(result.success).toBe(true)
    })
    it('rejects when dateTo before dateFrom', () => {
      const result = reportFilterSchema.safeParse({
        dateFrom: '2026-12-31',
        dateTo: '2026-01-01',
      })
      expect(result.success).toBe(false)
    })
    it('accepts optional period, equipmentIds, includeCancelled', () => {
      const result = reportFilterSchema.safeParse({
        dateFrom: '2026-01-01',
        dateTo: '2026-12-31',
        period: 'monthly',
        equipmentIds: ['eq1'],
        includeCancelled: true,
      })
      expect(result.success).toBe(true)
    })
  })
})
