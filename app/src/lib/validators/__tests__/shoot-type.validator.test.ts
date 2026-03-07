/**
 * Unit tests for shoot-type.validator
 */
import {
  budgetTierSchema,
  createShootTypeSchema,
  updateShootTypeSchema,
} from '../shoot-type.validator'

describe('shoot-type.validator', () => {
  const validCreate = {
    name: 'Commercial',
    slug: 'commercial',
    questionnaire: [],
  }

  describe('budgetTierSchema', () => {
    it('accepts ESSENTIAL, PROFESSIONAL, PREMIUM', () => {
      expect(budgetTierSchema.safeParse('ESSENTIAL').success).toBe(true)
      expect(budgetTierSchema.safeParse('PROFESSIONAL').success).toBe(true)
    })
  })

  describe('createShootTypeSchema', () => {
    it('accepts valid input', () => {
      expect(createShootTypeSchema.safeParse(validCreate).success).toBe(true)
    })
    it('rejects empty name', () => {
      expect(createShootTypeSchema.safeParse({ ...validCreate, name: '' }).success).toBe(false)
    })
    it('rejects invalid slug', () => {
      expect(createShootTypeSchema.safeParse({ ...validCreate, slug: 'Invalid Slug' }).success).toBe(false)
    })
  })

  describe('updateShootTypeSchema', () => {
    it('accepts partial input with id', () => {
      expect(updateShootTypeSchema.safeParse({ id: 'st-1', name: 'Updated' }).success).toBe(true)
    })
  })
})
