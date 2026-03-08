/**
 * Unit tests for hero-banner.validator
 */

import {
  createBannerSchema,
  updateBannerSchema,
  createSlideSchema,
  reorderSlidesSchema,
} from '../hero-banner.validator'

describe('hero-banner.validator', () => {
  describe('createBannerSchema', () => {
    it('accepts valid input', () => {
      const result = createBannerSchema.safeParse({
        name: 'Home Banner',
        pageSlug: 'home',
      })
      expect(result.success).toBe(true)
    })
    it('rejects invalid pageSlug', () => {
      const result = createBannerSchema.safeParse({
        name: 'Banner',
        pageSlug: 'Invalid_Slug',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('createSlideSchema', () => {
    it('accepts valid input', () => {
      const result = createSlideSchema.safeParse({
        imageUrl: 'https://example.com/slide.jpg',
        titleAr: 'عنوان',
        titleEn: 'Title',
      })
      expect(result.success).toBe(true)
    })
    it('rejects when imageUrl invalid', () => {
      const result = createSlideSchema.safeParse({
        imageUrl: 'invalid',
        titleAr: 'عنوان',
        titleEn: 'Title',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('reorderSlidesSchema', () => {
    it('accepts empty array', () => {
      const result = reorderSlidesSchema.safeParse({ slideIds: [] })
      expect(result.success).toBe(true)
    })
  })
})
