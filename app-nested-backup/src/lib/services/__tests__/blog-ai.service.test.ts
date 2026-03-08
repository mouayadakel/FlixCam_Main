/**
 * Unit tests for blog-ai.service
 */

const mockGenerateContent = jest.fn()
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: () => ({
      generateContent: mockGenerateContent,
    }),
  })),
}))

describe('BlogAIService', () => {
  beforeAll(() => {
    process.env.GEMINI_API_KEY = 'test-key'
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockGenerateContent.mockResolvedValue({
      response: { text: () => 'Generated outline with H2 and H3' },
    })
  })

  describe('generateOutline', () => {
    it('returns generated outline', async () => {
      const { BlogAIService } = await import('../blog-ai.service')
      const result = await BlogAIService.generateOutline('Camera Tips', 'en')
      expect(result).toBe('Generated outline with H2 and H3')
      expect(mockGenerateContent).toHaveBeenCalled()
    })
  })

  describe('generateDraft', () => {
    it('returns parsed JSON draft', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => '{"type":"doc","content":[]}' },
      })
      const { BlogAIService } = await import('../blog-ai.service')
      const result = await BlogAIService.generateDraft('## Intro', 'My Post', 'en')
      expect(result).toMatchObject({ type: 'doc', content: [] })
    })
  })

  describe('rewrite', () => {
    it('returns rewritten text', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => 'Rewritten in professional tone' },
      })
      const { BlogAIService } = await import('../blog-ai.service')
      const result = await BlogAIService.rewrite('Original text', 'professional', 'en')
      expect(result).toBe('Rewritten in professional tone')
    })
  })

  describe('translate', () => {
    it('returns translated text', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => 'Translated content' },
      })
      const { BlogAIService } = await import('../blog-ai.service')
      const result = await BlogAIService.translate('Hello', 'en', 'ar')
      expect(result).toBe('Translated content')
    })
  })

  describe('generateSeoMeta', () => {
    it('returns meta object', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () =>
            '{"metaTitle":"Title","metaDescription":"Desc","keywords":["a","b"],"focusKeyphrase":"key"}',
        },
      })
      const { BlogAIService } = await import('../blog-ai.service')
      const result = await BlogAIService.generateSeoMeta('Post', 'Content', 'en')
      expect(result.metaTitle).toBe('Title')
      expect(result.keywords).toEqual(['a', 'b'])
    })
  })

  describe('generateFaq', () => {
    it('returns faq array', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => '{"faq":[{"question":"Q?","answer":"A"}]}',
        },
      })
      const { BlogAIService } = await import('../blog-ai.service')
      const result = await BlogAIService.generateFaq('Content', 'en')
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({ question: 'Q?', answer: 'A' })
    })
  })

  describe('extractEquipment', () => {
    it('returns equipment array', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => '{"equipment":[{"name":"Sony FX6","confidence":0.9,"category":"camera"}]}',
        },
      })
      const { BlogAIService } = await import('../blog-ai.service')
      const result = await BlogAIService.extractEquipment('Article about Sony FX6')
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('Sony FX6')
    })
  })

  describe('qualityScore', () => {
    it('returns score and feedback', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => '{"score":85,"feedback":[{"issue":"X","suggestion":"Y"}]}' },
      })
      const { BlogAIService } = await import('../blog-ai.service')
      const result = await BlogAIService.qualityScore('Content')
      expect(result.score).toBe(85)
      expect(result.feedback).toHaveLength(1)
    })
  })

  describe('generateAltText', () => {
    it('returns alt text for image', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => 'Sony FX6 cinema camera on tripod' },
      })
      const { BlogAIService } = await import('../blog-ai.service')
      const result = await BlogAIService.generateAltText(
        'https://example.com/img.jpg',
        'Camera review',
        'en'
      )
      expect(result).toBe('Sony FX6 cinema camera on tripod')
    })
  })

  describe('seoScore', () => {
    it('returns score and issues', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () =>
            '{"score":75,"issues":[{"severity":"medium","message":"Meta description too long"}]}',
        },
      })
      const { BlogAIService } = await import('../blog-ai.service')
      const result = await BlogAIService.seoScore('Post', 'Content', {
        metaTitle: 'T',
        metaDescription: 'D',
      })
      expect(result.score).toBe(75)
      expect(result.issues).toHaveLength(1)
      expect(result.issues[0].severity).toBe('medium')
    })
  })

  describe('suggestLinks', () => {
    it('returns link suggestions', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () =>
            '{"suggestions":[{"anchor":"camera guide","targetSlug":"camera-guides","relevance":0.9}]}',
        },
      })
      const { BlogAIService } = await import('../blog-ai.service')
      const result = await BlogAIService.suggestLinks('Content about camera guide')
      expect(result).toHaveLength(1)
      expect(result[0].anchor).toBe('camera guide')
      expect(result[0].targetSlug).toBe('camera-guides')
    })
    it('returns empty array when suggestions missing', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => '{}' },
      })
      const { BlogAIService } = await import('../blog-ai.service')
      const result = await BlogAIService.suggestLinks('Content')
      expect(result).toEqual([])
    })
  })

  describe('relatedPosts', () => {
    it('returns related post suggestions', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () =>
            '{"posts":[{"id":"slug-1","title":"Related Post","relevance":0.85}]}',
        },
      })
      const { BlogAIService } = await import('../blog-ai.service')
      const result = await BlogAIService.relatedPosts('post_1', 'Content')
      expect(result).toHaveLength(1)
      expect(result[0].title).toBe('Related Post')
    })
    it('returns empty array when posts missing', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => '{}' },
      })
      const { BlogAIService } = await import('../blog-ai.service')
      const result = await BlogAIService.relatedPosts('post_1', 'Content')
      expect(result).toEqual([])
    })
  })

  describe('headlineOptimizer', () => {
    it('returns alternative headlines', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () =>
            '{"headlines":["Headline 1","Headline 2","Headline 3","Headline 4","Headline 5"]}',
        },
      })
      const { BlogAIService } = await import('../blog-ai.service')
      const result = await BlogAIService.headlineOptimizer('Original Title', 'en')
      expect(result).toHaveLength(5)
    })
    it('returns empty array when headlines missing', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => '{}' },
      })
      const { BlogAIService } = await import('../blog-ai.service')
      const result = await BlogAIService.headlineOptimizer('Title', 'en')
      expect(result).toEqual([])
    })
  })

  describe('autoTags', () => {
    it('returns suggested tags', async () => {
      mockGenerateContent.mockResolvedValue({
        response: {
          text: () => '{"tags":["camera","sony","cinema","equipment","rental"]}',
        },
      })
      const { BlogAIService } = await import('../blog-ai.service')
      const result = await BlogAIService.autoTags('Content about Sony cameras')
      expect(result).toHaveLength(5)
      expect(result).toContain('camera')
    })
    it('returns empty array when tags missing', async () => {
      mockGenerateContent.mockResolvedValue({
        response: { text: () => '{}' },
      })
      const { BlogAIService } = await import('../blog-ai.service')
      const result = await BlogAIService.autoTags('Content')
      expect(result).toEqual([])
    })
  })

  describe('getApiKey', () => {
    it('throws when GEMINI_API_KEY not set', async () => {
      const orig = process.env.GEMINI_API_KEY
      delete process.env.GEMINI_API_KEY
      delete process.env.GOOGLE_GENERATIVE_AI_API_KEY
      jest.resetModules()
      const { BlogAIService } = await import('../blog-ai.service')
      await expect(BlogAIService.generateOutline('X', 'en')).rejects.toThrow('GEMINI_API_KEY')
      process.env.GEMINI_API_KEY = orig
    })
  })
})
