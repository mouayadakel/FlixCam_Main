/**
 * Unit tests for coupon.validator
 */
import {
  couponTypeSchema,
  couponStatusSchema,
  createCouponSchema,
  updateCouponSchema,
} from '../coupon.validator'

describe('coupon.validator', () => {
  const validCreate = {
    code: 'SAVE10',
    type: 'percent' as const,
    value: 10,
    validFrom: new Date('2026-01-01'),
    validUntil: new Date('2026-12-31'),
  }

  describe('couponTypeSchema', () => {
    it('accepts percent and fixed', () => {
      expect(couponTypeSchema.safeParse('percent').success).toBe(true)
      expect(couponTypeSchema.safeParse('fixed').success).toBe(true)
    })
  })

  describe('createCouponSchema', () => {
    it('accepts valid input', () => {
      expect(createCouponSchema.safeParse(validCreate).success).toBe(true)
    })
    it('accepts percent value 100', () => {
      expect(createCouponSchema.safeParse({ ...validCreate, type: 'percent', value: 100 }).success).toBe(true)
    })
    it('accepts fixed type (value can exceed 100)', () => {
      expect(createCouponSchema.safeParse({ ...validCreate, type: 'fixed', value: 500 }).success).toBe(true)
    })
    it('rejects percent value > 100', () => {
      const result = createCouponSchema.safeParse({ ...validCreate, type: 'percent', value: 150 })
      expect(result.success).toBe(false)
    })
    it('rejects validUntil before validFrom', () => {
      const result = createCouponSchema.safeParse({
        ...validCreate,
        validFrom: new Date('2026-12-31'),
        validUntil: new Date('2026-01-01'),
      })
      expect(result.success).toBe(false)
    })
    it('rejects code too short', () => {
      expect(createCouponSchema.safeParse({ ...validCreate, code: 'AB' }).success).toBe(false)
    })
  })

  describe('updateCouponSchema', () => {
    it('accepts partial input', () => {
      expect(updateCouponSchema.safeParse({ code: 'NEW10' }).success).toBe(true)
    })
  })
})
