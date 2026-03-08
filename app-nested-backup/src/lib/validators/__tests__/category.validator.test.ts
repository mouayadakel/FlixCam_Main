/**
 * Unit tests for category.validator
 */

import { createCategorySchema, updateCategorySchema } from '../category.validator'

describe('category.validator', () => {
  describe('createCategorySchema', () => {
    it('accepts valid input', () => {
      const result = createCategorySchema.safeParse({ name: 'Cameras', slug: 'cameras' })
      expect(result.success).toBe(true)
    })

    it('rejects when name missing', () => {
      const result = createCategorySchema.safeParse({ slug: 'cameras' })
      expect(result.success).toBe(false)
    })

    it('rejects when name empty', () => {
      const result = createCategorySchema.safeParse({ name: '', slug: 'cameras' })
      expect(result.success).toBe(false)
    })

    it('rejects invalid slug format', () => {
      const result = createCategorySchema.safeParse({ name: 'Cameras', slug: 'Invalid_Slug' })
      expect(result.success).toBe(false)
    })

    it('accepts valid slug with hyphens', () => {
      const result = createCategorySchema.safeParse({ name: 'Cameras', slug: 'cinema-cameras' })
      expect(result.success).toBe(true)
    })

    it('accepts optional slug', () => {
      const result = createCategorySchema.safeParse({ name: 'Cameras' })
      expect(result.success).toBe(true)
    })
  })

  describe('updateCategorySchema', () => {
    it('accepts partial input', () => {
      const result = updateCategorySchema.safeParse({ name: 'Updated' })
      expect(result.success).toBe(true)
    })
  })
})
