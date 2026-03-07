/**
 * Unit tests for studio-faq.validator
 */

import {
  createStudioFaqSchema,
  updateStudioFaqSchema,
  reorderStudioFaqSchema,
} from '../studio-faq.validator'

describe('studio-faq.validator', () => {
  describe('createStudioFaqSchema', () => {
    it('accepts valid input', () => {
      const result = createStudioFaqSchema.safeParse({
        questionAr: 'ما هي ساعات العمل؟',
        answerAr: 'من 9 صباحاً إلى 6 مساءً',
      })
      expect(result.success).toBe(true)
    })
    it('accepts with optional fields', () => {
      const result = createStudioFaqSchema.safeParse({
        questionAr: 'Q',
        answerAr: 'A',
        questionEn: 'What are the hours?',
        answerEn: '9am to 6pm',
        questionZh: '',
        answerZh: '',
        order: 1,
        isActive: true,
      })
      expect(result.success).toBe(true)
    })
    it('rejects empty questionAr', () => {
      const result = createStudioFaqSchema.safeParse({
        questionAr: '',
        answerAr: 'Answer',
      })
      expect(result.success).toBe(false)
    })
    it('rejects empty answerAr', () => {
      const result = createStudioFaqSchema.safeParse({
        questionAr: 'Question',
        answerAr: '',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('updateStudioFaqSchema', () => {
    it('accepts partial update', () => {
      const result = updateStudioFaqSchema.safeParse({
        questionEn: 'Updated',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('reorderStudioFaqSchema', () => {
    it('accepts empty array', () => {
      const result = reorderStudioFaqSchema.safeParse({ faqIds: [] })
      expect(result.success).toBe(true)
    })
    it('accepts array of cuids', () => {
      const result = reorderStudioFaqSchema.safeParse({
        faqIds: ['clxxxxxxxxxxxxxxxxxxxxxxxxxx'],
      })
      expect(result.success).toBe(true)
    })
  })
})
