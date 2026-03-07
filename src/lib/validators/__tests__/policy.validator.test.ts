/**
 * Unit tests for policy.validator
 */

import {
  createPolicySchema,
  updatePolicySchema,
  reorderPolicySchema,
} from '../policy.validator'

describe('policy.validator', () => {
  describe('createPolicySchema', () => {
    it('accepts valid input', () => {
      const result = createPolicySchema.safeParse({
        titleAr: 'سياسة الإيجار',
        titleEn: 'Rental Policy',
        bodyAr: 'نص السياسة بالعربية',
        bodyEn: 'Policy body in English',
      })
      expect(result.success).toBe(true)
    })
    it('accepts with optional titleZh and bodyZh', () => {
      const result = createPolicySchema.safeParse({
        titleAr: 'Title',
        titleEn: 'Title',
        bodyAr: 'Body',
        bodyEn: 'Body',
        titleZh: '标题',
        bodyZh: '内容',
        order: 1,
        isActive: true,
      })
      expect(result.success).toBe(true)
    })
    it('accepts empty string for optional zh fields', () => {
      const result = createPolicySchema.safeParse({
        titleAr: 'Title',
        titleEn: 'Title',
        bodyAr: 'Body',
        bodyEn: 'Body',
        titleZh: '',
        bodyZh: '',
      })
      expect(result.success).toBe(true)
    })
    it('rejects empty titleAr', () => {
      const result = createPolicySchema.safeParse({
        titleAr: '',
        titleEn: 'Title',
        bodyAr: 'Body',
        bodyEn: 'Body',
      })
      expect(result.success).toBe(false)
    })
    it('rejects empty titleEn', () => {
      const result = createPolicySchema.safeParse({
        titleAr: 'Title',
        titleEn: '',
        bodyAr: 'Body',
        bodyEn: 'Body',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('updatePolicySchema', () => {
    it('accepts partial update', () => {
      const result = updatePolicySchema.safeParse({ titleEn: 'Updated' })
      expect(result.success).toBe(true)
    })
    it('accepts empty object', () => {
      const result = updatePolicySchema.safeParse({})
      expect(result.success).toBe(true)
    })
  })

  describe('reorderPolicySchema', () => {
    it('accepts empty array', () => {
      const result = reorderPolicySchema.safeParse({ policyIds: [] })
      expect(result.success).toBe(true)
    })
    it('accepts array of cuids', () => {
      const result = reorderPolicySchema.safeParse({
        policyIds: ['clxxxxxxxxxxxxxxxxxxxxxxxxxx', 'clxxxxxxxxxxxxxxxxxxxxxxxxxy'],
      })
      expect(result.success).toBe(true)
    })
    it('rejects invalid cuid', () => {
      const result = reorderPolicySchema.safeParse({
        policyIds: ['invalid'],
      })
      expect(result.success).toBe(false)
    })
  })
})
