/**
 * Unit tests for ai-content-generation.service
 *
 * EXECUTION PATH MAP:
 * - resolveApiKey: db null → env; db has key → use db; encrypted → decrypt; no key → throw
 * - generateWithLLM: openai path (plain text, JSON parse success, JSON parse fail);
 *   gemini path (plain text, JSON parse success, JSON parse fail); unsupported → throw
 * - generateMasterFill: success first attempt; parse fail → retry; throw → retry; attempt 2 → switch provider;
 *   all fail → fallback
 */

const mockFindUnique = jest.fn()
const mockDecrypt = jest.fn((x: string) => x.replace('enc:', ''))
const mockIsEncrypted = jest.fn(() => false)
const mockOpenAICreate = jest.fn()
const mockGeminiGenerateContent = jest.fn()
const mockBuildMasterFillPrompt = jest.fn()
const mockParseMasterFillOutput = jest.fn()

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    aISettings: { findUnique: (...args: unknown[]) => mockFindUnique(...args) },
  },
}))

jest.mock('@/lib/utils/encryption', () => ({
  decrypt: (x: string) => mockDecrypt(x),
  isEncrypted: () => mockIsEncrypted(),
}))

jest.mock('@/lib/prompts/master-fill', () => ({
  MASTER_SYSTEM_PROMPT: 'System prompt',
  buildMasterFillPrompt: (x: unknown) => mockBuildMasterFillPrompt(x),
  parseMasterFillOutput: (x: unknown, y?: unknown) => mockParseMasterFillOutput(x, y),
}))

jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: (...args: unknown[]) => mockOpenAICreate(...args),
      },
    },
  })),
}))

jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: (...args: unknown[]) => mockGeminiGenerateContent(...args),
    }),
  })),
}))

const originalEnv = process.env

const validMasterFillOutput = {
  brand: 'Sony',
  category_suggestion: 'Cameras',
  slug: 'sony-fx3',
  short_desc_en: 'Short',
  long_desc_en: 'Long',
  seo_title_en: 'Title',
  seo_desc_en: 'Desc',
  seo_keywords_en: ['k1'],
  name_ar: 'سوني',
  short_desc_ar: 'قصر',
  long_desc_ar: 'طويل',
  seo_title_ar: 'عنوان',
  seo_desc_ar: 'وصف',
  seo_keywords_ar: ['ك1'],
  name_zh: '索尼',
  short_desc_zh: '短',
  long_desc_zh: '长',
  seo_title_zh: '标题',
  seo_desc_zh: '描述',
  seo_keywords_zh: ['关1'],
}

describe('ai-content-generation.service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    jest.spyOn(console, 'info').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})
    process.env = { ...originalEnv }
    process.env.OPENAI_API_KEY = 'sk-test'
    process.env.GEMINI_API_KEY = 'gemini-test'
    mockFindUnique.mockResolvedValue(null)
    mockBuildMasterFillPrompt.mockReturnValue('Built prompt')
    mockParseMasterFillOutput.mockImplementation((raw: string) => {
      if (raw && raw.includes('short_desc_en')) {
        return { ...validMasterFillOutput, _parse_failed: false }
      }
      return { ...validMasterFillOutput, _needs_review: true, _parse_failed: true }
    })
    mockOpenAICreate.mockResolvedValue({
      choices: [{ message: { content: 'Generated content' } }],
    })
    mockGeminiGenerateContent.mockResolvedValue({
      response: { text: () => 'Gemini content' },
    })
  })

  afterEach(() => {
    process.env = originalEnv
    jest.restoreAllMocks()
  })

  describe('generateWithLLM', () => {
    it('returns string from OpenAI when content has no JSON', async () => {
      const { generateWithLLM } = await import('../ai-content-generation.service')
      const result = await generateWithLLM('openai', 'System', 'User', 500)
      expect(result).toBe('Generated content')
    })

    it('returns parsed object from OpenAI when content has valid JSON', async () => {
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: '  { "shortDescription": "A", "longDescription": "B" }  ' } }],
      })
      const { generateWithLLM } = await import('../ai-content-generation.service')
      const result = await generateWithLLM('openai', 'System', 'User', 500)
      expect(result).toEqual({ shortDescription: 'A', longDescription: 'B' })
    })

    it('returns raw content when OpenAI JSON parse fails', async () => {
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: '  { invalid json }  ' } }],
      })
      const { generateWithLLM } = await import('../ai-content-generation.service')
      const result = await generateWithLLM('openai', 'System', 'User', 500)
      expect(result).toBe('{ invalid json }')
    })

    it('returns string from Gemini when content has no JSON', async () => {
      const { generateWithLLM } = await import('../ai-content-generation.service')
      const result = await generateWithLLM('gemini', 'System', 'User', 500)
      expect(result).toBe('Gemini content')
    })

    it('returns parsed object from Gemini when content has valid JSON', async () => {
      mockGeminiGenerateContent.mockResolvedValue({
        response: { text: () => '  { "key": "value" }  ' },
      })
      const { generateWithLLM } = await import('../ai-content-generation.service')
      const result = await generateWithLLM('gemini', 'System', 'User', 500)
      expect(result).toEqual({ key: 'value' })
    })

    it('returns raw content when Gemini JSON parse fails', async () => {
      mockGeminiGenerateContent.mockResolvedValue({
        response: { text: () => '  { bad }  ' },
      })
      const { generateWithLLM } = await import('../ai-content-generation.service')
      const result = await generateWithLLM('gemini', 'System', 'User', 500)
      expect(result).toBe('{ bad }')
    })

    it('throws for unsupported provider', async () => {
      const { generateWithLLM } = await import('../ai-content-generation.service')
      await expect(
        generateWithLLM('invalid' as 'openai' | 'gemini', 'Sys', 'User')
      ).rejects.toThrow(/Unsupported provider/)
    })

    it('uses DB apiKey when settings return valid key', async () => {
      mockFindUnique.mockResolvedValue({
        apiKey: 'db-key-1234567890',
        provider: 'openai',
      })
      const { generateWithLLM } = await import('../ai-content-generation.service')
      delete process.env.OPENAI_API_KEY
      process.env.GEMINI_API_KEY = 'gemini-test'
      const result = await generateWithLLM('openai', 'System', 'User', 500)
      expect(result).toBe('Generated content')
      expect(mockOpenAICreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: expect.any(Array),
        })
      )
    })

    it('decrypts apiKey when isEncrypted returns true', async () => {
      mockFindUnique.mockResolvedValue({
        apiKey: 'enc:encrypted-key-1234567890',
        provider: 'openai',
      })
      mockIsEncrypted.mockReturnValue(true)
      mockDecrypt.mockReturnValue('decrypted-key-1234567890')
      delete process.env.OPENAI_API_KEY
      const { generateWithLLM } = await import('../ai-content-generation.service')
      await generateWithLLM('openai', 'System', 'User', 500)
      expect(mockDecrypt).toHaveBeenCalledWith('enc:encrypted-key-1234567890')
    })

    it('falls back to env when decrypt throws', async () => {
      mockFindUnique.mockResolvedValue({
        apiKey: 'enc:encrypted-key-1234567890',
        provider: 'openai',
      })
      mockIsEncrypted.mockReturnValue(true)
      mockDecrypt.mockImplementation(() => {
        throw new Error('Decrypt failed')
      })
      process.env.OPENAI_API_KEY = 'sk-env-fallback'
      const { generateWithLLM } = await import('../ai-content-generation.service')
      const result = await generateWithLLM('openai', 'System', 'User', 500)
      expect(result).toBe('Generated content')
    })

    it('throws when no API key available for provider', async () => {
      mockFindUnique.mockResolvedValue(null)
      delete process.env.OPENAI_API_KEY
      delete process.env.GEMINI_API_KEY
      delete process.env.GOOGLE_GENERATIVE_AI_API_KEY
      const { generateWithLLM } = await import('../ai-content-generation.service')
      await expect(generateWithLLM('openai', 'Sys', 'User')).rejects.toThrow(
        /No API key for provider: openai/
      )
    })

    it('uses GOOGLE_GENERATIVE_AI_API_KEY when GEMINI_API_KEY not set', async () => {
      delete process.env.GEMINI_API_KEY
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'google-key'
      const { generateWithLLM } = await import('../ai-content-generation.service')
      const result = await generateWithLLM('gemini', 'System', 'User', 500)
      expect(result).toBe('Gemini content')
    })
  })

  describe('generateMasterFill', () => {
    const input = { name: 'Sony FX3', brand: 'Sony', category: 'Cameras' }

    it('returns parsed output on first attempt when LLM returns valid JSON', async () => {
      mockOpenAICreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                ...validMasterFillOutput,
                short_desc_en: 'Short',
                seo_title_en: 'Title',
              }),
            },
          },
        ],
      })
      mockParseMasterFillOutput.mockReturnValue({
        ...validMasterFillOutput,
        _parse_failed: false,
      })
      const { generateMasterFill } = await import('../ai-content-generation.service')
      const result = await generateMasterFill('openai', input)
      expect(result._parse_failed).toBeFalsy()
      expect(result.brand).toBe('Sony')
      expect(mockBuildMasterFillPrompt).toHaveBeenCalledWith(input)
    })

    it('retries when parse fails and succeeds on second attempt', async () => {
      mockOpenAICreate
        .mockResolvedValueOnce({
          choices: [{ message: { content: 'invalid json' } }],
        })
        .mockResolvedValueOnce({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  ...validMasterFillOutput,
                  short_desc_en: 'Short',
                  seo_title_en: 'Title',
                }),
              },
            },
          ],
        })
      mockParseMasterFillOutput
        .mockReturnValueOnce({ ...validMasterFillOutput, _parse_failed: true })
        .mockReturnValueOnce({ ...validMasterFillOutput, _parse_failed: false })
      const { generateMasterFill } = await import('../ai-content-generation.service')
      const result = await generateMasterFill('openai', input)
      expect(result._parse_failed).toBeFalsy()
      expect(mockOpenAICreate).toHaveBeenCalledTimes(2)
    })

    it('switches to alternate provider on attempt 2 when first fails', async () => {
      jest.useFakeTimers()
      mockOpenAICreate.mockRejectedValue(new Error('OpenAI failed'))
      mockGeminiGenerateContent.mockResolvedValue({
        response: {
          text: () =>
            JSON.stringify({
              ...validMasterFillOutput,
              short_desc_en: 'Short',
              seo_title_en: 'Title',
            }),
        },
      })
      mockParseMasterFillOutput.mockReturnValue({
        ...validMasterFillOutput,
        _parse_failed: false,
      })
      const { generateMasterFill } = await import('../ai-content-generation.service')
      const promise = generateMasterFill('openai', input)
      await jest.runAllTimersAsync()
      const result = await promise
      expect(result._parse_failed).toBeFalsy()
      expect(mockGeminiGenerateContent).toHaveBeenCalled()
      jest.useRealTimers()
    }, 15000)

    it('does not switch provider when alternate has no API key', async () => {
      jest.useFakeTimers()
      delete process.env.GEMINI_API_KEY
      delete process.env.GOOGLE_GENERATIVE_AI_API_KEY
      mockOpenAICreate.mockRejectedValue(new Error('OpenAI failed'))
      mockParseMasterFillOutput.mockImplementation((raw: string, itemName?: string) => ({
        ...validMasterFillOutput,
        brand: itemName ?? 'Unknown',
        _needs_review: true,
        _parse_failed: !raw,
      }))
      const { generateMasterFill } = await import('../ai-content-generation.service')
      const promise = generateMasterFill('openai', input)
      await jest.runAllTimersAsync()
      const result = await promise
      expect(result).toMatchObject({ _needs_review: true })
      expect(mockGeminiGenerateContent).not.toHaveBeenCalled()
      process.env.GEMINI_API_KEY = 'gemini-test'
      jest.useRealTimers()
    }, 15000)

    it('returns fallback when all attempts fail', async () => {
      jest.useFakeTimers()
      mockOpenAICreate.mockRejectedValue(new Error('OpenAI failed'))
      mockGeminiGenerateContent.mockRejectedValue(new Error('Gemini failed'))
      mockParseMasterFillOutput.mockImplementation((raw: string, itemName?: string) => ({
        ...validMasterFillOutput,
        brand: itemName ?? 'Unknown',
        _needs_review: true,
        _parse_failed: !raw,
      }))
      const { generateMasterFill } = await import('../ai-content-generation.service')
      const promise = generateMasterFill('openai', input)
      await jest.advanceTimersByTimeAsync(10000)
      const result = await promise
      expect(result).toMatchObject({
        brand: expect.any(String),
        _needs_review: true,
      })
      expect(mockParseMasterFillOutput).toHaveBeenLastCalledWith('', 'Sony FX3')
      jest.useRealTimers()
    }, 15000)

    it('returns fallback when provider is unsupported', async () => {
      jest.useFakeTimers()
      const { generateMasterFill } = await import('../ai-content-generation.service')
      const promise = generateMasterFill('claude' as 'openai', input)
      await jest.runAllTimersAsync()
      const result = await promise
      expect(result).toMatchObject({ _needs_review: true })
      jest.useRealTimers()
    })

    it('returns fallback when LLM returns empty response on all attempts', async () => {
      jest.useFakeTimers()
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: '' } }],
      })
      mockGeminiGenerateContent.mockResolvedValue({
        response: { text: () => '' },
      })
      mockParseMasterFillOutput.mockImplementation((raw: string, itemName?: string) => ({
        ...validMasterFillOutput,
        brand: itemName ?? 'Unknown',
        _needs_review: true,
        _parse_failed: !raw,
      }))
      const { generateMasterFill } = await import('../ai-content-generation.service')
      const promise = generateMasterFill('openai', input)
      await jest.advanceTimersByTimeAsync(10000)
      const result = await promise
      expect(result).toMatchObject({ _needs_review: true })
      expect(mockParseMasterFillOutput).toHaveBeenLastCalledWith('', 'Sony FX3')
      jest.useRealTimers()
    }, 15000)
  })
})

export {}
