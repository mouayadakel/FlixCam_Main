/**
 * Translation service tests
 */
import {
  TranslationService,
  getCachedTranslation,
  setCachedTranslation,
  getTranslationCacheKey,
  translateText,
  translateProductFields,
  translateBatch,
} from '../translation.service'
import { prisma } from '@/lib/db/prisma'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    translation: { findMany: jest.fn(), updateMany: jest.fn(), create: jest.fn() },
    $transaction: jest.fn(),
  },
}))
jest.mock('@/lib/queue/redis.client', () => {
  const mockGet = jest.fn().mockResolvedValue(null)
  const mockClient = jest.fn().mockReturnValue({
    get: mockGet,
    set: jest.fn().mockResolvedValue(undefined),
    setex: jest.fn().mockResolvedValue(undefined),
  })
  return {
    getRedisClient: mockClient,
    __mockRedisGet: mockGet,
    __mockGetRedisClient: mockClient,
  }
})
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: () => ({
      generateContent: () =>
        process.env.USE_OPENAI_FALLBACK
          ? Promise.reject(new Error('Gemini down'))
          : Promise.resolve({
              response: { text: () => 'مترجم' },
            }),
    }),
  })),
}))
jest.mock('openai', () =>
  jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: () =>
          Promise.resolve({
            choices: [{ message: { content: 'مترجم من OpenAI' } }],
            usage: { prompt_tokens: 10, completion_tokens: 5 },
          }),
      },
    },
  }))
)

const mockFindMany = prisma.translation.findMany as jest.Mock
const mockTransaction = prisma.$transaction as jest.Mock
const redisMock = require('@/lib/queue/redis.client') as {
  __mockRedisGet: jest.Mock
  __mockGetRedisClient: jest.Mock
}

describe('TranslationService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFindMany.mockResolvedValue([])
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        translation: {
          updateMany: jest.fn().mockResolvedValue({}),
          create: jest.fn().mockResolvedValue({ id: 't_01', field: 'name', language: 'ar', value: 'اسم' }),
        },
      }
      return fn(tx)
    })
  })

  describe('getTranslations', () => {
    it('returns grouped translations by language and field', async () => {
      mockFindMany.mockResolvedValue([
        { language: 'ar', field: 'name', value: 'اسم' },
        { language: 'ar', field: 'description', value: 'وصف' },
      ])
      const result = await TranslationService.getTranslations('product', 'prod_01')
      expect(result).toHaveProperty('ar')
      expect(result.ar).toMatchObject({ name: 'اسم', description: 'وصف' })
    })
  })

  describe('getTranslationsByLocale', () => {
    it('returns translations formatted by locale', async () => {
      mockFindMany.mockResolvedValue([
        { language: 'ar', field: 'name', value: 'اسم' },
        { language: 'ar', field: 'short_description', value: 'وصف قصير' },
      ])
      const result = await TranslationService.getTranslationsByLocale('product', 'prod_01')
      expect(result).toHaveProperty('ar')
      expect(result.ar?.name).toBe('اسم')
      expect(result.ar?.shortDescription).toBe('وصف قصير')
    })

    it('returns empty locales when no translations', async () => {
      mockFindMany.mockResolvedValue([])
      const result = await TranslationService.getTranslationsByLocale('product', 'prod_01')
      expect(Object.keys(result)).toHaveLength(0)
    })
  })

  describe('saveTranslations', () => {
    it('saves translations in transaction', async () => {
      const result = await TranslationService.saveTranslations(
        'product',
        'prod_01',
        [{ field: 'name', language: 'ar', value: 'اسم' }],
        'usr_01'
      )
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('deleteTranslations', () => {
    it('soft deletes translations and returns success', async () => {
      const result = await TranslationService.deleteTranslations('product', 'prod_01', 'usr_01')
      expect(result).toEqual({ success: true })
    })
  })

  describe('formatTranslationsForSave', () => {
    it('converts form translations to TranslationInput array', () => {
      const input = [
        { locale: 'ar', name: 'اسم', shortDescription: 'وصف قصير', longDescription: 'وصف طويل', seoTitle: 'SEO', seoDescription: 'SEO Desc', seoKeywords: 'kw' },
      ]
      const result = TranslationService.formatTranslationsForSave(input)
      expect(result).toContainEqual({ field: 'name', language: 'ar', value: 'اسم' })
      expect(result).toContainEqual({ field: 'shortDescription', language: 'ar', value: 'وصف قصير' })
      expect(result).toContainEqual({ field: 'longDescription', language: 'ar', value: 'وصف طويل' })
    })

    it('uses description when longDescription not provided', () => {
      const result = TranslationService.formatTranslationsForSave([
        { locale: 'ar', description: 'Desc only' },
      ])
      expect(result).toContainEqual({ field: 'longDescription', language: 'ar', value: 'Desc only' })
    })

    it('skips empty fields', () => {
      const result = TranslationService.formatTranslationsForSave([
        { locale: 'ar', name: '', shortDescription: undefined },
      ])
      expect(result).toHaveLength(0)
    })
  })
})

describe('getCachedTranslation / setCachedTranslation', () => {
  it('returns null when key not in cache', () => {
    expect(getCachedTranslation('missing')).toBeNull()
  })

  it('returns value when set then get', () => {
    setCachedTranslation('key1', 'translated')
    expect(getCachedTranslation('key1')).toBe('translated')
  })
})

describe('translateText', () => {
  const originalEnv = process.env

  beforeEach(() => {
    redisMock.__mockRedisGet?.mockResolvedValue(null)
    redisMock.__mockGetRedisClient?.mockReturnValue({
      get: redisMock.__mockRedisGet,
      set: jest.fn().mockResolvedValue(undefined),
      setex: jest.fn().mockResolvedValue(undefined),
    })
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    delete process.env.USE_OPENAI_FALLBACK
    process.env = originalEnv
  })

  it('returns cached translation when in memory cache', async () => {
    setCachedTranslation(getTranslationCacheKey('hello', 'en', 'ar'), 'مرحبا')
    const result = await translateText('hello', 'ar', 'en')
    expect(result).toEqual({ translated: 'مرحبا', cost: 0, cached: true })
  })

  it('returns cached translation when in Redis cache', async () => {
    redisMock.__mockRedisGet.mockResolvedValue('من Redis')
    const result = await translateText('redis-cached', 'ar', 'en')
    expect(result).toEqual({ translated: 'من Redis', cost: 0, cached: true })
  })

  it('calls Gemini API when no cache and GEMINI_API_KEY set', async () => {
    process.env.GEMINI_API_KEY = 'test-key'
    delete process.env.GOOGLE_GENERATIVE_AI_API_KEY
    const result = await translateText('uncached-gemini', 'ar', 'en')
    expect(result.cached).toBe(false)
    expect(result.translated).toBe('مترجم')
    expect(result.cost).toBeGreaterThanOrEqual(0)
  })

  it('uses zh locale label when targetLocale is zh', async () => {
    process.env.GEMINI_API_KEY = 'test-key'
    const result = await translateText('hello', 'zh', 'en')
    expect(result.cached).toBe(false)
    expect(result.translated).toBe('مترجم')
  })

  it('uses en locale label when targetLocale is en', async () => {
    process.env.GEMINI_API_KEY = 'test-key'
    const result = await translateText('مرحبا', 'en', 'ar')
    expect(result.cached).toBe(false)
    expect(result.translated).toBe('مترجم')
  })

  it('falls back to OpenAI when Gemini fails and OPENAI_API_KEY set', async () => {
    process.env.GEMINI_API_KEY = 'test-key'
    process.env.OPENAI_API_KEY = 'test-openai-key'
    process.env.USE_OPENAI_FALLBACK = '1'
    const result = await translateText('uncached-openai', 'ar', 'en')
    expect(result.cached).toBe(false)
    expect(result.translated).toBe('مترجم من OpenAI')
    delete process.env.USE_OPENAI_FALLBACK
  })

  it('proceeds to API when Redis get throws', async () => {
    redisMock.__mockRedisGet.mockRejectedValue(new Error('Redis down'))
    process.env.GEMINI_API_KEY = 'test-key'
    const result = await translateText('redis-error', 'ar', 'en')
    expect(result.cached).toBe(false)
    expect(result.translated).toBe('مترجم')
  })

  it('proceeds to API when getRedisClient throws', async () => {
    redisMock.__mockGetRedisClient.mockImplementation(() => {
      throw new Error('Redis unavailable')
    })
    process.env.GEMINI_API_KEY = 'test-key'
    const result = await translateText('redis-unavailable', 'ar', 'en')
    expect(result.cached).toBe(false)
    expect(result.translated).toBe('مترجم')
  })
})

describe('translateProductFields', () => {
  beforeEach(() => {
    setCachedTranslation(getTranslationCacheKey('Camera', 'en', 'ar'), 'كاميرا')
  })

  it('translates fields and returns result', async () => {
    const result = await translateProductFields('prod_01', 'ar', { name: 'Camera' })
    expect(result.translations.name).toBe('كاميرا')
    expect(result).toHaveProperty('totalCost')
    expect(result).toHaveProperty('cached')
  })

  it('skips empty fields', async () => {
    const result = await translateProductFields('prod_01', 'ar', { name: '', desc: '   ' })
    expect(Object.keys(result.translations)).toHaveLength(0)
  })
})

describe('translateBatch', () => {
  beforeEach(() => {
    setCachedTranslation(getTranslationCacheKey('hi', 'en', 'ar'), 'مرحبا')
  })

  it('translates batch items', async () => {
    const result = await translateBatch([
      { text: 'hi', sourceLocale: 'en', targetLocale: 'ar' },
    ])
    expect(result).toHaveLength(1)
    expect(result[0].translatedText).toBe('مرحبا')
  })
})
