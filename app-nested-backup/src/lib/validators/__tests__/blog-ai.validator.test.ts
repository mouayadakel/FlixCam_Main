/**
 * Unit tests for blog-ai.validator
 */

import {
  generateOutlineSchema,
  generateDraftSchema,
  rewriteSchema,
  translateSchema,
  seoMetaSchema,
  altTextSchema,
  relatedPostsSchema,
} from '../blog-ai.validator'

describe('blog-ai.validator', () => {
  describe('generateOutlineSchema', () => {
    it('accepts valid input', () => {
      const result = generateOutlineSchema.safeParse({
        title: 'My Blog Post',
      })
      expect(result.success).toBe(true)
    })
    it('rejects empty title', () => {
      const result = generateOutlineSchema.safeParse({ title: '' })
      expect(result.success).toBe(false)
    })
  })

  describe('generateDraftSchema', () => {
    it('accepts valid input', () => {
      const result = generateDraftSchema.safeParse({
        outline: '1. Intro\n2. Body',
        title: 'Post',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('rewriteSchema', () => {
    it('accepts valid input', () => {
      const result = rewriteSchema.safeParse({
        content: 'Content to rewrite',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('translateSchema', () => {
    it('accepts valid input', () => {
      const result = translateSchema.safeParse({
        content: 'Hello',
        from: 'en',
        to: 'ar',
      })
      expect(result.success).toBe(true)
    })
    it('rejects invalid from/to', () => {
      const result = translateSchema.safeParse({
        content: 'Hello',
        from: 'fr',
        to: 'ar',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('seoMetaSchema', () => {
    it('accepts valid input', () => {
      const result = seoMetaSchema.safeParse({
        title: 'Title',
        content: 'Content',
      })
      expect(result.success).toBe(true)
    })
  })

  describe('altTextSchema', () => {
    it('accepts valid input', () => {
      const result = altTextSchema.safeParse({
        imageUrl: 'https://example.com/image.png',
      })
      expect(result.success).toBe(true)
    })
    it('rejects invalid url', () => {
      const result = altTextSchema.safeParse({
        imageUrl: 'not-a-url',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('relatedPostsSchema', () => {
    it('accepts valid input', () => {
      const result = relatedPostsSchema.safeParse({
        postId: 'cln1234567890123456789012',
        content: 'Content',
      })
      expect(result.success).toBe(true)
    })
  })
})
