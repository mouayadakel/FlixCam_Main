/**
 * Unit tests for pricing-rule.validator
 */

import {
  createPricingRuleSchema,
  updatePricingRuleSchema,
  previewPricingSchema,
} from '../pricing-rule.validator'

const validCuid = 'clxxxxxxxxxxxxxxxxxxxxxxxxxx'

describe('pricing-rule.validator', () => {
  describe('createPricingRuleSchema', () => {
    it('accepts valid input', () => {
      const result = createPricingRuleSchema.safeParse({
        name: 'Summer Discount',
        ruleType: 'SEASONAL',
        conditions: {},
        adjustmentType: 'PERCENTAGE',
        adjustmentValue: 10,
      })
      expect(result.success).toBe(true)
    })
    it('accepts with full conditions', () => {
      const result = createPricingRuleSchema.safeParse({
        name: 'Rule',
        ruleType: 'DURATION',
        conditions: {
          dateRange: { start: '2026-01-01T00:00:00Z', end: '2026-12-31T00:00:00Z' },
          daysOfWeek: [0, 6],
          minDuration: 3,
          maxDuration: 14,
          customerSegmentIds: [validCuid],
          equipmentCategoryIds: [validCuid],
          studioIds: [validCuid],
          bookDaysAhead: 7,
        },
        adjustmentType: 'FIXED',
        adjustmentValue: -50,
        isActive: true,
        validFrom: '2026-01-01T00:00:00Z',
        validUntil: '2026-12-31T00:00:00Z',
      })
      expect(result.success).toBe(true)
    })
    it('rejects invalid ruleType', () => {
      const result = createPricingRuleSchema.safeParse({
        name: 'Rule',
        ruleType: 'INVALID',
        conditions: {},
        adjustmentType: 'PERCENTAGE',
        adjustmentValue: 10,
      })
      expect(result.success).toBe(false)
    })
    it('rejects invalid adjustmentType', () => {
      const result = createPricingRuleSchema.safeParse({
        name: 'Rule',
        ruleType: 'SEASONAL',
        conditions: {},
        adjustmentType: 'INVALID',
        adjustmentValue: 10,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('updatePricingRuleSchema', () => {
    it('accepts partial update', () => {
      const result = updatePricingRuleSchema.safeParse({ name: 'Updated' })
      expect(result.success).toBe(true)
    })
  })

  describe('previewPricingSchema', () => {
    it('accepts valid input', () => {
      const result = previewPricingSchema.safeParse({
        equipmentIds: [validCuid],
        startDate: '2026-06-01T00:00:00Z',
        endDate: '2026-06-07T00:00:00Z',
      })
      expect(result.success).toBe(true)
    })
    it('accepts with optional fields', () => {
      const result = previewPricingSchema.safeParse({
        equipmentIds: [],
        studioId: validCuid,
        startDate: '2026-06-01T00:00:00Z',
        endDate: '2026-06-07T00:00:00Z',
        customerId: validCuid,
      })
      expect(result.success).toBe(true)
    })
  })
})
