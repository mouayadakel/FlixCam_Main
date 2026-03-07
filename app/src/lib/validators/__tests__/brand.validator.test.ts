/**
 * Unit tests for brand.validator
 */

import { createBrandSchema, updateBrandSchema } from '../brand.validator'

describe('brand.validator', () => {
  describe('createBrandSchema', () => {
    it('accepts valid input with required name', () => {
      const result = createBrandSchema.safeParse({
        name: 'Sony',
      })
      expect(result.success).toBe(true)
    })
    it('accepts valid input with all optional fields', () => {
      const result = createBrandSchema.safeParse({
        name: 'Sony',
        slug: 'sony',
        description: 'Camera manufacturer',
        logoUrl: 'https://example.com/logo.png',
        website: 'https://sony.com',
      })
      expect(result.success).toBe(true)
    })
    it('accepts empty string for logoUrl and website', () => {
      const result = createBrandSchema.safeParse({
        name: 'Canon',
        logoUrl: '',
        website: '',
      })
      expect(result.success).toBe(true)
    })
    it('rejects when name empty', () => {
      const result = createBrandSchema.safeParse({
        name: '',
      })
      expect(result.success).toBe(false)
    })
    it('rejects when name over 120 chars', () => {
      const result = createBrandSchema.safeParse({
        name: 'a'.repeat(121),
      })
      expect(result.success).toBe(false)
    })
    it('rejects invalid logoUrl', () => {
      const result = createBrandSchema.safeParse({
        name: 'Sony',
        logoUrl: 'not-a-url',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('updateBrandSchema', () => {
    it('accepts partial update', () => {
      const result = updateBrandSchema.safeParse({
        name: 'Sony Updated',
      })
      expect(result.success).toBe(true)
    })
    it('accepts empty object', () => {
      const result = updateBrandSchema.safeParse({})
      expect(result.success).toBe(true)
    })
    it('rejects invalid name when provided', () => {
      const result = updateBrandSchema.safeParse({
        name: '',
      })
      expect(result.success).toBe(false)
    })
  })
})
