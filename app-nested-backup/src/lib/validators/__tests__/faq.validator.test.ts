/**
 * Unit tests for faq.validator
 */

import { createFaqSchema, updateFaqSchema, reorderFaqSchema } from '../faq.validator'

describe('faq.validator', () => {
  const validCreate = {
    questionAr: 'سؤال',
    questionEn: 'Question',
    answerAr: 'جواب',
    answerEn: 'Answer',
  }

  describe('createFaqSchema', () => {
    it('accepts valid input', () => {
      const result = createFaqSchema.safeParse(validCreate)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.order).toBe(0)
        expect(result.data.isActive).toBe(true)
      }
    })

    it('rejects when questionAr missing', () => {
      const result = createFaqSchema.safeParse({ ...validCreate, questionAr: '' })
      expect(result.success).toBe(false)
    })

    it('rejects when questionEn missing', () => {
      const result = createFaqSchema.safeParse({ ...validCreate, questionEn: '' })
      expect(result.success).toBe(false)
    })

    it('rejects when answerAr missing', () => {
      const result = createFaqSchema.safeParse({ ...validCreate, answerAr: '' })
      expect(result.success).toBe(false)
    })

    it('rejects when answerEn missing', () => {
      const result = createFaqSchema.safeParse({ ...validCreate, answerEn: '' })
      expect(result.success).toBe(false)
    })

    it('accepts optional order and isActive', () => {
      const result = createFaqSchema.safeParse({ ...validCreate, order: 5, isActive: false })
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.order).toBe(5)
        expect(result.data.isActive).toBe(false)
      }
    })
  })

  describe('updateFaqSchema', () => {
    it('accepts partial input', () => {
      const result = updateFaqSchema.safeParse({ questionEn: 'Updated' })
      expect(result.success).toBe(true)
    })

    it('accepts empty object', () => {
      const result = updateFaqSchema.safeParse({})
      expect(result.success).toBe(true)
    })
  })

  describe('reorderFaqSchema', () => {
    it('accepts array of cuid strings', () => {
      const result = reorderFaqSchema.safeParse({ faqIds: ['clxxxxxxxxxxxxxxxxxxxxxxxxx'] })
      expect(result.success).toBe(true)
    })

    it('accepts empty array', () => {
      const result = reorderFaqSchema.safeParse({ faqIds: [] })
      expect(result.success).toBe(true)
    })
  })
})
