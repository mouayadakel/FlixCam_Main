/**
 * Unit tests for ai-spec-parser.service
 * PATHS: inferMissingSpecs (null → zeros; no missing keys → zeros; missing keys → LLM path mocked)
 */

const mockGetExpectedSpecs = jest.fn()
const mockFlattenStructuredSpecs = jest.fn((s: Record<string, string>) => s)
const mockResolveSpecKey = jest.fn((k: string) => k)

jest.mock('@/lib/ai/spec-templates', () => ({
  getExpectedSpecs: (x: string) => mockGetExpectedSpecs(x),
}))

jest.mock('@/lib/utils/specifications.utils', () => ({
  flattenStructuredSpecs: (x: Record<string, string>) => mockFlattenStructuredSpecs(x),
  resolveSpecKey: (x: string) => mockResolveSpecKey(x),
}))

const mockOpenAICreate = jest.fn()
const mockGeminiGenerateContent = jest.fn()

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: mockOpenAICreate,
      },
    },
  })),
}))

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: () => ({
      generateContent: mockGeminiGenerateContent,
    }),
  })),
}))

const mockIsStructuredSpecifications = jest.fn()
jest.mock('@/lib/types/specifications.types', () => {
  const actual = jest.requireActual('@/lib/types/specifications.types')
  return {
    ...actual,
    isStructuredSpecifications: (...args: unknown[]) => mockIsStructuredSpecifications(...args),
  }
})

import { inferMissingSpecs } from '../ai-spec-parser.service'

const JSON_ARRAY_OPENAI = [
  { key: 'Resolution', value: '4K DCI', confidence: 95 },
  { key: 'Frame Rate', value: '24fps', confidence: 80 },
  { key: 'Codec', value: 'ProRes', confidence: 50 },
]

const JSON_ARRAY_GEMINI = [
  { key: 'Resolution', value: '6K', confidence: 92 },
  { key: 'Frame Rate', value: '60fps', confidence: 65 },
]

describe('ai-spec-parser.service', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv }
    mockGetExpectedSpecs.mockReturnValue(['Resolution', 'Frame Rate'])
    mockResolveSpecKey.mockImplementation((k: string) => k)
    mockFlattenStructuredSpecs.mockImplementation((s: Record<string, string>) => s)
    mockIsStructuredSpecifications.mockReturnValue(false)
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('inferMissingSpecs', () => {
    it('returns zeros when product is null', async () => {
      const result = await inferMissingSpecs(null)
      expect(result).toEqual({ specs: [], autoSaved: 0, suggestions: 0, discarded: 0, cost: 0 })
    })

    it('returns zeros when no missing keys', async () => {
      const result = await inferMissingSpecs({
        id: 'p1',
        sku: 'SKU1',
        translations: [
          {
            locale: 'en',
            name: 'Camera',
            shortDescription: 'Desc',
            longDescription: 'Long',
            specifications: { Resolution: '4K', 'Frame Rate': '24fps' },
          },
        ],
      })
      expect(result.specs).toEqual([])
      expect(result.autoSaved).toBe(0)
      expect(result.suggestions).toBe(0)
    })

    it('uses OpenAI and returns inferred specs with autoSaved/suggestions/discarded', async () => {
      mockGetExpectedSpecs.mockReturnValue(['Resolution', 'Frame Rate', 'Codec'])
      process.env.OPENAI_API_KEY = 'sk-test'
      mockOpenAICreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify(JSON_ARRAY_OPENAI),
          },
        }],
      })
      const result = await inferMissingSpecs({
        id: 'p1',
        sku: 'SKU1',
        translations: [{
          locale: 'en',
          name: 'Camera',
          shortDescription: 'Desc',
          longDescription: 'Long',
          specifications: {},
        }],
      })
      expect(result.specs.length).toBeGreaterThan(0)
      expect(result.autoSaved).toBe(1)
      expect(result.suggestions).toBe(1)
      expect(result.discarded).toBe(1)
      expect(result.cost).toBe(0.0002)
    })

    it('uses Gemini when OpenAI fails', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      delete process.env.GEMINI_API_KEY
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'gemini-test'
      mockOpenAICreate.mockRejectedValue(new Error('OpenAI error'))
      mockGeminiGenerateContent.mockResolvedValue({
        response: { text: () => JSON.stringify(JSON_ARRAY_GEMINI) },
      })
      const result = await inferMissingSpecs({
        id: 'p1',
        sku: 'SKU1',
        translations: [{
          locale: 'en',
          name: 'Camera',
          shortDescription: 'Desc',
          longDescription: 'Long',
          specifications: {},
        }],
      })
      expect(result.specs.length).toBeGreaterThan(0)
      expect(result.cost).toBe(0.0001)
    })

    it('returns zeros when Gemini throws after OpenAI fails', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'gemini-test'
      mockOpenAICreate.mockRejectedValue(new Error('OpenAI error'))
      mockGeminiGenerateContent.mockRejectedValue(new Error('Gemini error'))
      const result = await inferMissingSpecs({
        id: 'p1',
        sku: 'SKU1',
        translations: [{
          locale: 'en',
          name: 'Camera',
          shortDescription: 'Desc',
          longDescription: 'Long',
          specifications: {},
        }],
      })
      expect(result).toEqual({ specs: [], autoSaved: 0, suggestions: 0, discarded: 0, cost: 0 })
    })

    it('returns zeros when no API key and when both LLMs fail', async () => {
      delete process.env.OPENAI_API_KEY
      delete process.env.GEMINI_API_KEY
      delete process.env.GOOGLE_GENERATIVE_AI_API_KEY
      const result = await inferMissingSpecs({
        id: 'p1',
        sku: 'SKU1',
        translations: [{
          locale: 'en',
          name: 'Camera',
          shortDescription: 'Desc',
          longDescription: 'Long',
          specifications: {},
        }],
      })
      expect(result).toEqual({ specs: [], autoSaved: 0, suggestions: 0, discarded: 0, cost: 0 })
    })

    it('uses flattenStructuredSpecs when specs are structured', async () => {
      mockIsStructuredSpecifications.mockReturnValue(true)
      mockFlattenStructuredSpecs.mockReturnValue({ Resolution: '4K', 'Frame Rate': '24fps' })
      const result = await inferMissingSpecs({
        id: 'p1',
        sku: 'SKU1',
        translations: [{
          locale: 'en',
          name: 'Camera',
          shortDescription: 'Desc',
          longDescription: 'Long',
          specifications: { groups: [{ name: 'Video', specs: [{ key: 'Resolution', value: '4K' }] }] },
        }],
      })
      expect(result.specs).toEqual([])
      expect(mockFlattenStructuredSpecs).toHaveBeenCalled()
    })

    it('filters out empty values and uses resolveSpecKey for missing lookup', async () => {
      mockGetExpectedSpecs.mockReturnValue(['Resolution', 'sensor_size'])
      mockResolveSpecKey.mockImplementation((k) => (k === 'sensor_size' ? 'sensor' : k))
      process.env.OPENAI_API_KEY = 'sk-test'
      mockOpenAICreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify([
              { key: 'Resolution', value: '4K', confidence: 95 },
              { key: 'sensor_size', value: '   ', confidence: 80 },
            ]),
          },
        }],
      })
      const result = await inferMissingSpecs({
        id: 'p1',
        sku: 'SKU1',
        translations: [{
          locale: 'en',
          name: 'Camera',
          shortDescription: 'Desc',
          longDescription: 'Long',
          specifications: { sensor: 'Super 35mm' },
        }],
      })
      expect(result.specs.some((s) => s.key === 'Resolution')).toBe(true)
      expect(result.specs.some((s) => s.key === 'sensor_size' && String(s.value).trim() === '')).toBe(false)
    })

    it('uses first translation when en not found', async () => {
      mockGetExpectedSpecs.mockReturnValue(['Resolution'])
      process.env.OPENAI_API_KEY = 'sk-test'
      mockOpenAICreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify([{ key: 'Resolution', value: '4K', confidence: 95 }]),
          },
        }],
      })
      const result = await inferMissingSpecs({
        id: 'p1',
        sku: 'SKU-FALLBACK',
        translations: [
          { locale: 'ar', name: 'كاميرا', shortDescription: 'x', longDescription: 'x', specifications: {} },
        ],
      })
      expect(result.specs.length).toBeGreaterThan(0)
    })

    it('handles JSON wrapped in markdown code block', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      mockOpenAICreate.mockResolvedValue({
        choices: [{
          message: {
            content: '```json\n' + JSON.stringify(JSON_ARRAY_OPENAI) + '\n```',
          },
        }],
      })
      const result = await inferMissingSpecs({
        id: 'p1',
        sku: 'SKU1',
        translations: [{
          locale: 'en',
          name: 'Camera',
          shortDescription: 'Desc',
          longDescription: 'Long',
          specifications: {},
        }],
      })
      expect(result.specs.length).toBeGreaterThan(0)
    })

    it('uses default confidence 50 when not a number', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      mockOpenAICreate.mockResolvedValue({
        choices: [{
          message: {
            content: JSON.stringify([
              { key: 'Resolution', value: '4K', confidence: 'high' },
            ]),
          },
        }],
      })
      const result = await inferMissingSpecs({
        id: 'p1',
        sku: 'SKU1',
        translations: [{
          locale: 'en',
          name: 'Camera',
          shortDescription: 'Desc',
          longDescription: 'Long',
          specifications: {},
        }],
      })
      expect(result.specs[0].confidence).toBe(50)
    })
  })
})
