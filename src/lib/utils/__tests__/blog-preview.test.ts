/**
 * Unit tests for blog-preview
 */

describe('blog-preview', () => {
  const originalToken = process.env.BLOG_PREVIEW_TOKEN

  afterEach(() => {
    process.env.BLOG_PREVIEW_TOKEN = originalToken
  })

  describe('getBlogPreviewUrl', () => {
    it('returns null when BLOG_PREVIEW_TOKEN is not set', () => {
      delete process.env.BLOG_PREVIEW_TOKEN
      const { getBlogPreviewUrl } = require('../blog-preview')
      const result = getBlogPreviewUrl('my-post')
      expect(result).toBeNull()
    })

    it('returns URL with slug and token when BLOG_PREVIEW_TOKEN is set', () => {
      process.env.BLOG_PREVIEW_TOKEN = 'secret-token'
      const { getBlogPreviewUrl } = require('../blog-preview')
      const result = getBlogPreviewUrl('my-post')
      expect(result).toContain('/blog/my-post')
      expect(result).toContain('preview=true')
      expect(result).toContain('token=secret-token')
    })

    it('encodes token in URL', () => {
      process.env.BLOG_PREVIEW_TOKEN = 'token with spaces'
      const { getBlogPreviewUrl } = require('../blog-preview')
      const result = getBlogPreviewUrl('post')
      expect(result).toContain(encodeURIComponent('token with spaces'))
    })
  })
})
