/**
 * Unit tests for customer-segment.validator
 */

import {
  createCustomerSegmentSchema,
  updateCustomerSegmentSchema,
} from '../customer-segment.validator'

describe('customer-segment.validator', () => {
  describe('createCustomerSegmentSchema', () => {
    it('accepts valid input with required name', () => {
      const result = createCustomerSegmentSchema.safeParse({
        name: 'VIP Customers',
      })
      expect(result.success).toBe(true)
    })
    it('accepts valid input with all optional fields', () => {
      const result = createCustomerSegmentSchema.safeParse({
        name: 'VIP',
        slug: 'vip-customers',
        description: 'High-value customers',
        discountPercent: 10,
        priorityBooking: true,
        extendedTerms: true,
        autoAssignRules: { minSpend: 1000 },
      })
      expect(result.success).toBe(true)
    })
    it('accepts empty slug (optional)', () => {
      const result = createCustomerSegmentSchema.safeParse({
        name: 'Standard',
        slug: undefined,
      })
      expect(result.success).toBe(true)
    })
    it('rejects invalid slug format', () => {
      const result = createCustomerSegmentSchema.safeParse({
        name: 'Test',
        slug: 'Invalid_Slug',
      })
      expect(result.success).toBe(false)
    })
    it('rejects when name empty', () => {
      const result = createCustomerSegmentSchema.safeParse({ name: '' })
      expect(result.success).toBe(false)
    })
    it('rejects discountPercent over 100', () => {
      const result = createCustomerSegmentSchema.safeParse({
        name: 'Test',
        discountPercent: 101,
      })
      expect(result.success).toBe(false)
    })
  })

  describe('updateCustomerSegmentSchema', () => {
    it('accepts partial update', () => {
      const result = updateCustomerSegmentSchema.safeParse({ name: 'Updated' })
      expect(result.success).toBe(true)
    })
    it('accepts empty object', () => {
      const result = updateCustomerSegmentSchema.safeParse({})
      expect(result.success).toBe(true)
    })
  })
})
