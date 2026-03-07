/**
 * Blog validator tests.
 */

import {
  createPostSchema,
  searchParamsSchema,
  reactionSchema,
} from '@/lib/validators/blog.validator'

describe('blog.validator', () => {
  describe('searchParamsSchema', () => {
    it('accepts valid search params', () => {
      expect(searchParamsSchema.safeParse({}).success).toBe(true)
      expect(searchParamsSchema.safeParse({ q: 'test' }).success).toBe(true)
      expect(searchParamsSchema.safeParse({ page: 1, limit: 12 }).success).toBe(true)
      expect(searchParamsSchema.safeParse({ sort: 'newest' }).success).toBe(true)
    })

    it('transforms tags to array', () => {
      const r = searchParamsSchema.safeParse({ tags: 'a' })
      expect(r.success).toBe(true)
      if (r.success) {
        expect(r.data.tags).toEqual(['a'])
      }
    })
  })

  describe('reactionSchema', () => {
    it('requires postId and type', () => {
      expect(reactionSchema.safeParse({}).success).toBe(false)
      const validCuid = 'clxxxxxxxxxxxxxxxxxxxxxxxxx'
      expect(reactionSchema.safeParse({ postId: validCuid, type: 'HELPFUL_YES' }).success).toBe(true)
      expect(reactionSchema.safeParse({ postId: validCuid, type: 'HELPFUL_NO' }).success).toBe(true)
    })
  })

  describe('createPostSchema', () => {
    const minimalValid = {
      titleAr: 'عنوان',
      titleEn: 'Title',
      slug: 'valid-slug',
      excerptAr: 'ملخص عربي',
      excerptEn: 'English excerpt',
      content: { type: 'doc', content: [] },
      coverImage: 'https://example.com/image.jpg',
      categoryId: 'clxxxxxxxxxxxxxxxxxxxxxxxxxx',
      authorId: 'clxxxxxxxxxxxxxxxxxxxxxxxxxx',
    }

    it('accepts minimal valid input', () => {
      expect(createPostSchema.safeParse(minimalValid).success).toBe(true)
    })

    it('rejects invalid slug', () => {
      expect(createPostSchema.safeParse({ ...minimalValid, slug: 'Invalid Slug!' }).success).toBe(false)
    })

    it('rejects invalid coverImage (not url)', () => {
      expect(createPostSchema.safeParse({ ...minimalValid, coverImage: 'not-a-url' }).success).toBe(false)
    })
  })
})
