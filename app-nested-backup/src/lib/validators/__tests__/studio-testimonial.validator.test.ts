/**
 * Unit tests for studio-testimonial.validator
 */

import {
  createStudioTestimonialSchema,
  updateStudioTestimonialSchema,
} from '../studio-testimonial.validator'

describe('studio-testimonial.validator', () => {
  describe('createStudioTestimonialSchema', () => {
    it('accepts valid input', () => {
      const result = createStudioTestimonialSchema.safeParse({
        name: 'John Doe',
        text: 'Great studio!',
      })
      expect(result.success).toBe(true)
    })
    it('accepts with optional fields', () => {
      const result = createStudioTestimonialSchema.safeParse({
        name: 'Jane',
        role: 'Director',
        text: 'Amazing',
        rating: 5,
        avatarUrl: 'https://example.com/avatar.jpg',
        order: 1,
        isActive: true,
      })
      expect(result.success).toBe(true)
    })
    it('rejects empty name', () => {
      const result = createStudioTestimonialSchema.safeParse({
        name: '',
        text: 'Text',
      })
      expect(result.success).toBe(false)
    })
    it('rejects empty text', () => {
      const result = createStudioTestimonialSchema.safeParse({
        name: 'John',
        text: '',
      })
      expect(result.success).toBe(false)
    })
    it('rejects invalid avatarUrl', () => {
      const result = createStudioTestimonialSchema.safeParse({
        name: 'John',
        text: 'Text',
        avatarUrl: 'not-a-url',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('updateStudioTestimonialSchema', () => {
    it('accepts partial update', () => {
      const result = updateStudioTestimonialSchema.safeParse({
        text: 'Updated text',
      })
      expect(result.success).toBe(true)
    })
    it('accepts empty object', () => {
      const result = updateStudioTestimonialSchema.safeParse({})
      expect(result.success).toBe(true)
    })
  })
})
