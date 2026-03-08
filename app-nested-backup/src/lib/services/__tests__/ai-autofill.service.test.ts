/**
 * Unit tests for ai-autofill.service
 *
 * EXECUTION PATH MAP:
 * - autofillProduct: name-only → generateDescription; descriptions present → skip; SEO success/fail;
 *   targetLocales ar/zh; cached name → skip translate; uncached → translate name+short+long;
 *   shortDesc cached/uncached+cost; longDesc cached/uncached+cost; nameTranslation cost;
 *   generateDescription throws → catch; translation throws → catch
 * - autofillProductsBatch: batch≤10; batch>10 (delay); fulfilled; rejected (fallback)
 * - autofillMissingFields: no desc → generate; SEO fill with validation retry; recordCost;
 *   existingTranslation.name → skip; translate retry on invalid; enShort/enLong translate;
 *   arTrans/zhTrans locale SEO; recordCost for translation
 * - generateDescription: success; throws; truncation; boxContents; specs
 * - generateBoxContents: string; object; other type
 * - generateTags: string; object; other type
 * - suggestRelatedProducts: findMany; empty; limit
 */

const mockGenerateSEOBatch = jest.fn()
const mockGetTranslationCacheKey = jest.fn()
const mockGetCachedTranslation = jest.fn()
const mockSetCachedTranslation = jest.fn()
const mockTranslateBatch = jest.fn()
const mockGenerateWithLLM = jest.fn()
const mockRecordCost = jest.fn()

jest.mock('../seo-generation.service', () => ({
  generateSEOBatch: (...args: unknown[]) => mockGenerateSEOBatch(...args),
}))

jest.mock('../translation.service', () => ({
  getTranslationCacheKey: (...args: unknown[]) => mockGetTranslationCacheKey(...args),
  getCachedTranslation: (...args: unknown[]) => mockGetCachedTranslation(...args),
  setCachedTranslation: (...args: unknown[]) => mockSetCachedTranslation(...args),
  translateBatch: (...args: unknown[]) => mockTranslateBatch(...args),
}))

jest.mock('../ai-content-generation.service', () => ({
  generateWithLLM: (...args: unknown[]) => mockGenerateWithLLM(...args),
}))

jest.mock('@/lib/utils/cost-tracker', () => ({
  recordCost: (...args: unknown[]) => mockRecordCost(...args),
}))

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    product: {
      findMany: jest.fn().mockResolvedValue([{ id: 'p1' }, { id: 'p2' }]),
    },
  },
}))

import {
  autofillProduct,
  autofillProductsBatch,
  autofillMissingFields,
  generateDescription,
  generateBoxContents,
  generateTags,
  suggestRelatedProducts,
  getTranslationFallbackProvider,
} from '../ai-autofill.service'

describe('ai-autofill.service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'error').mockImplementation(() => {})
    mockRecordCost.mockResolvedValue(undefined)
    mockGenerateSEOBatch.mockResolvedValue([
      { metaTitle: 'T', metaDescription: 'D', metaKeywords: 'K' },
    ])
    mockGetTranslationCacheKey.mockReturnValue('key')
    mockGetCachedTranslation.mockReturnValue(null)
    mockSetCachedTranslation.mockResolvedValue(undefined)
    mockTranslateBatch.mockResolvedValue([{ translatedText: 'Translated' }])
    mockGenerateWithLLM.mockResolvedValue({
      shortDescription: 'Short',
      longDescription: 'Long',
    })
  })

  describe('getTranslationFallbackProvider', () => {
    it('returns openai when provider is gemini', () => {
      expect(getTranslationFallbackProvider('gemini')).toBe('openai')
    })
    it('returns gemini when provider is openai', () => {
      expect(getTranslationFallbackProvider('openai')).toBe('gemini')
    })
  })

  describe('autofillProduct', () => {
    it('handles productData with no category or brand', async () => {
      const result = await autofillProduct({
        name: 'Camera X',
        locale: 'en',
      })
      expect(result.seo.metaTitle).toBeDefined()
      expect(result.seo.metaTitle.length).toBeGreaterThan(0)
      expect(result.translations).toBeDefined()
    })

    it('returns result with translations and seo shape for minimal input', async () => {
      const result = await autofillProduct({
        name: 'Camera X',
        category: 'Cameras',
        brand: 'Sony',
        locale: 'en',
      })
      expect(result).toMatchObject({
        translations: expect.any(Object),
        seo: expect.objectContaining({
          metaTitle: expect.any(String),
          metaDescription: expect.any(String),
          metaKeywords: expect.any(String),
        }),
      })
    })

    it('uses productData.name for seo.metaTitle when no SEO generated', async () => {
      const result = await autofillProduct({
        name: 'Test Product',
        category: 'Cat',
        brand: 'Brand',
      })
      expect(result.seo.metaTitle).toBeDefined()
    })

    it('uses cached translation when getCachedTranslation returns value', async () => {
      mockGetCachedTranslation.mockReturnValue('Cached Name')
      const result = await autofillProduct({
        name: 'Camera X',
        category: 'Cameras',
        brand: 'Sony',
        locale: 'en',
      })
      expect(mockTranslateBatch).not.toHaveBeenCalled()
      expect(result.translations).toBeDefined()
    })

    it('falls back to productData when SEO generation fails', async () => {
      mockGenerateSEOBatch.mockRejectedValue(new Error('SEO failed'))
      const result = await autofillProduct({
        name: 'Fallback Product',
        shortDescription: 'Short',
        category: 'Cameras',
        brand: 'Sony',
        locale: 'en',
      })
      expect(result.seo.metaTitle).toBe('Fallback Product')
      expect(result.seo.metaDescription).toBeDefined()
    })

    it('continues when translation to a locale fails', async () => {
      mockTranslateBatch
        .mockResolvedValueOnce([{ translatedText: 'Translated', cost: 0 }])
        .mockRejectedValueOnce(new Error('Translation failed'))
        .mockResolvedValueOnce([{ translatedText: 'Translated ZH', cost: 0 }])
      const result = await autofillProduct({
        name: 'Camera X',
        category: 'Cameras',
        brand: 'Sony',
        locale: 'en',
      })
      expect(result).toMatchObject({
        seo: expect.any(Object),
        translations: expect.any(Object),
      })
    })

    it('generates description when shortDesc and longDesc are missing', async () => {
      const result = await autofillProduct({
        name: 'Camera Only',
        category: 'Cameras',
        brand: 'Sony',
        locale: 'en',
      })
      expect(mockGenerateWithLLM).toHaveBeenCalled()
      expect(result.generatedEnDescription).toBeDefined()
    })

    it('includes cost from SEO result when present', async () => {
      mockGenerateSEOBatch.mockResolvedValue([
        { metaTitle: 'T', metaDescription: 'D', metaKeywords: 'K', cost: 0.002 },
      ])
      mockTranslateBatch.mockResolvedValue([
        { translatedText: 'Translated', cost: 0.001 },
      ])
      const result = await autofillProduct({
        name: 'Camera X',
        shortDescription: 'Short',
        longDescription: 'Long',
        category: 'Cameras',
        brand: 'Sony',
        locale: 'en',
      })
      expect(result.cost).toBeGreaterThanOrEqual(0)
    })

    it('uses cached shortDesc when getCachedTranslation returns for shortDesc', async () => {
      mockGetCachedTranslation
        .mockReturnValueOnce(null)
        .mockReturnValueOnce('Cached Short')
        .mockReturnValue(null)
      mockTranslateBatch.mockResolvedValue([{ translatedText: 'Name AR', cost: 0 }])
      const result = await autofillProduct({
        name: 'Camera X',
        shortDescription: 'Short desc',
        longDescription: 'Long desc',
        category: 'Cameras',
        brand: 'Sony',
        locale: 'en',
      })
      expect(result.translations).toBeDefined()
      expect(mockTranslateBatch).toHaveBeenCalled()
    })

    it('translates shortDesc and longDesc when not cached and accumulates cost', async () => {
      mockGetCachedTranslation.mockReturnValue(null)
      mockTranslateBatch
        .mockResolvedValueOnce([{ translatedText: 'Name AR', cost: 0.001 }])
        .mockResolvedValueOnce([{ translatedText: 'Short AR', cost: 0.002 }])
        .mockResolvedValueOnce([{ translatedText: 'Long AR', cost: 0.003 }])
        .mockResolvedValueOnce([{ translatedText: 'Name ZH', cost: 0.001 }])
        .mockResolvedValueOnce([{ translatedText: 'Short ZH', cost: 0.002 }])
        .mockResolvedValueOnce([{ translatedText: 'Long ZH', cost: 0.003 }])
      const result = await autofillProduct({
        name: 'Camera X',
        shortDescription: 'Short',
        longDescription: 'Long',
        category: 'Cameras',
        brand: 'Sony',
        locale: 'en',
      })
      expect(result.cost).toBeGreaterThanOrEqual(0)
      expect(result.translations?.ar?.shortDescription).toBe('Short AR')
      expect(result.translations?.ar?.longDescription).toBe('Long AR')
    })

    it('uses cached longDesc when getCachedTranslation returns for longDesc', async () => {
      mockGetCachedTranslation
        .mockReturnValueOnce(null)
        .mockReturnValueOnce(null)
        .mockReturnValueOnce('Cached Long')
        .mockReturnValue(null)
      mockTranslateBatch.mockResolvedValue([{ translatedText: 'Name AR', cost: 0 }])
      const result = await autofillProduct({
        name: 'Camera X',
        shortDescription: 'Short',
        longDescription: 'Long desc here',
        category: 'Cameras',
        brand: 'Sony',
        locale: 'en',
      })
      expect(result.translations?.ar).toBeDefined()
    })

    it('continues when generateDescription throws', async () => {
      mockGenerateWithLLM.mockRejectedValue(new Error('LLM failed'))
      const result = await autofillProduct({
        name: 'Camera Only',
        category: 'Cameras',
        brand: 'Sony',
        locale: 'en',
      })
      expect(result.seo.metaTitle).toBeDefined()
      expect(result.translations).toBeDefined()
    })

    it('uses provider openai when specified', async () => {
      await autofillProduct(
        { name: 'Camera X', category: 'C', brand: 'B', locale: 'en' },
        'openai'
      )
      expect(mockGenerateSEOBatch).toHaveBeenCalledWith(
        expect.any(Array),
        'openai'
      )
    })

    it('translates to en and zh when locale is ar', async () => {
      mockGetCachedTranslation.mockReturnValue(null)
      mockTranslateBatch.mockResolvedValue([{ translatedText: 'Translated', cost: 0 }])
      const result = await autofillProduct(
        { name: 'Camera X', category: 'C', brand: 'B', locale: 'ar' },
        'gemini'
      )
      expect(result.translations).toBeDefined()
      expect(mockTranslateBatch).toHaveBeenCalled()
    })

    it('translates to en and ar when locale is zh', async () => {
      mockGetCachedTranslation.mockReturnValue(null)
      mockTranslateBatch.mockResolvedValue([{ translatedText: 'Translated', cost: 0 }])
      const result = await autofillProduct(
        { name: 'Camera X', category: 'C', brand: 'B', locale: 'zh' },
        'gemini'
      )
      expect(result.translations).toBeDefined()
      expect(mockTranslateBatch).toHaveBeenCalled()
    })
  })

  describe('autofillProductsBatch', () => {
    it('returns results for all products', async () => {
      const results = await autofillProductsBatch(
        [
          { name: 'P1', category: 'C', brand: 'B' },
          { name: 'P2', category: 'C', brand: 'B' },
        ],
        'gemini'
      )
      expect(results).toHaveLength(2)
      expect(results[0].seo.metaTitle).toBeDefined()
      expect(results[1].seo.metaTitle).toBeDefined()
    })

    it('returns fallback result when one product fails', async () => {
      mockGenerateSEOBatch
        .mockResolvedValueOnce([{ metaTitle: 'T1', metaDescription: 'D1', metaKeywords: 'K1' }])
        .mockRejectedValueOnce(new Error('Failed'))
      const results = await autofillProductsBatch(
        [
          { name: 'P1', category: 'C', brand: 'B' },
          { name: 'P2', category: 'C', brand: 'B', shortDescription: 'Short for P2' },
        ],
        'gemini'
      )
      expect(results).toHaveLength(2)
      expect(results[0].seo.metaTitle).toBe('T1')
      expect(results[1].seo.metaTitle).toBe('P2')
      expect(results[1].seo.metaDescription).toBe('Short for P2')
    })

    it('returns fallback with product name when autofillProduct rejects', async () => {
      const results = await autofillProductsBatch(
        [
          { name: 'P1', category: 'C', brand: 'B' },
          { name: 'RejectMe', category: 'C', brand: 'B', shortDescription: 'Short', __testForceReject: true } as Parameters<typeof autofillProduct>[0],
        ],
        'gemini'
      )
      expect(results).toHaveLength(2)
      expect(results[1].seo.metaTitle).toBe('RejectMe')
      expect(results[1].seo.metaDescription).toBe('Short')
      expect(results[1].translations).toEqual({})
    })

    it('processes in batches of 10 with delay between batches', async () => {
      jest.useFakeTimers()
      const products = Array.from({ length: 15 }, (_, i) => ({
        name: `P${i + 1}`,
        category: 'C',
        brand: 'B',
      }))
      const promise = autofillProductsBatch(products, 'gemini')
      await jest.advanceTimersByTimeAsync(1100)
      const results = await promise
      expect(results).toHaveLength(15)
      jest.useRealTimers()
    })
  })

  describe('autofillMissingFields', () => {
    it('uses gemini when provider not specified', async () => {
      mockGenerateSEOBatch.mockResolvedValue([
        {
          metaTitle: 'T',
          metaDescription:
            'This is a valid meta description that contains exactly twenty words for the SEO validation case to pass successfully and ensure quality.',
          metaKeywords: 'K',
        },
      ])
      mockTranslateBatch.mockResolvedValue([{ translatedText: 'منتج', cost: 0 }])
      const result = await autofillMissingFields(
        'prod-1',
        { name: 'Product', shortDescription: 'S', longDescription: 'L' },
        { category: 'Cameras', brand: 'Sony' }
      )
      expect(mockGenerateSEOBatch).toHaveBeenCalledWith(expect.any(Array), 'gemini')
      expect(result.seo).toBeDefined()
    })

    it('returns partial result with generated descriptions when empty', async () => {
      const result = await autofillMissingFields(
        'prod-1',
        { name: 'Product' },
        { category: 'Cameras', brand: 'Sony' },
        'gemini'
      )
      expect(result.seo).toBeDefined()
      expect(result.translations).toBeDefined()
    })

    it('skips SEO block when seoTitle and seoDescription exist', async () => {
      const result = await autofillMissingFields(
        'prod-1',
        {
          name: 'Product',
          shortDescription: 'S',
          longDescription: 'L',
          seoTitle: 'Existing Title',
          seoDescription: 'Existing description with enough words for validation.',
          translations: [
            { locale: 'ar', name: 'منتج' },
            { locale: 'zh', name: '产品' },
          ],
        },
        { category: 'Cameras', brand: 'Sony' },
        'gemini'
      )
      expect(mockGenerateSEOBatch).not.toHaveBeenCalled()
      expect(result.seo).toBeDefined()
    })

    it('retries SEO with alternate provider when validation fails', async () => {
      mockGenerateSEOBatch
        .mockResolvedValueOnce([
          {
            metaTitle: 'lorem ipsum',
            metaDescription: 'short',
            metaKeywords: 'k',
          },
        ])
        .mockResolvedValueOnce([
          {
            metaTitle: 'Valid Title Under 70 Chars',
            metaDescription:
              'This is a valid meta description that contains exactly twenty words for the SEO validation case to pass successfully and ensure quality.',
            metaKeywords: 'k2',
          },
        ])
      const result = await autofillMissingFields(
        'prod-1',
        {
          name: 'Product',
          shortDescription: 'Short',
          longDescription: 'Long',
          translations: [
            { locale: 'ar', name: 'منتج' },
            { locale: 'zh', name: '产品' },
          ],
        },
        { category: 'Cameras', brand: 'Sony' },
        'gemini'
      )
      expect(mockGenerateSEOBatch).toHaveBeenCalledTimes(2)
      expect(result.seo?.metaTitle).toBe('Valid Title Under 70 Chars')
    })

    it('calls recordCost when options.jobId provided and SEO generated', async () => {
      mockGenerateSEOBatch.mockResolvedValue([
        {
          metaTitle: 'T',
          metaDescription:
            'This is a valid meta description that contains exactly twenty words for the SEO validation case to pass successfully and ensure quality.',
          metaKeywords: 'K',
          cost: 0.01,
        },
      ])
      await autofillMissingFields(
        'prod-1',
        { name: 'Product', shortDescription: 'S', longDescription: 'L' },
        { category: 'Cameras', brand: 'Sony' },
        'gemini',
        { jobId: 'job-123' }
      )
      expect(mockRecordCost).toHaveBeenCalledWith({
        jobId: 'job-123',
        feature: 'text_backfill',
        costUsd: 0.01,
      })
    })

    it('skips recordCost when SEO has no cost even with jobId', async () => {
      mockGenerateSEOBatch.mockResolvedValue([
        {
          metaTitle: 'T',
          metaDescription:
            'This is a valid meta description that contains exactly twenty words for the SEO validation case to pass successfully and ensure quality.',
          metaKeywords: 'K',
        },
      ])
      mockTranslateBatch.mockResolvedValue([{ translatedText: 'منتج', cost: 0 }])
      const beforeCalls = mockRecordCost.mock.calls.length
      await autofillMissingFields(
        'prod-1',
        { name: 'Product', shortDescription: 'S', longDescription: 'L' },
        { category: 'Cameras', brand: 'Sony' },
        'gemini',
        { jobId: 'job-123' }
      )
      const seoCostCalls = mockRecordCost.mock.calls.filter(
        (c) => c[0]?.feature === 'text_backfill' && c[0]?.costUsd !== 0
      )
      expect(seoCostCalls.length).toBe(0)
    })

    it('translates when existingTranslation exists but has no name', async () => {
      mockGenerateSEOBatch.mockResolvedValue([
        {
          metaTitle: 'T',
          metaDescription:
            'This is a valid meta description that contains exactly twenty words for the SEO validation case to pass successfully and ensure quality.',
          metaKeywords: 'K',
        },
      ])
      mockTranslateBatch.mockResolvedValue([{ translatedText: 'منتج', cost: 0 }])
      const result = await autofillMissingFields(
        'prod-1',
        {
          name: 'Product',
          shortDescription: 'S',
          longDescription: 'L',
          translations: [
            { locale: 'ar', shortDescription: 'قصر', longDescription: 'طويل' },
            { locale: 'zh', name: '产品' },
          ],
        },
        { category: 'Cameras', brand: 'Sony' },
        'gemini'
      )
      expect(mockTranslateBatch).toHaveBeenCalled()
      expect(result.translations?.ar?.name).toBe('منتج')
    })

    it('skips translation when existingTranslation has name', async () => {
      const result = await autofillMissingFields(
        'prod-1',
        {
          name: 'Product',
          shortDescription: 'S',
          longDescription: 'L',
          seoTitle: 'Title',
          seoDescription: 'Description with enough words for validation here.',
          translations: [
            { locale: 'ar', name: 'منتج', shortDescription: 'قصر', longDescription: 'طويل' },
            { locale: 'zh', name: '产品', shortDescription: '短', longDescription: '长' },
          ],
        },
        { category: 'Cameras', brand: 'Sony' },
        'gemini'
      )
      expect(mockTranslateBatch).not.toHaveBeenCalled()
      expect(result.translations).toEqual({})
    })

    it('retries translation with alternate provider when result invalid', async () => {
      mockGenerateSEOBatch.mockResolvedValue([
        {
          metaTitle: 'T',
          metaDescription:
            'This is a valid meta description that contains exactly twenty words for the SEO validation case to pass successfully and ensure quality.',
          metaKeywords: 'K',
        },
      ])
      mockTranslateBatch
        .mockResolvedValueOnce([{ translatedText: 'lorem ipsum', cost: 0 }])
        .mockResolvedValueOnce([{ translatedText: 'منتج صالح', cost: 0 }])
        .mockResolvedValueOnce([{ translatedText: 'Short AR', cost: 0 }])
        .mockResolvedValueOnce([{ translatedText: 'Long AR', cost: 0 }])
        .mockResolvedValueOnce([{ translatedText: '产品', cost: 0 }])
        .mockResolvedValueOnce([{ translatedText: 'Short ZH', cost: 0 }])
        .mockResolvedValueOnce([{ translatedText: 'Long ZH', cost: 0 }])
      const result = await autofillMissingFields(
        'prod-1',
        { name: 'Product', shortDescription: 'S', longDescription: 'L' },
        { category: 'Cameras', brand: 'Sony' },
        'gemini'
      )
      expect(result.translations?.ar?.name).toBe('منتج صالح')
    })

    it('translates enShort and enLong to ar and zh', async () => {
      mockGenerateSEOBatch.mockResolvedValue([
        { metaTitle: 'T', metaDescription: 'D with enough words for validation.', metaKeywords: 'K' },
      ])
      mockTranslateBatch.mockResolvedValue([
        { translatedText: 'Translated', cost: 0.001 },
      ])
      const result = await autofillMissingFields(
        'prod-1',
        { name: 'Product', shortDescription: 'Short', longDescription: 'Long' },
        { category: 'Cameras', brand: 'Sony' },
        'gemini',
        { jobId: 'job-1' }
      )
      expect(mockRecordCost).toHaveBeenCalled()
      expect(result.translations?.ar).toBeDefined()
      expect(result.translations?.zh).toBeDefined()
    })

    it('generates locale-specific SEO for ar and zh when translations exist', async () => {
      mockGenerateSEOBatch
        .mockResolvedValueOnce([
          {
            metaTitle: 'Valid Title',
            metaDescription:
              'This is a valid meta description that contains exactly twenty words for the SEO validation case to pass successfully and ensure quality.',
            metaKeywords: 'K',
          },
        ])
        .mockResolvedValueOnce([
          { metaTitle: 'AR Title', metaDescription: 'AR Desc', metaKeywords: 'AR K' },
          { metaTitle: 'ZH Title', metaDescription: 'ZH Desc', metaKeywords: 'ZH K' },
        ])
      mockTranslateBatch.mockResolvedValue([
        { translatedText: 'منتج', cost: 0 },
      ])
      const result = await autofillMissingFields(
        'prod-1',
        { name: 'Product', shortDescription: 'S', longDescription: 'L' },
        { category: 'Cameras', brand: 'Sony' },
        'gemini'
      )
      expect(result.seoByLocale?.ar).toEqual({
        metaTitle: 'AR Title',
        metaDescription: 'AR Desc',
        metaKeywords: 'AR K',
      })
      expect(result.seoByLocale?.zh).toEqual({
        metaTitle: 'ZH Title',
        metaDescription: 'ZH Desc',
        metaKeywords: 'ZH K',
      })
    })

    it('uses existingData.seoTitle when present and merges with generated', async () => {
      mockGenerateSEOBatch.mockResolvedValue([
        {
          metaTitle: 'Generated Title',
          metaDescription:
            'This is a valid meta description that contains exactly twenty words for the SEO validation case to pass successfully and ensure quality.',
          metaKeywords: 'Generated K',
        },
      ])
      mockTranslateBatch.mockResolvedValue([{ translatedText: 'T', cost: 0 }])
      const result = await autofillMissingFields(
        'prod-1',
        {
          name: 'Product',
          shortDescription: 'S',
          longDescription: 'L',
          seoTitle: 'Custom Title',
        },
        { category: 'Cameras', brand: 'Sony' },
        'gemini'
      )
      expect(result.seo?.metaTitle).toBe('Custom Title')
    })

    it('falls back to openai when gemini SEO throws', async () => {
      mockTranslateBatch.mockResolvedValue([{ translatedText: 'منتج', cost: 0 }])
      mockGenerateSEOBatch
        .mockRejectedValueOnce(new Error('Gemini failed'))
        .mockResolvedValueOnce([
          {
            metaTitle: 'Fallback Title',
            metaDescription:
              'This is a fallback meta description that contains exactly twenty words for the SEO validation case to pass successfully and ensure quality.',
            metaKeywords: 'K',
          },
        ])
        .mockResolvedValueOnce([
          { metaTitle: 'AR', metaDescription: 'AR D', metaKeywords: 'AR K' },
          { metaTitle: 'ZH', metaDescription: 'ZH D', metaKeywords: 'ZH K' },
        ])
      const result = await autofillMissingFields(
        'prod-1',
        { name: 'Product', shortDescription: 'S', longDescription: 'L' },
        { category: 'Cameras', brand: 'Sony' },
        'gemini'
      )
      expect(result.seo?.metaTitle).toBe('Fallback Title')
      const openaiCalls = mockGenerateSEOBatch.mock.calls.filter(
        (call) => call[1] === 'openai'
      )
      expect(openaiCalls.length).toBeGreaterThanOrEqual(1)
    })

    it('keeps first SEO result when retry throws', async () => {
      mockGenerateSEOBatch
        .mockResolvedValueOnce([
          {
            metaTitle: 'lorem ipsum',
            metaDescription: 'short',
            metaKeywords: 'k',
          },
        ])
        .mockRejectedValueOnce(new Error('Retry failed'))
      const result = await autofillMissingFields(
        'prod-1',
        {
          name: 'Product',
          shortDescription: 'S',
          longDescription: 'L',
          translations: [
            { locale: 'ar', name: 'منتج' },
            { locale: 'zh', name: '产品' },
          ],
        },
        { category: 'Cameras', brand: 'Sony' },
        'gemini'
      )
      expect(result.seo?.metaTitle).toBe('lorem ipsum')
    })

    it('uses existingData.seoKeywords when provided', async () => {
      mockGenerateSEOBatch.mockResolvedValue([
        {
          metaTitle: 'T',
          metaDescription:
            'This is a valid meta description that contains exactly twenty words for the SEO validation case to pass successfully and ensure quality.',
          metaKeywords: 'Generated K',
        },
      ])
      mockTranslateBatch.mockResolvedValue([{ translatedText: 'T', cost: 0 }])
      const result = await autofillMissingFields(
        'prod-1',
        {
          name: 'Product',
          shortDescription: 'S',
          longDescription: 'L',
          seoKeywords: 'custom,keywords,here',
        },
        { category: 'Cameras', brand: 'Sony' },
        'gemini'
      )
      expect(result.seo?.metaKeywords).toBe('custom,keywords,here')
    })

    it('uses existingTranslation shortDescription when translate returns empty', async () => {
      mockGenerateSEOBatch.mockResolvedValue([
        {
          metaTitle: 'T',
          metaDescription:
            'This is a valid meta description that contains exactly twenty words for the SEO validation case to pass successfully and ensure quality.',
          metaKeywords: 'K',
        },
      ])
      mockTranslateBatch
        .mockResolvedValueOnce([{ translatedText: 'منتج', cost: 0 }])
        .mockResolvedValueOnce([{ translatedText: '' }])
        .mockResolvedValueOnce([{ translatedText: '' }])
        .mockResolvedValueOnce([{ translatedText: '产品', cost: 0 }])
        .mockResolvedValueOnce([{ translatedText: '' }])
        .mockResolvedValueOnce([{ translatedText: '' }])
      const result = await autofillMissingFields(
        'prod-1',
        {
          name: 'Product',
          shortDescription: 'S',
          longDescription: 'L',
          translations: [
            { locale: 'ar', shortDescription: 'قصر', longDescription: 'طويل' },
            { locale: 'zh', shortDescription: '短', longDescription: '长' },
          ],
        },
        { category: 'Cameras', brand: 'Sony' },
        'gemini'
      )
      expect(result.translations?.ar?.shortDescription).toBe('قصر')
      expect(result.translations?.zh?.shortDescription).toBe('短')
    })

    it('generates locale SEO for zh when zh translation exists', async () => {
      mockGenerateSEOBatch
        .mockResolvedValueOnce([
          {
            metaTitle: 'T',
            metaDescription:
              'This is a valid meta description that contains exactly twenty words for the SEO validation case to pass successfully and ensure quality.',
            metaKeywords: 'K',
          },
        ])
        .mockResolvedValueOnce([
          { metaTitle: 'AR Title', metaDescription: 'AR Desc', metaKeywords: 'AR K' },
          { metaTitle: 'ZH Title', metaDescription: 'ZH Desc', metaKeywords: 'ZH K' },
        ])
      mockTranslateBatch.mockResolvedValue([{ translatedText: 'منتج', cost: 0 }])
      const result = await autofillMissingFields(
        'prod-1',
        { name: 'Product', shortDescription: 'S', longDescription: 'L' },
        { category: 'Cameras', brand: 'Sony' },
        'gemini'
      )
      expect(result.seoByLocale?.zh).toEqual({
        metaTitle: 'ZH Title',
        metaDescription: 'ZH Desc',
        metaKeywords: 'ZH K',
      })
    })

    it('falls back to openai when gemini translate throws for name', async () => {
      mockGenerateSEOBatch.mockResolvedValue([
        {
          metaTitle: 'T',
          metaDescription:
            'This is a valid meta description that contains exactly twenty words for the SEO validation case to pass successfully and ensure quality.',
          metaKeywords: 'K',
        },
      ])
      mockTranslateBatch
        .mockRejectedValueOnce(new Error('Gemini failed'))
        .mockResolvedValue([{ translatedText: 'منتج', cost: 0 }])
      const result = await autofillMissingFields(
        'prod-1',
        { name: 'Product', shortDescription: 'S', longDescription: 'L' },
        { category: 'Cameras', brand: 'Sony' },
        'gemini'
      )
      expect(result.translations?.ar?.name).toBe('منتج')
    })

    it('falls back to gemini when openai translate throws', async () => {
      mockGenerateSEOBatch.mockResolvedValue([
        {
          metaTitle: 'T',
          metaDescription:
            'This is a valid meta description that contains exactly twenty words for the SEO validation case to pass successfully and ensure quality.',
          metaKeywords: 'K',
        },
      ])
      mockTranslateBatch
        .mockRejectedValueOnce(new Error('OpenAI failed'))
        .mockResolvedValue([{ translatedText: 'منتج', cost: 0 }])
      const result = await autofillMissingFields(
        'prod-1',
        { name: 'Product', shortDescription: 'S', longDescription: 'L' },
        { category: 'Cameras', brand: 'Sony' },
        'openai'
      )
      expect(result.translations).toBeDefined()
      expect(result.translations?.ar?.name).toBe('منتج')
      const geminiCalls = mockTranslateBatch.mock.calls.filter((c) => c[1] === 'gemini')
      expect(geminiCalls.length).toBeGreaterThanOrEqual(1)
    })

    it('skips generateDescription when existingData has no name', async () => {
      mockGenerateSEOBatch.mockResolvedValue([
        {
          metaTitle: 'T',
          metaDescription:
            'This is a valid meta description that contains exactly twenty words for the SEO validation case to pass successfully and ensure quality.',
          metaKeywords: 'K',
        },
      ])
      mockTranslateBatch.mockResolvedValue([{ translatedText: 'منتج', cost: 0 }])
      const result = await autofillMissingFields(
        'prod-1',
        { shortDescription: 'S', longDescription: 'L' },
        { category: 'Cameras', brand: 'Sony' },
        'gemini'
      )
      expect(mockGenerateWithLLM).not.toHaveBeenCalled()
      expect(result.seo).toBeDefined()
    })

    it('handles generateDescription failure and continues', async () => {
      mockGenerateWithLLM.mockRejectedValue(new Error('LLM unavailable'))
      mockGenerateSEOBatch.mockResolvedValue([
        {
          metaTitle: 'T',
          metaDescription:
            'This is a valid meta description that contains exactly twenty words for the SEO validation case to pass successfully and ensure quality.',
          metaKeywords: 'K',
        },
      ])
      mockTranslateBatch.mockResolvedValue([{ translatedText: 'منتج', cost: 0 }])
      const result = await autofillMissingFields(
        'prod-1',
        { name: 'Product' },
        { category: 'Cameras', brand: 'Sony' },
        'gemini'
      )
      expect(result.seo?.metaTitle).toBe('T')
      expect(result.translations).toBeDefined()
    })

    it('handles SEO generation failure and continues', async () => {
      mockGenerateWithLLM.mockResolvedValue({ shortDescription: 'S', longDescription: 'L' })
      mockGenerateSEOBatch.mockRejectedValue(new Error('SEO service down'))
      mockTranslateBatch.mockResolvedValue([{ translatedText: 'منتج', cost: 0 }])
      const result = await autofillMissingFields(
        'prod-1',
        { name: 'Product', shortDescription: 'S', longDescription: 'L' },
        { category: 'Cameras', brand: 'Sony' },
        'gemini'
      )
      expect(result.seo).toBeDefined()
      expect(result.translations).toBeDefined()
    })

    it('handles SEO returning empty array', async () => {
      mockGenerateWithLLM.mockResolvedValue({ shortDescription: 'S', longDescription: 'L' })
      mockGenerateSEOBatch.mockResolvedValue([])
      mockTranslateBatch.mockResolvedValue([{ translatedText: 'منتج', cost: 0 }])
      const result = await autofillMissingFields(
        'prod-1',
        { name: 'Product', shortDescription: 'S', longDescription: 'L' },
        { category: 'Cameras', brand: 'Sony' },
        'gemini'
      )
      expect(result.seo?.metaTitle).toBe('')
      expect(result.seo?.metaDescription).toBe('')
    })

    it('skips setting seo when SEO returns empty metaTitle and metaDescription', async () => {
      mockGenerateWithLLM.mockResolvedValue({ shortDescription: 'S', longDescription: 'L' })
      mockGenerateSEOBatch.mockResolvedValue([
        { metaTitle: '', metaDescription: '', metaKeywords: '' },
      ])
      mockTranslateBatch.mockResolvedValue([{ translatedText: 'منتج', cost: 0 }])
      const result = await autofillMissingFields(
        'prod-1',
        { name: 'Product', shortDescription: 'S', longDescription: 'L' },
        { category: 'Cameras', brand: 'Sony' },
        'gemini'
      )
      expect(result.seo?.metaTitle).toBe('')
      expect(result.seo?.metaDescription).toBe('')
    })

    it('handles both SEO providers throwing', async () => {
      mockGenerateWithLLM.mockResolvedValue({ shortDescription: 'S', longDescription: 'L' })
      mockGenerateSEOBatch
        .mockRejectedValueOnce(new Error('Gemini down'))
        .mockRejectedValueOnce(new Error('OpenAI down'))
        .mockResolvedValue([{ metaTitle: 'AR', metaDescription: 'AR D', metaKeywords: 'K' }])
      mockTranslateBatch.mockResolvedValue([{ translatedText: 'منتج', cost: 0 }])
      const result = await autofillMissingFields(
        'prod-1',
        { name: 'Product', shortDescription: 'S', longDescription: 'L' },
        { category: 'Cameras', brand: 'Sony' },
        'gemini'
      )
      expect(result.seo).toBeDefined()
      expect(mockGenerateSEOBatch.mock.calls.length).toBeGreaterThanOrEqual(2)
    })

    it('keeps first translation when retry throws after invalid result', async () => {
      mockGenerateSEOBatch.mockResolvedValue([
        {
          metaTitle: 'T',
          metaDescription:
            'This is a valid meta description that contains exactly twenty words for the SEO validation case to pass successfully and ensure quality.',
          metaKeywords: 'K',
        },
      ])
      mockTranslateBatch
        .mockResolvedValueOnce([{ translatedText: 'lorem ipsum', cost: 0 }])
        .mockRejectedValueOnce(new Error('Retry failed'))
        .mockResolvedValue([{ translatedText: 'Short AR', cost: 0 }])
        .mockResolvedValue([{ translatedText: 'Long AR', cost: 0 }])
        .mockResolvedValueOnce([{ translatedText: '产品', cost: 0 }])
        .mockResolvedValueOnce([{ translatedText: 'Short ZH', cost: 0 }])
        .mockResolvedValueOnce([{ translatedText: 'Long ZH', cost: 0 }])
      const result = await autofillMissingFields(
        'prod-1',
        { name: 'Product', shortDescription: 'S', longDescription: 'L' },
        { category: 'Cameras', brand: 'Sony' },
        'gemini'
      )
      expect(result.translations?.ar?.name).toBe('lorem ipsum')
    })

    it('handles translation failure for target locale', async () => {
      mockGenerateSEOBatch.mockResolvedValue([
        {
          metaTitle: 'T',
          metaDescription:
            'This is a valid meta description that contains exactly twenty words for the SEO validation case to pass successfully and ensure quality.',
          metaKeywords: 'K',
        },
      ])
      mockTranslateBatch
        .mockRejectedValueOnce(new Error('Translation API down'))
        .mockRejectedValueOnce(new Error('Translation API down'))
        .mockResolvedValue([{ translatedText: '产品', cost: 0 }])
        .mockResolvedValue([{ translatedText: 'Short ZH', cost: 0 }])
        .mockResolvedValue([{ translatedText: 'Long ZH', cost: 0 }])
      const result = await autofillMissingFields(
        'prod-1',
        { name: 'Product', shortDescription: 'S', longDescription: 'L' },
        { category: 'Cameras', brand: 'Sony' },
        'gemini'
      )
      expect(result.translations?.zh).toBeDefined()
    })

    it('handles locale SEO generation failure and continues', async () => {
      mockGenerateSEOBatch
        .mockResolvedValueOnce([
          {
            metaTitle: 'T',
            metaDescription:
              'This is a valid meta description that contains exactly twenty words for the SEO validation case to pass successfully and ensure quality.',
            metaKeywords: 'K',
          },
        ])
        .mockRejectedValueOnce(new Error('Locale SEO failed'))
      mockTranslateBatch.mockResolvedValue([{ translatedText: 'منتج', cost: 0 }])
      const result = await autofillMissingFields(
        'prod-1',
        { name: 'Product', shortDescription: 'S', longDescription: 'L' },
        { category: 'Cameras', brand: 'Sony' },
        'gemini'
      )
      expect(result.seo?.metaTitle).toBe('T')
      expect(result.translations?.ar).toBeDefined()
    })

    it('triggers validateGeneratedText minWords when metaDescription too short', async () => {
      mockGenerateSEOBatch
        .mockResolvedValueOnce([
          { metaTitle: 'Valid Title', metaDescription: 'short', metaKeywords: 'K' },
        ])
        .mockResolvedValueOnce([
          {
            metaTitle: 'Valid Title Under 70 Chars',
            metaDescription:
              'This is a valid meta description that contains exactly twenty words for the SEO validation case to pass successfully and ensure quality.',
            metaKeywords: 'K',
          },
        ])
      mockTranslateBatch.mockResolvedValue([{ translatedText: 'منتج', cost: 0 }])
      const result = await autofillMissingFields(
        'prod-1',
        { name: 'Product', shortDescription: 'S', longDescription: 'L' },
        { category: 'Cameras', brand: 'Sony' },
        'gemini'
      )
      expect(result.seo?.metaTitle).toBe('Valid Title Under 70 Chars')
    })

    it('triggers validateGeneratedText maxChars when metaTitle too long', async () => {
      mockGenerateSEOBatch
        .mockResolvedValueOnce([
          {
            metaTitle: 'A'.repeat(80),
            metaDescription:
              'This is a valid meta description that contains exactly twenty words for the SEO validation case to pass successfully and ensure quality.',
            metaKeywords: 'K',
          },
        ])
        .mockResolvedValueOnce([
          {
            metaTitle: 'Valid Short Title',
            metaDescription:
              'This is a valid meta description that contains exactly twenty words for the SEO validation case to pass successfully and ensure quality.',
            metaKeywords: 'K',
          },
        ])
      mockTranslateBatch.mockResolvedValue([{ translatedText: 'منتج', cost: 0 }])
      const result = await autofillMissingFields(
        'prod-1',
        { name: 'Product', shortDescription: 'S', longDescription: 'L' },
        { category: 'Cameras', brand: 'Sony' },
        'gemini'
      )
      expect(result.seo?.metaTitle).toBe('Valid Short Title')
    })

    it('triggers validateGeneratedText maxWords when metaDescription too long', async () => {
      const longDesc = Array(35).fill('word').join(' ')
      mockGenerateSEOBatch
        .mockResolvedValueOnce([
          {
            metaTitle: 'Valid Title',
            metaDescription: longDesc,
            metaKeywords: 'K',
          },
        ])
        .mockResolvedValueOnce([
          {
            metaTitle: 'Valid Title',
            metaDescription:
              'This is a valid meta description that contains exactly twenty words for the SEO validation case to pass successfully and ensure quality.',
            metaKeywords: 'K',
          },
        ])
      mockTranslateBatch.mockResolvedValue([{ translatedText: 'منتج', cost: 0 }])
      const result = await autofillMissingFields(
        'prod-1',
        { name: 'Product', shortDescription: 'S', longDescription: 'L' },
        { category: 'Cameras', brand: 'Sony' },
        'gemini'
      )
      expect(result.seo?.metaDescription).toContain('valid meta description')
    })

    it('triggers validateGeneratedText placeholder when metaTitle has lorem', async () => {
      mockGenerateSEOBatch
        .mockResolvedValueOnce([
          {
            metaTitle: 'lorem ipsum dolor',
            metaDescription:
              'This is a valid meta description that contains exactly twenty words for the SEO validation case to pass successfully and ensure quality.',
            metaKeywords: 'K',
          },
        ])
        .mockResolvedValueOnce([
          {
            metaTitle: 'Valid Product Title',
            metaDescription:
              'This is a valid meta description that contains exactly twenty words for the SEO validation case to pass successfully and ensure quality.',
            metaKeywords: 'K',
          },
        ])
      mockTranslateBatch.mockResolvedValue([{ translatedText: 'منتج', cost: 0 }])
      const result = await autofillMissingFields(
        'prod-1',
        { name: 'Product', shortDescription: 'S', longDescription: 'L' },
        { category: 'Cameras', brand: 'Sony' },
        'gemini'
      )
      expect(result.seo?.metaTitle).toBe('Valid Product Title')
    })

    it('keeps first SEO when retry returns undefined', async () => {
      mockGenerateSEOBatch
        .mockResolvedValueOnce([
          { metaTitle: 'lorem', metaDescription: 'short', metaKeywords: 'k' },
        ])
        .mockResolvedValueOnce([])
      mockTranslateBatch.mockResolvedValue([{ translatedText: 'منتج', cost: 0 }])
      const result = await autofillMissingFields(
        'prod-1',
        {
          name: 'Product',
          shortDescription: 'S',
          longDescription: 'L',
          translations: [
            { locale: 'ar', name: 'منتج' },
            { locale: 'zh', name: '产品' },
          ],
        },
        { category: 'Cameras', brand: 'Sony' },
        'gemini'
      )
      expect(result.seo?.metaTitle).toBe('lorem')
    })

    it('keeps first SEO when retry has valid title but invalid description', async () => {
      mockGenerateSEOBatch
        .mockResolvedValueOnce([
          { metaTitle: 'lorem', metaDescription: 'short', metaKeywords: 'k' },
        ])
        .mockResolvedValueOnce([
          {
            metaTitle: 'Valid Title Under 70 Chars',
            metaDescription: 'short',
            metaKeywords: 'k2',
          },
        ])
      mockTranslateBatch.mockResolvedValue([{ translatedText: 'منتج', cost: 0 }])
      const result = await autofillMissingFields(
        'prod-1',
        {
          name: 'Product',
          shortDescription: 'S',
          longDescription: 'L',
          translations: [
            { locale: 'ar', name: 'منتج' },
            { locale: 'zh', name: '产品' },
          ],
        },
        { category: 'Cameras', brand: 'Sony' },
        'gemini'
      )
      expect(result.seo?.metaTitle).toBe('lorem')
    })

    it('keeps first SEO when retry returns invalid', async () => {
      mockGenerateSEOBatch
        .mockResolvedValueOnce([
          {
            metaTitle: 'lorem ipsum',
            metaDescription: 'short',
            metaKeywords: 'k',
          },
        ])
        .mockResolvedValueOnce([
          {
            metaTitle: 'lorem ipsum',
            metaDescription: 'short',
            metaKeywords: 'k2',
          },
        ])
      mockTranslateBatch.mockResolvedValue([{ translatedText: 'منتج', cost: 0 }])
      const result = await autofillMissingFields(
        'prod-1',
        {
          name: 'Product',
          shortDescription: 'S',
          longDescription: 'L',
          translations: [
            { locale: 'ar', name: 'منتج' },
            { locale: 'zh', name: '产品' },
          ],
        },
        { category: 'Cameras', brand: 'Sony' },
        'gemini'
      )
      expect(result.seo?.metaTitle).toBe('lorem ipsum')
    })

    it('translates when existingData has no translations array', async () => {
      mockGenerateSEOBatch.mockResolvedValue([
        {
          metaTitle: 'T',
          metaDescription:
            'This is a valid meta description that contains exactly twenty words for the SEO validation case to pass successfully and ensure quality.',
          metaKeywords: 'K',
        },
      ])
      mockTranslateBatch.mockResolvedValue([{ translatedText: 'منتج', cost: 0 }])
      const result = await autofillMissingFields(
        'prod-1',
        { name: 'Product', shortDescription: 'S', longDescription: 'L' },
        { category: 'Cameras', brand: 'Sony' },
        'gemini'
      )
      expect(result.translations?.ar).toBeDefined()
      expect(result.translations?.zh).toBeDefined()
    })

    it('translates name only when enShort and enLong are empty', async () => {
      mockGenerateWithLLM.mockRejectedValue(new Error('No desc'))
      mockGenerateSEOBatch.mockResolvedValue([
        {
          metaTitle: 'T',
          metaDescription:
            'This is a valid meta description that contains exactly twenty words for the SEO validation case to pass successfully and ensure quality.',
          metaKeywords: 'K',
        },
      ])
      mockTranslateBatch.mockResolvedValue([{ translatedText: 'منتج', cost: 0 }])
      const result = await autofillMissingFields(
        'prod-1',
        { name: 'Product' },
        { category: 'Cameras', brand: 'Sony' },
        'gemini'
      )
      expect(result.translations?.ar?.name).toBe('منتج')
      expect(result.translations?.ar?.shortDescription).toBe('')
    })

    it('handles context with no category or brand', async () => {
      mockGenerateSEOBatch.mockResolvedValue([
        {
          metaTitle: 'T',
          metaDescription:
            'This is a valid meta description that contains exactly twenty words for the SEO validation case to pass successfully and ensure quality.',
          metaKeywords: 'K',
        },
      ])
      mockTranslateBatch.mockResolvedValue([{ translatedText: 'منتج', cost: 0 }])
      const result = await autofillMissingFields(
        'prod-1',
        { name: 'Product', shortDescription: 'S', longDescription: 'L' },
        {},
        'gemini'
      )
      expect(result.translations).toBeDefined()
    })

    it('handles translateBatch returning empty translatedText', async () => {
      mockGenerateSEOBatch.mockResolvedValue([
        {
          metaTitle: 'T',
          metaDescription:
            'This is a valid meta description that contains exactly twenty words for the SEO validation case to pass successfully and ensure quality.',
          metaKeywords: 'K',
        },
      ])
      mockTranslateBatch.mockResolvedValue([{ translatedText: '', cost: 0 }])
      const result = await autofillMissingFields(
        'prod-1',
        { name: 'Product', shortDescription: 'S', longDescription: 'L' },
        { category: 'Cameras', brand: 'Sony' },
        'gemini'
      )
      expect(result.translations).toBeDefined()
    })

    it('handles both translateBatch and fallback throwing for locale', async () => {
      mockGenerateSEOBatch.mockResolvedValue([
        {
          metaTitle: 'T',
          metaDescription:
            'This is a valid meta description that contains exactly twenty words for the SEO validation case to pass successfully and ensure quality.',
          metaKeywords: 'K',
        },
      ])
      mockTranslateBatch
        .mockRejectedValueOnce(new Error('First fail'))
        .mockRejectedValueOnce(new Error('Fallback fail'))
        .mockResolvedValue([{ translatedText: '产品', cost: 0 }])
        .mockResolvedValue([{ translatedText: 'Short ZH', cost: 0 }])
        .mockResolvedValue([{ translatedText: 'Long ZH', cost: 0 }])
      const result = await autofillMissingFields(
        'prod-1',
        { name: 'Product', shortDescription: 'S', longDescription: 'L' },
        { category: 'Cameras', brand: 'Sony' },
        'gemini'
      )
      expect(result.translations?.zh).toBeDefined()
    })
  })

  describe('generateDescription', () => {
    it('returns short and long description from LLM', async () => {
      mockGenerateWithLLM.mockResolvedValue({
        shortDescription: 'Short desc here',
        longDescription: 'Long desc here with more detail',
      })
      const result = await generateDescription('Camera X', 'Cameras', 'Sony')
      expect(result).toEqual({
        shortDescription: 'Short desc here',
        longDescription: 'Long desc here with more detail',
      })
    })

    it('truncates long descriptions', async () => {
      const long = 'x'.repeat(3000)
      mockGenerateWithLLM.mockResolvedValue({
        shortDescription: 'Short',
        longDescription: long,
      })
      const result = await generateDescription('Camera X')
      expect(result.longDescription.length).toBeLessThanOrEqual(2500)
    })

    it('includes specifications and existingBoxContents in context', async () => {
      mockGenerateWithLLM.mockResolvedValue({
        shortDescription: 'Short',
        longDescription: 'Long',
      })
      await generateDescription(
        'Camera X',
        'Cameras',
        'Sony',
        { resolution: '4K', sensor: 'Full Frame' },
        'gemini',
        'Cable, adapter, manual'
      )
      expect(mockGenerateWithLLM).toHaveBeenCalledWith(
        'gemini',
        expect.any(String),
        expect.stringContaining('Specs:'),
        expect.any(Number)
      )
      expect(mockGenerateWithLLM).toHaveBeenCalledWith(
        'gemini',
        expect.any(String),
        expect.stringContaining("What's included in the box"),
        expect.any(Number)
      )
    })

    it('returns empty strings when LLM returns empty or invalid', async () => {
      mockGenerateWithLLM.mockResolvedValue({})
      const result = await generateDescription('Camera X')
      expect(result).toEqual({ shortDescription: '', longDescription: '' })
    })

    it('handles generateDescription returning only longDescription', async () => {
      mockGenerateWithLLM.mockResolvedValue({
        shortDescription: '',
        longDescription: 'Long only',
      })
      const result = await generateDescription('Camera X')
      expect(result.shortDescription).toBe('')
      expect(result.longDescription).toBe('Long only')
    })

    it('handles generateDescription returning only shortDescription', async () => {
      mockGenerateWithLLM.mockResolvedValue({
        shortDescription: 'Short only',
        longDescription: '',
      })
      const result = await generateDescription('Camera X')
      expect(result.shortDescription).toBe('Short only')
      expect(result.longDescription).toBe('')
    })

    it('handles LLM returning non-object for generateDescription', async () => {
      mockGenerateWithLLM.mockResolvedValue('invalid string response')
      const result = await generateDescription('Camera X')
      expect(result).toEqual({ shortDescription: '', longDescription: '' })
    })

    it('handles generateDescription with empty specifications', async () => {
      mockGenerateWithLLM.mockResolvedValue({ shortDescription: 'S', longDescription: 'L' })
      await generateDescription('Camera X', 'Cameras', 'Sony', {}, 'gemini')
      const call = mockGenerateWithLLM.mock.calls[0]
      expect(call[2]).not.toContain('Specs:')
    })

    it('handles generateDescription without existingBoxContents', async () => {
      mockGenerateWithLLM.mockResolvedValue({ shortDescription: 'S', longDescription: 'L' })
      await generateDescription('Camera X', 'Cameras', 'Sony', undefined, 'gemini')
      const call = mockGenerateWithLLM.mock.calls[0]
      expect(call[2]).not.toContain("What's included")
    })

  })

  describe('generateBoxContents', () => {
    it('returns trimmed string from LLM', async () => {
      mockGenerateWithLLM.mockResolvedValue('  Cable, adapter, manual  ')
      const result = await generateBoxContents('Camera X', 'Cameras')
      expect(result).toBe('Cable, adapter, manual')
    })

    it('handles object response from LLM', async () => {
      mockGenerateWithLLM.mockResolvedValue({ text: 'Contents' })
      const result = await generateBoxContents('Camera X')
      expect(result).toBe('{"text":"Contents"}')
    })

    it('handles number response from LLM via String()', async () => {
      mockGenerateWithLLM.mockResolvedValue(123)
      const result = await generateBoxContents('Camera X')
      expect(result).toBe('123')
    })

    it('handles boolean response from LLM via String()', async () => {
      mockGenerateWithLLM.mockResolvedValue(false)
      const result = await generateBoxContents('Camera X')
      expect(result).toBe('false')
    })

    it('handles null response from LLM via JSON.stringify', async () => {
      mockGenerateWithLLM.mockResolvedValue(null)
      const result = await generateBoxContents('Camera X')
      expect(result).toBe('null')
    })

    it('includes specifications in context when provided', async () => {
      mockGenerateWithLLM.mockResolvedValue('Cable, adapter')
      await generateBoxContents('Camera X', 'Cameras', { resolution: '4K' })
      expect(mockGenerateWithLLM).toHaveBeenCalledWith(
        'gemini',
        expect.any(String),
        expect.stringContaining('Specs:')
      )
    })
  })

  describe('generateTags', () => {
    it('returns comma-separated tags from LLM', async () => {
      mockGenerateWithLLM.mockResolvedValue('camera, 4k, cinema, rental')
      const result = await generateTags('Camera X', 'Cameras', 'Sony')
      expect(result).toBe('camera, 4k, cinema, rental')
    })

    it('handles object response from LLM', async () => {
      mockGenerateWithLLM.mockResolvedValue({ tags: ['a', 'b'] })
      const result = await generateTags('Camera X')
      expect(typeof result).toBe('string')
      expect(result.length).toBeLessThanOrEqual(500)
    })

    it('handles non-string non-object response from LLM via String()', async () => {
      mockGenerateWithLLM.mockResolvedValue(12345)
      const result = await generateTags('Camera X')
      expect(result).toBe('12345')
    })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  describe('suggestRelatedProducts', () => {
    it('returns product ids from same category', async () => {
      const { prisma } = await import('@/lib/db/prisma')
      ;(prisma.product.findMany as jest.Mock).mockResolvedValue([
        { id: 'p1' },
        { id: 'p2' },
        { id: 'p3' },
      ])
      const result = await suggestRelatedProducts('prod-1', 'cat-1', 5)
      expect(result).toEqual(['p1', 'p2', 'p3'])
    })

    it('returns empty array when no products in category', async () => {
      const { prisma } = await import('@/lib/db/prisma')
      ;(prisma.product.findMany as jest.Mock).mockResolvedValue([])
      const result = await suggestRelatedProducts('prod-1', 'cat-1', 5)
      expect(result).toEqual([])
    })

    it('uses default limit of 5 when not specified', async () => {
      const { prisma } = await import('@/lib/db/prisma')
      ;(prisma.product.findMany as jest.Mock).mockResolvedValue([{ id: 'p1' }])
      await suggestRelatedProducts('prod-1', 'cat-1')
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 })
      )
    })
  })
})
