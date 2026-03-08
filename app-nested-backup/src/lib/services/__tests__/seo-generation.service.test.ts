/**
 * Unit tests for seo-generation.service
 * Covers: generateSEO (fallback, OpenAI, Gemini), generateSEOBatch
 */

import { generateSEO, generateSEOBatch } from '../seo-generation.service'
import { prisma } from '@/lib/db/prisma'

const mockCreate = jest.fn()
jest.mock('openai', () => ({
  __esModule: true,
  default: function MockOpenAI() {
    return {
      chat: {
        completions: {
          create: mockCreate,
        },
      },
    }
  },
}))

const mockGenerateContent = jest.fn()
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: mockGenerateContent,
    }),
  })),
}))

jest.mock('@/lib/db/prisma', () => ({
  prisma: { aISettings: { findUnique: jest.fn().mockResolvedValue(null) } },
}))

const mockDecrypt = jest.fn((x: string) => x.replace(/^enc:/, ''))
const mockIsEncrypted = jest.fn((_x?: string) => false)
jest.mock('@/lib/utils/encryption', () => ({
  decrypt: (x: string) => mockDecrypt(x),
  isEncrypted: (x?: string) => mockIsEncrypted(x),
}))

const originalEnv = process.env

describe('seo-generation.service', () => {
  beforeEach(() => {
    process.env = { ...originalEnv }
    process.env.OPENAI_API_KEY = 'sk-test'
    process.env.GEMINI_API_KEY = undefined
    process.env.GOOGLE_GENERATIVE_AI_API_KEY = undefined
    ;(prisma.aISettings.findUnique as jest.Mock).mockResolvedValue(null)
    mockCreate.mockResolvedValue({
      choices: [{ message: { content: JSON.stringify({ metaTitle: 'T', metaDescription: 'D', metaKeywords: 'K' }) } }],
      usage: { prompt_tokens: 100, completion_tokens: 50 },
    })
    mockGenerateContent.mockResolvedValue({
      response: { text: () => JSON.stringify({ metaTitle: 'T', metaDescription: 'D', metaKeywords: 'K' }) },
    })
    mockIsEncrypted.mockReturnValue(false)
    mockDecrypt.mockImplementation((x: string) => x.replace(/^enc:/, ''))
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('generateSEO', () => {
    it('returns fallback when no API key', async () => {
      process.env.OPENAI_API_KEY = undefined
      const result = await generateSEO({ name: 'Sony FX3', description: 'Pro camera', brand: 'Sony', category: 'Cameras' })
      expect(result).toMatchObject({
        metaTitle: 'Sony FX3',
        metaDescription: expect.any(String),
        metaKeywords: expect.stringContaining('Sony'),
        provider: 'openai',
      })
    })

    it('returns OpenAI result when API key present', async () => {
      const result = await generateSEO({ name: 'Sony FX3 Camera' })
      expect(result).toMatchObject({
        metaTitle: expect.any(String),
        metaDescription: expect.any(String),
        metaKeywords: expect.any(String),
        provider: 'openai',
      })
      expect(result.cost).toBeDefined()
    })

    it('returns Gemini result when provider is gemini', async () => {
      process.env.OPENAI_API_KEY = undefined
      process.env.GEMINI_API_KEY = 'gemini-key'
      const result = await generateSEO({ name: 'Sony FX3' }, 'gemini')
      expect(result.provider).toBe('gemini')
    })

    it('uses DB key when aISettings has valid key', async () => {
      ;(prisma.aISettings.findUnique as jest.Mock).mockResolvedValue({
        enabled: true,
        apiKey: 'sk-db-key-1234567890',
      })
      process.env.OPENAI_API_KEY = undefined
      const result = await generateSEO({ name: 'Sony FX3' })
      expect(result).toMatchObject({ provider: 'openai' })
    })

    it('falls back to env when decrypt throws for encrypted DB key', async () => {
      mockIsEncrypted.mockReturnValue(true)
      mockDecrypt.mockImplementation(() => {
        throw new Error('Decrypt failed')
      })
      ;(prisma.aISettings.findUnique as jest.Mock).mockResolvedValue({
        enabled: true,
        apiKey: 'a'.repeat(32) + ':bad-encrypted',
      })
      process.env.OPENAI_API_KEY = 'sk-env-fallback'
      const result = await generateSEO({ name: 'Sony FX3' })
      expect(result).toMatchObject({ provider: 'openai' })
    })

    it('returns fallback when OpenAI throws', async () => {
      mockCreate.mockRejectedValueOnce(new Error('API error'))
      const result = await generateSEO({ name: 'Sony FX3', brand: 'Sony' })
      expect(result.provider).toBe('openai')
      expect(result.metaTitle).toBe('Sony FX3')
    })

    it('returns fallback when OpenAI returns empty content', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: '' } }],
        usage: { prompt_tokens: 100, completion_tokens: 50 },
      })
      const result = await generateSEO({ name: 'Sony FX3', brand: 'Sony' })
      expect(result.provider).toBe('openai')
      expect(result.metaTitle).toBe('Sony FX3')
    })

    it('uses fallback when parsed fields are empty', async () => {
      mockCreate.mockResolvedValueOnce({
        choices: [{ message: { content: JSON.stringify({ metaTitle: '', metaDescription: '', metaKeywords: '' }) } }],
        usage: { prompt_tokens: 100, completion_tokens: 50 },
      })
      const result = await generateSEO({ name: 'Sony FX3', description: 'Pro camera', brand: 'Sony', category: 'Cameras' })
      expect(result.metaTitle).toBe('Sony FX3')
      expect(result.metaDescription).toBe('Pro camera')
    })

    it('returns Gemini fallback when generateContent throws', async () => {
      process.env.OPENAI_API_KEY = undefined
      process.env.GEMINI_API_KEY = 'gemini-key'
      mockGenerateContent.mockRejectedValueOnce(new Error('Gemini API error'))
      const result = await generateSEO({ name: 'Sony FX3', brand: 'Sony' }, 'gemini')
      expect(result.provider).toBe('gemini')
      expect(result.metaTitle).toBe('Sony FX3')
    })

    it('throws for unsupported provider when API key present', async () => {
      process.env.OPENAI_API_KEY = undefined
      process.env.GEMINI_API_KEY = undefined
      ;(prisma.aISettings.findUnique as jest.Mock).mockResolvedValue({ enabled: true, apiKey: 'sk-unsupported-key-12345' })
      await expect(generateSEO({ name: 'X' }, 'unsupported' as any)).rejects.toThrow('Unsupported provider')
    })
  })

  describe('generateSEOBatch', () => {
    it('returns fallback for all when no API key', async () => {
      process.env.OPENAI_API_KEY = undefined
      const results = await generateSEOBatch([{ name: 'A' }, { name: 'B' }])
      expect(results).toHaveLength(2)
      expect(results[0].metaTitle).toBe('A')
      expect(results[1].metaTitle).toBe('B')
    })

    it('returns batch results from OpenAI', async () => {
      const results = await generateSEOBatch([{ name: 'Product A' }, { name: 'Product B' }])
      expect(results).toHaveLength(2)
      expect(results[0].provider).toBe('openai')
      expect(results[1].provider).toBe('openai')
    })

    it('processes multiple batches when batchSize is small', async () => {
      ;(prisma.aISettings.findUnique as jest.Mock).mockResolvedValue({
        enabled: true,
        apiKey: 'sk-db-key-1234567890',
        batchSize: 1,
      })
      process.env.OPENAI_API_KEY = undefined
      const results = await generateSEOBatch([{ name: 'A' }, { name: 'B' }])
      expect(results).toHaveLength(2)
      expect(results[0].provider).toBe('openai')
      expect(results[1].provider).toBe('openai')
    })

    it('returns fallback for failed items in batch', async () => {
      mockCreate
        .mockResolvedValueOnce({ choices: [{ message: { content: JSON.stringify({ metaTitle: 'T', metaDescription: 'D', metaKeywords: 'K' }) } }], usage: {} })
        .mockRejectedValueOnce(new Error('Fail'))
      const results = await generateSEOBatch([
        { name: 'A' },
        { name: 'B', description: 'Product B description for fallback' },
      ])
      expect(results).toHaveLength(2)
      expect(results[1].metaTitle).toBe('B')
      expect(results[1].metaDescription).toBe('Product B description for fallback')
    })

    it('uses DB encrypted key when aISettings has encrypted apiKey', async () => {
      mockIsEncrypted.mockReturnValue(true)
      mockDecrypt.mockReturnValue('sk-decrypted-key-1234567890')
      ;(prisma.aISettings.findUnique as jest.Mock).mockResolvedValue({
        enabled: true,
        apiKey: 'a'.repeat(32) + ':encrypted-payload',
      })
      process.env.OPENAI_API_KEY = undefined
      const results = await generateSEOBatch([{ name: 'Product A' }])
      expect(results).toHaveLength(1)
      expect(results[0].provider).toBe('openai')
    })

    it('falls back to env when decrypt throws in batch', async () => {
      mockIsEncrypted.mockReturnValue(true)
      mockDecrypt.mockImplementation(() => {
        throw new Error('Decrypt failed')
      })
      ;(prisma.aISettings.findUnique as jest.Mock).mockResolvedValue({
        enabled: true,
        apiKey: 'a'.repeat(32) + ':bad',
      })
      process.env.OPENAI_API_KEY = undefined
      const results = await generateSEOBatch([{ name: 'A' }])
      expect(results).toHaveLength(1)
      expect(results[0].metaTitle).toBe('A')
    })

    it('returns batch results from Gemini provider', async () => {
      process.env.OPENAI_API_KEY = undefined
      process.env.GEMINI_API_KEY = 'gemini-key'
      const results = await generateSEOBatch([{ name: 'Product A' }, { name: 'Product B' }], 'gemini')
      expect(results).toHaveLength(2)
      expect(results[0].provider).toBe('gemini')
      expect(results[1].provider).toBe('gemini')
    })

    it('returns fallback for failed items in Gemini batch', async () => {
      process.env.OPENAI_API_KEY = undefined
      process.env.GEMINI_API_KEY = 'gemini-key'
      mockGenerateContent
        .mockResolvedValueOnce({
          response: { text: () => JSON.stringify({ metaTitle: 'T', metaDescription: 'D', metaKeywords: 'K' }) },
        })
        .mockRejectedValueOnce(new Error('Gemini fail'))
      const results = await generateSEOBatch(
        [{ name: 'A' }, { name: 'B', description: 'B desc', brand: 'Brand', category: 'Cat' }],
        'gemini'
      )
      expect(results).toHaveLength(2)
      expect(results[0].provider).toBe('gemini')
      expect(results[1].provider).toBe('gemini')
      expect(results[1].metaTitle).toBe('B')
      expect(results[1].metaDescription).toBe('B desc')
      expect(results[1].metaKeywords).toContain('Brand')
    })
  })
})
