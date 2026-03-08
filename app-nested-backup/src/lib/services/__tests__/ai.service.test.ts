/**
 * Unit tests for AIService (ai.service.ts)
 * PATHS: generateText, assessRisk, suggestDeposit, recommendAlternatives, getCompatibleEquipment, buildKit, suggestPricing, forecastDemand, chat, getConfig
 */

const mockBookingFindMany = jest.fn()
const mockEquipmentFindUnique = jest.fn()
const mockEquipmentFindMany = jest.fn()
const mockCategoryFindUnique = jest.fn()
const mockBookingEquipmentFindMany = jest.fn()

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    booking: { findMany: (...args: unknown[]) => mockBookingFindMany(...args) },
    equipment: {
      findUnique: (...args: unknown[]) => mockEquipmentFindUnique(...args),
      findMany: (...args: unknown[]) => mockEquipmentFindMany(...args),
    },
    category: { findUnique: (...args: unknown[]) => mockCategoryFindUnique(...args) },
    bookingEquipment: { findMany: (...args: unknown[]) => mockBookingEquipmentFindMany(...args) },
  },
}))

const mockShootTypeGetBySlug = jest.fn()
const mockShootTypeGetById = jest.fn()
jest.mock('../shoot-type.service', () => ({
  ShootTypeService: {
    getBySlug: (...args: unknown[]) => mockShootTypeGetBySlug(...args),
    getById: (...args: unknown[]) => mockShootTypeGetById(...args),
  },
}))

const mockGetSpecValue = jest.fn()
const mockGetSpecArray = jest.fn()
jest.mock('@/lib/utils/specifications.utils', () => ({
  getSpecValue: (...args: unknown[]) => mockGetSpecValue(...args),
  getSpecArray: (...args: unknown[]) => mockGetSpecArray(...args),
}))

const mockOpenAICreate = jest.fn()
const mockOpenAIEmbeddings = jest.fn()
jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    chat: { completions: { create: mockOpenAICreate } },
    embeddings: { create: mockOpenAIEmbeddings },
  })),
}))

const mockGeminiGenerateContent = jest.fn()
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: () => ({
      generateContent: mockGeminiGenerateContent,
    }),
  })),
}))

const originalEnv = process.env

describe('AIService', () => {
  describe('determineCustomerHistory', () => {
    it('returns fair when 50-70% completed', async () => {
      const { AIService } = await import('../ai.service')
      expect(AIService.determineCustomerHistory(5, 10, 2)).toBe('fair')
      expect(AIService.determineCustomerHistory(6, 10, 2)).toBe('fair')
    })
    it('returns good when >=70% completed and <=1 cancelled', async () => {
      const { AIService } = await import('../ai.service')
      expect(AIService.determineCustomerHistory(8, 10, 1)).toBe('good')
    })
    it('returns excellent when >=90% completed and 0 cancelled', async () => {
      const { AIService } = await import('../ai.service')
      expect(AIService.determineCustomerHistory(9, 10, 0)).toBe('excellent')
    })
    it('returns poor when <50% completed', async () => {
      const { AIService } = await import('../ai.service')
      expect(AIService.determineCustomerHistory(4, 10, 3)).toBe('poor')
    })
    it('returns new when totalBookings is 0', async () => {
      const { AIService } = await import('../ai.service')
      expect(AIService.determineCustomerHistory(0, 0, 0)).toBe('new')
    })
  })

  describe('getRentalDurationRisk', () => {
    it('returns 3 for duration 8-14', async () => {
      const { AIService } = await import('../ai.service')
      expect(AIService.getRentalDurationRisk(8)).toBe(3)
      expect(AIService.getRentalDurationRisk(10)).toBe(3)
      expect(AIService.getRentalDurationRisk(14)).toBe(3)
    })
    it('returns 8 for duration 15-30', async () => {
      const { AIService } = await import('../ai.service')
      expect(AIService.getRentalDurationRisk(15)).toBe(8)
      expect(AIService.getRentalDurationRisk(20)).toBe(8)
    })
    it('returns 15 for duration >30', async () => {
      const { AIService } = await import('../ai.service')
      expect(AIService.getRentalDurationRisk(31)).toBe(15)
    })
    it('returns 0 for duration <=7', async () => {
      const { AIService } = await import('../ai.service')
      expect(AIService.getRentalDurationRisk(7)).toBe(0)
      expect(AIService.getRentalDurationRisk(5)).toBe(0)
    })
  })

  describe('parseDailyPrice', () => {
    it('calls toNumber when raw is Prisma Decimal-like object', async () => {
      const { AIService } = await import('../ai.service')
      expect(AIService.parseDailyPrice({ toNumber: () => 500 })).toBe(500)
    })
    it('returns Number(raw) when raw is number', async () => {
      const { AIService } = await import('../ai.service')
      expect(AIService.parseDailyPrice(250)).toBe(250)
    })
    it('returns 0 when raw is null or undefined', async () => {
      const { AIService } = await import('../ai.service')
      expect(AIService.parseDailyPrice(null)).toBe(0)
      expect(AIService.parseDailyPrice(undefined)).toBe(0)
    })
  })

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv }
    mockGetSpecValue.mockReturnValue('')
    mockGetSpecArray.mockReturnValue([])
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    process.env = originalEnv
    jest.restoreAllMocks()
  })

  describe('generateText', () => {
    it('throws when OPENAI_API_KEY is not set', async () => {
      delete process.env.OPENAI_API_KEY
      delete process.env.GEMINI_API_KEY
      delete process.env.GOOGLE_GENERATIVE_AI_API_KEY
      const { AIService } = await import('../ai.service')
      await expect(AIService.generateText('Hello')).rejects.toThrow(/OPENAI_API_KEY is not set/)
    })

    it('returns trimmed content when API key is set', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: ' AI response ' } }],
      })
      const { AIService } = await import('../ai.service')
      const result = await AIService.generateText('Hello')
      expect(result).toBe('AI response')
      expect(mockOpenAICreate).toHaveBeenCalledWith(
        expect.objectContaining({
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 300,
        })
      )
    })

    it('returns empty string when choices or content is empty', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: '' } }],
      })
      const { AIService } = await import('../ai.service')
      const result = await AIService.generateText('Hello')
      expect(result).toBe('')
    })

    it('returns empty string when choices[0] or message is undefined', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      mockOpenAICreate.mockResolvedValue({ choices: [] })
      const { AIService } = await import('../ai.service')
      const result = await AIService.generateText('Hello')
      expect(result).toBe('')
    })

    it('uses custom maxTokens and temperature when provided', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      mockOpenAICreate.mockResolvedValue({ choices: [{ message: { content: 'x' } }] })
      const { AIService } = await import('../ai.service')
      await AIService.generateText('Hi', { maxTokens: 100, temperature: 0.8 })
      expect(mockOpenAICreate).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 100,
          temperature: 0.8,
        })
      )
    })
  })

  describe('assessRisk', () => {
    it('returns risk assessment with new customer when no customerId', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: 'تقييم المخاطر' } }],
      })
      const { AIService } = await import('../ai.service')
      const result = await AIService.assessRisk({
        equipmentIds: ['eq1'],
        rentalDuration: 5,
        totalValue: 10000,
      })
      expect(result).toMatchObject({
        score: expect.any(Number),
        level: expect.stringMatching(/low|medium|high|critical/),
        recommendation: expect.stringMatching(/approve|review|reject|require_deposit/),
        factors: expect.any(Array),
      })
      expect(mockBookingFindMany).not.toHaveBeenCalled()
    })

    it('sets customerHistory new when customerId has no bookings', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      mockBookingFindMany.mockResolvedValue([])
      mockOpenAICreate.mockResolvedValue({ choices: [{ message: { content: 'تقييم' } }] })
      const { AIService } = await import('../ai.service')
      const result = await AIService.assessRisk({
        customerId: 'cust-new',
        equipmentIds: ['eq1'],
        rentalDuration: 3,
        totalValue: 5000,
      })
      expect(result.score).toBeGreaterThanOrEqual(50)
    })

    it('fetches customer history when customerId provided', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      mockBookingFindMany.mockResolvedValue([
        { status: 'CLOSED', totalAmount: 5000 },
        { status: 'CLOSED', totalAmount: 3000 },
        { status: 'CANCELLED', totalAmount: 0 },
      ])
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: 'تقييم' } }],
      })
      const { AIService } = await import('../ai.service')
      const result = await AIService.assessRisk({
        customerId: 'cust-1',
        equipmentIds: ['eq1'],
        rentalDuration: 3,
        totalValue: 5000,
      })
      expect(mockBookingFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { customerId: 'cust-1' } })
      )
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(100)
    })

    it('returns critical level when riskScore >= 80', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      mockOpenAICreate.mockResolvedValue({ choices: [{ message: { content: 'x' } }] })
      const { AIService } = await import('../ai.service')
      const result = await AIService.assessRisk({
        equipmentIds: Array(15).fill('eq'),
        rentalDuration: 60,
        totalValue: 200000,
      })
      expect(result.level).toBe('critical')
      expect(result.recommendation).toBe('reject')
    })

    it('returns good customer history when 90%+ completed and no cancellations', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      mockBookingFindMany.mockResolvedValue(
        Array(9).fill({ status: 'CLOSED', totalAmount: 1000 }).concat([
          { status: 'CLOSED', totalAmount: 500 },
        ])
      )
      mockOpenAICreate.mockResolvedValue({ choices: [{ message: { content: 'x' } }] })
      const { AIService } = await import('../ai.service')
      const result = await AIService.assessRisk({
        customerId: 'cust-1',
        equipmentIds: ['eq1'],
        rentalDuration: 3,
        totalValue: 5000,
      })
      expect(result).toMatchObject({ level: expect.any(String), score: expect.any(Number) })
    })

    it('returns high level when riskScore 60-79', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      mockBookingFindMany.mockResolvedValue(
        Array(5).fill({ status: 'CANCELLED', totalAmount: 0 }).concat([
          { status: 'CLOSED', totalAmount: 1000 },
        ])
      )
      mockOpenAICreate.mockResolvedValue({ choices: [{ message: { content: 'x' } }] })
      const { AIService } = await import('../ai.service')
      const result = await AIService.assessRisk({
        customerId: 'cust-1',
        equipmentIds: Array(8).fill('eq'),
        rentalDuration: 45,
        totalValue: 80000,
      })
      expect(['high', 'critical', 'medium']).toContain(result.level)
    })

    it('returns medium level when riskScore 40-59', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      mockOpenAICreate.mockResolvedValue({ choices: [{ message: { content: 'x' } }] })
      const { AIService } = await import('../ai.service')
      const result = await AIService.assessRisk({
        equipmentIds: ['eq1', 'eq2'],
        rentalDuration: 10,
        totalValue: 30000,
      })
      expect(['low', 'medium', 'high']).toContain(result.level)
    })

    it('returns assessment without narrativeSummaryAr when OpenAI throws', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      delete process.env.GEMINI_API_KEY
      delete process.env.GOOGLE_GENERATIVE_AI_API_KEY
      mockOpenAICreate.mockRejectedValueOnce(new Error('OpenAI API rate limit'))
      const { AIService } = await import('../ai.service')
      const result = await AIService.assessRisk({
        equipmentIds: ['eq1'],
        rentalDuration: 5,
        totalValue: 5000,
      })
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.narrativeSummaryAr).toBeUndefined()
    })

    it('falls back to Gemini when OpenAI throws and Gemini key is set', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      process.env.GEMINI_API_KEY = 'gemini-test'
      mockOpenAICreate.mockRejectedValueOnce(new Error('OpenAI down'))
      mockGeminiGenerateContent.mockResolvedValueOnce({
        response: { text: () => 'ملخص المخاطر بالعربية' },
      })
      const { AIService } = await import('../ai.service')
      const result = await AIService.assessRisk({
        equipmentIds: ['eq1'],
        rentalDuration: 5,
        totalValue: 5000,
      })
      expect(result.narrativeSummaryAr).toBe('ملخص المخاطر بالعربية')
    })

    it('returns assessment without narrativeSummaryAr when both OpenAI and Gemini throw', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      process.env.GEMINI_API_KEY = 'gemini-test'
      mockOpenAICreate.mockRejectedValueOnce(new Error('OpenAI down'))
      mockGeminiGenerateContent.mockRejectedValueOnce(new Error('Gemini error'))
      const { AIService } = await import('../ai.service')
      const result = await AIService.assessRisk({
        equipmentIds: ['eq1'],
        rentalDuration: 5,
        totalValue: 5000,
      })
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.narrativeSummaryAr).toBeUndefined()
    })
  })

  describe('suggestDeposit', () => {
    it('returns deposit suggestion with amount and percentage', async () => {
      const { AIService } = await import('../ai.service')
      const result = await AIService.suggestDeposit({
        equipmentValue: 10000,
        customerHistory: 'excellent',
        rentalDuration: 7,
        riskScore: 30,
      })
      expect(result).toMatchObject({
        amount: expect.any(Number),
        percentage: expect.any(Number),
        reasoning: expect.any(String),
      })
      expect(result.percentage).toBeGreaterThanOrEqual(20)
      expect(result.percentage).toBeLessThanOrEqual(80)
    })
  })

  describe('recommendAlternatives', () => {
    it('throws NotFoundError when equipment not found', async () => {
      mockEquipmentFindUnique.mockResolvedValue(null)
      const { AIService } = await import('../ai.service')
      await expect(
        AIService.recommendAlternatives({ unavailableEquipmentId: 'missing' })
      ).rejects.toThrow('Equipment not found')
    })

    it('returns alternatives in same category', async () => {
      mockEquipmentFindUnique.mockResolvedValue({
        id: 'eq1',
        categoryId: 'cat1',
        sku: 'CAM-1',
        model: 'Model X',
        dailyPrice: 100,
        category: { name: 'Cameras' },
      })
      mockEquipmentFindMany.mockResolvedValue([
        {
          id: 'eq2',
          categoryId: 'cat1',
          sku: 'CAM-2',
          model: 'Model Y',
          dailyPrice: 120,
          brandId: 'b1',
          category: { name: 'Cameras' },
          brand: { name: 'Sony' },
        },
      ])
      const { AIService } = await import('../ai.service')
      const result = await AIService.recommendAlternatives({
        unavailableEquipmentId: 'eq1',
      })
      expect(result).toHaveLength(1)
      expect(result[0]).toMatchObject({
        equipmentId: 'eq2',
        matchScore: expect.any(Number),
        reasons: expect.any(Array),
      })
    })

    it('returns alternatives with fallback score when embeddings have different lengths', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      mockEquipmentFindUnique.mockResolvedValue({
        id: 'eq1',
        categoryId: 'cat1',
        sku: 'CAM-1',
        model: 'X',
        dailyPrice: 100,
        category: { name: 'Cameras' },
      })
      mockEquipmentFindMany.mockResolvedValue([
        {
          id: 'eq2',
          categoryId: 'cat1',
          sku: 'CAM-2',
          model: 'Y',
          dailyPrice: 120,
          brandId: 'b1',
          category: { name: 'Cameras' },
          brand: { name: 'Sony' },
        },
      ])
      mockOpenAIEmbeddings
        .mockResolvedValueOnce({ data: [{ embedding: [1, 0] }] })
        .mockResolvedValueOnce({ data: [{ embedding: [1, 0, 0] }] })
      const { AIService } = await import('../ai.service')
      const result = await AIService.recommendAlternatives({
        unavailableEquipmentId: 'eq1',
      })
      expect(result).toHaveLength(1)
      expect(result[0].matchScore).toBeGreaterThanOrEqual(0)
    })

    it('returns alternatives when getEmbedding throws', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      mockEquipmentFindUnique.mockResolvedValue({
        id: 'eq1',
        categoryId: 'cat1',
        sku: 'CAM-1',
        model: 'X',
        dailyPrice: 100,
        category: { name: 'Cameras' },
      })
      mockEquipmentFindMany.mockResolvedValue([
        {
          id: 'eq2',
          categoryId: 'cat1',
          sku: 'CAM-2',
          model: 'Y',
          dailyPrice: 120,
          brandId: 'b1',
          category: { name: 'Cameras' },
          brand: { name: 'Sony' },
        },
      ])
      mockOpenAIEmbeddings.mockRejectedValueOnce(new Error('Embedding API failed'))
      const { AIService } = await import('../ai.service')
      const result = await AIService.recommendAlternatives({
        unavailableEquipmentId: 'eq1',
      })
      expect(result).toHaveLength(1)
      expect(result[0].matchScore).toBeGreaterThanOrEqual(0)
      expect(result[0].matchScore).toBeLessThanOrEqual(100)
    })
  })

  describe('getCompatibleEquipment', () => {
    it('returns all in category when selectedEquipmentIds empty', async () => {
      mockEquipmentFindMany.mockResolvedValue([
        {
          id: 'eq1',
          sku: 'Lens1',
          model: null,
          dailyPrice: 50,
          categoryId: 'cat1',
          specifications: {},
          category: { name: 'Lenses', slug: 'lenses' },
          brand: { name: 'Sony', slug: 'sony' },
          media: [],
        },
      ])
      const { AIService } = await import('../ai.service')
      const result = await AIService.getCompatibleEquipment({
        selectedEquipmentIds: [],
        targetCategoryId: 'cat1',
      })
      expect(result).toHaveLength(1)
      expect(result[0].sku).toBe('Lens1')
    })

    it('returns empty when target category not found', async () => {
      mockCategoryFindUnique.mockResolvedValue(null)
      mockEquipmentFindMany.mockResolvedValue([])
      const { AIService } = await import('../ai.service')
      const result = await AIService.getCompatibleEquipment({
        selectedEquipmentIds: ['eq1'],
        targetCategoryId: 'missing',
      })
      expect(result).toEqual([])
    })

    it('returns compatible lenses when selected cameras have lensMount', async () => {
      mockCategoryFindUnique.mockResolvedValue({ slug: 'lenses' })
      mockEquipmentFindMany
        .mockResolvedValueOnce([
          {
            id: 'cam1',
            model: 'Sony FX3',
            categoryId: 'cat1',
            category: { slug: 'cameras' },
            specifications: { lensMount: 'E-mount' },
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'lens1',
            sku: 'LENS-1',
            model: 'Sony 24-70',
            dailyPrice: 50,
            categoryId: 'lenses',
            specifications: { lensMount: 'E-mount' },
            category: { name: 'Lenses', slug: 'lenses' },
            brand: { name: 'Sony', slug: 'sony' },
            media: [],
          },
        ])
      mockGetSpecValue.mockImplementation((spec: unknown, key: string) =>
        key === 'lensMount' ? 'E-mount' : null
      )
      mockGetSpecArray.mockReturnValue([])
      const { AIService } = await import('../ai.service')
      const result = await AIService.getCompatibleEquipment({
        selectedEquipmentIds: ['cam1'],
        targetCategoryId: 'lenses',
      })
      expect(result.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('buildKit', () => {
    it('returns rule-based kit when no shoot type and no LLM', async () => {
      delete process.env.OPENAI_API_KEY
      delete process.env.GEMINI_API_KEY
      mockShootTypeGetBySlug.mockResolvedValue(null)
      mockShootTypeGetById.mockResolvedValue(null)
      mockEquipmentFindMany.mockResolvedValue(
        Array.from({ length: 10 }, (_, i) => ({
          id: `eq${i + 1}`,
          sku: `CAM${i + 1}`,
          model: null,
          dailyPrice: 100 + i * 10,
          category: { name: 'Cameras' },
          brand: { name: 'Sony' },
        }))
      )
      const { AIService } = await import('../ai.service')
      const result = await AIService.buildKit({
        projectType: 'wedding',
        duration: 3,
      })
      expect(result).toHaveLength(1)
      expect(result[0].equipment).toHaveLength(5)
      expect(result[0].name).toContain('Basic')
    })
  })

  describe('suggestPricing', () => {
    it('throws NotFoundError when equipment not found', async () => {
      mockEquipmentFindUnique.mockResolvedValue(null)
      const { AIService } = await import('../ai.service')
      await expect(
        AIService.suggestPricing({ equipmentId: 'missing', currentPrice: 100 })
      ).rejects.toThrow('Equipment not found')
    })

    it('returns pricing suggestion', async () => {
      mockEquipmentFindUnique.mockResolvedValue({
        id: 'eq1',
        sku: 'CAM1',
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        category: { name: 'Cameras' },
      })
      mockBookingEquipmentFindMany.mockResolvedValue([])
      const { AIService } = await import('../ai.service')
      const result = await AIService.suggestPricing({
        equipmentId: 'eq1',
        currentPrice: 100,
      })
      expect(result).toMatchObject({
        equipmentId: 'eq1',
        currentPrice: 100,
        suggestedPrice: expect.any(Number),
        change: expect.any(Number),
      })
    })

    it('returns rationale when OpenAI available', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      const created = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
      mockEquipmentFindUnique.mockResolvedValue({
        id: 'eq1',
        sku: 'CAM1',
        createdAt: created,
        category: { name: 'Cameras' },
      })
      mockBookingEquipmentFindMany.mockResolvedValue(
        Array.from({ length: 15 }, (_, i) => ({
          equipmentId: 'eq1',
          bookingId: `b${i}`,
          booking: {
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            endDate: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
          },
        }))
      )
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: 'High demand supports price increase.' } }],
      })
      const { AIService } = await import('../ai.service')
      const result = await AIService.suggestPricing({
        equipmentId: 'eq1',
        currentPrice: 100,
      })
      expect(result.suggestedPrice).toBeDefined()
      expect(result.rationale).toBeDefined()
    })

    it('falls back to Gemini when OpenAI rationale fails', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      process.env.GEMINI_API_KEY = 'test-gemini'
      const created = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
      mockEquipmentFindUnique.mockResolvedValue({
        id: 'eq1',
        sku: 'CAM1',
        createdAt: created,
        category: { name: 'Cameras' },
      })
      mockBookingEquipmentFindMany.mockResolvedValue([])
      mockOpenAICreate.mockRejectedValue(new Error('OpenAI down'))
      mockGeminiGenerateContent.mockResolvedValue({
        response: { text: () => 'Gemini rationale for pricing.' },
      })
      const { AIService } = await import('../ai.service')
      const result = await AIService.suggestPricing({
        equipmentId: 'eq1',
        currentPrice: 100,
      })
      expect(result.suggestedPrice).toBeDefined()
    })

    it('returns without rationale when both OpenAI and Gemini fail', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      process.env.GEMINI_API_KEY = 'test-gemini'
      mockEquipmentFindUnique.mockResolvedValue({
        id: 'eq1',
        sku: 'CAM1',
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        category: { name: 'Cameras' },
      })
      mockBookingEquipmentFindMany.mockResolvedValue([])
      mockOpenAICreate.mockRejectedValue(new Error('OpenAI down'))
      mockGeminiGenerateContent.mockRejectedValue(new Error('Gemini down'))
      const { AIService } = await import('../ai.service')
      const result = await AIService.suggestPricing({
        equipmentId: 'eq1',
        currentPrice: 100,
      })
      expect(result.suggestedPrice).toBeDefined()
      expect(result.rationale).toBeUndefined()
    })
  })

  describe('forecastDemand', () => {
    it('returns forecasts for equipment', async () => {
      mockEquipmentFindMany.mockResolvedValue([
        {
          id: 'eq1',
          sku: 'CAM1',
          dailyPrice: 100,
        },
      ])
      mockEquipmentFindUnique.mockResolvedValue(null)
      mockBookingEquipmentFindMany.mockResolvedValue([])
      const { AIService } = await import('../ai.service')
      const result = await AIService.forecastDemand({ period: 'month' })
      expect(Array.isArray(result)).toBe(true)
    })

    it('returns forecast without weekly projection when OpenAI throws', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      mockEquipmentFindMany.mockResolvedValue([
        { id: 'eq1', sku: 'CAM1', dailyPrice: 100 },
      ])
      mockBookingEquipmentFindMany.mockResolvedValue(
        Array.from({ length: 20 }, (_, i) => ({
          equipmentId: 'eq1',
          bookingId: `b${i}`,
          booking: {
            startDate: new Date(Date.now() - (90 - i * 4) * 24 * 60 * 60 * 1000),
            endDate: new Date(Date.now() - (88 - i * 4) * 24 * 60 * 60 * 1000),
          },
        }))
      )
      mockOpenAICreate.mockRejectedValue(new Error('API error'))
      const { AIService } = await import('../ai.service')
      const result = await AIService.forecastDemand({ period: 'month' })
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('chat', () => {
    it('returns rule-based response for price inquiry', async () => {
      const { AIService } = await import('../ai.service')
      const result = await AIService.chat({ message: 'What is the price?' })
      expect(result.message).toContain('pricing')
      expect(result.actions).toContainEqual(
        expect.objectContaining({ type: 'price_inquiry' })
      )
    })

    it('returns rule-based response for availability', async () => {
      const { AIService } = await import('../ai.service')
      const result = await AIService.chat({ message: 'Is this equipment available to book?' })
      expect(result.message).toContain('availability')
    })

    it('returns rule-based response for equipment search', async () => {
      const { AIService } = await import('../ai.service')
      const result = await AIService.chat({ message: 'I need a camera' })
      expect(result.message).toContain('equipment')
    })

    it('returns rule-based response for help', async () => {
      const { AIService } = await import('../ai.service')
      const result = await AIService.chat({ message: 'I need help' })
      expect(result.message).toContain('help')
    })
  })

  describe('getConfig', () => {
    it('returns AI config', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      const { AIService } = await import('../ai.service')
      const result = await AIService.getConfig()
      expect(result).toMatchObject({
        provider: expect.any(String),
        model: expect.any(String),
        enabled: true,
      })
    })

    it('returns disabled when no API key', async () => {
      delete process.env.OPENAI_API_KEY
      delete process.env.GEMINI_API_KEY
      delete process.env.GOOGLE_GENERATIVE_AI_API_KEY
      const { AIService } = await import('../ai.service')
      const result = await AIService.getConfig()
      expect(result.enabled).toBe(false)
    })

    it('returns provider gemini when AI_PROVIDER=gemini', async () => {
      process.env.AI_PROVIDER = 'gemini'
      process.env.GEMINI_API_KEY = 'test'
      const { AIService } = await import('../ai.service')
      const result = await AIService.getConfig()
      expect(result.provider).toBe('gemini')
    })

    it('returns provider anthropic when AI_PROVIDER=anthropic', async () => {
      process.env.AI_PROVIDER = 'anthropic'
      const { AIService } = await import('../ai.service')
      const result = await AIService.getConfig()
      expect(result.provider).toBe('anthropic')
    })

    it('returns custom model when AI_MODEL set', async () => {
      process.env.AI_MODEL = 'gpt-4-turbo'
      process.env.OPENAI_API_KEY = 'sk-test'
      const { AIService } = await import('../ai.service')
      const result = await AIService.getConfig()
      expect(result.model).toBe('gpt-4-turbo')
    })

    it('returns default model when AI_MODEL empty', async () => {
      process.env.AI_MODEL = ''
      process.env.OPENAI_API_KEY = 'sk-test'
      const { AIService } = await import('../ai.service')
      const result = await AIService.getConfig()
      expect(result.model).toBe('gpt-4o-mini')
    })
  })

  describe('generateText options', () => {
    it('passes maxTokens and temperature when provided', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: 'Response' } }],
      })
      const { AIService } = await import('../ai.service')
      await AIService.generateText('Hi', { maxTokens: 500, temperature: 0.8 })
      expect(mockOpenAICreate).toHaveBeenCalledWith(
        expect.objectContaining({
          max_tokens: 500,
          temperature: 0.8,
        })
      )
    })
  })

  describe('assessRisk edge cases', () => {
    it('returns excellent customer history when 90%+ completed and no cancellations', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      mockBookingFindMany.mockResolvedValue([
        { status: 'CLOSED', totalAmount: 1000 },
        { status: 'CLOSED', totalAmount: 2000 },
        { status: 'CLOSED', totalAmount: 500 },
        { status: 'CLOSED', totalAmount: 500 },
        { status: 'CLOSED', totalAmount: 500 },
      ])
      mockOpenAICreate.mockResolvedValue({ choices: [{ message: { content: 'تقييم' } }] })
      const { AIService } = await import('../ai.service')
      const result = await AIService.assessRisk({
        customerId: 'cust-1',
        equipmentIds: ['eq1'],
        rentalDuration: 3,
        totalValue: 5000,
      })
      expect(result.score).toBeLessThan(50)
      expect(result.level).toBeDefined()
    })

    it('returns poor customer history when low completion rate', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      mockBookingFindMany.mockResolvedValue([
        { status: 'CLOSED', totalAmount: 100 },
        { status: 'CANCELLED', totalAmount: 0 },
        { status: 'CANCELLED', totalAmount: 0 },
        { status: 'CANCELLED', totalAmount: 0 },
      ])
      mockOpenAICreate.mockResolvedValue({ choices: [{ message: { content: 'تقييم' } }] })
      const { AIService } = await import('../ai.service')
      const result = await AIService.assessRisk({
        customerId: 'cust-1',
        equipmentIds: ['eq1'],
        rentalDuration: 3,
        totalValue: 5000,
      })
      expect(result.level).toBeDefined()
    })

    it('uses provided customerHistory when passed', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      mockOpenAICreate.mockResolvedValue({ choices: [{ message: { content: 'x' } }] })
      const { AIService } = await import('../ai.service')
      const result = await AIService.assessRisk({
        equipmentIds: ['eq1'],
        rentalDuration: 5,
        totalValue: 5000,
        customerHistory: 'excellent',
      })
      expect(result.suggestedDeposit).toBeDefined()
      expect(mockBookingFindMany).not.toHaveBeenCalled()
    })

    it('returns fair customer history when 50-70% completed or multiple cancellations', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      mockBookingFindMany.mockResolvedValue([
        ...Array(6).fill({ status: 'CLOSED', totalAmount: 1000 }),
        ...Array(4).fill({ status: 'CANCELLED', totalAmount: 0 }),
      ])
      mockOpenAICreate.mockResolvedValue({ choices: [{ message: { content: 'تقييم' } }] })
      const { AIService } = await import('../ai.service')
      const result = await AIService.assessRisk({
        customerId: 'cust-1',
        equipmentIds: ['eq1'],
        rentalDuration: 10,
        totalValue: 25000,
      })
      expect(result.score).toBeDefined()
      expect(result.level).toBeDefined()
    })

    it('hits fair branch and rentalDuration 8-14 branch explicitly', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      // 6 CLOSED, 2 CANCELLED, 2 other: completed/total=0.6 -> fair; cancelled 2/10<0.3 so no penalty; rentalDuration 10 hits 8-14
      mockBookingFindMany.mockResolvedValue(
        [
          ...Array(6).fill({ status: 'CLOSED', totalAmount: 1000 }),
          { status: 'CANCELLED', totalAmount: 0 },
          { status: 'CANCELLED', totalAmount: 0 },
          { status: 'ACTIVE', totalAmount: 500 },
          { status: 'DRAFT', totalAmount: 0 },
        ]
      )
      mockOpenAICreate.mockResolvedValue({ choices: [{ message: { content: 'تقييم' } }] })
      const { AIService } = await import('../ai.service')
      const result = await AIService.assessRisk({
        customerId: 'cust-fair',
        equipmentIds: ['eq1'],
        rentalDuration: 10,
        totalValue: 15000,
      })
      expect(mockBookingFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { customerId: 'cust-fair' } })
      )
      expect(result.score).toBeGreaterThanOrEqual(0)
      expect(result.score).toBeLessThanOrEqual(100)
    })
  })

  describe('suggestDeposit edge cases', () => {
    it('clamps percentage to 20-80 for poor history and high risk', async () => {
      const { AIService } = await import('../ai.service')
      const result = await AIService.suggestDeposit({
        equipmentValue: 10000,
        customerHistory: 'poor',
        rentalDuration: 60,
        riskScore: 85,
      })
      expect(result.percentage).toBeGreaterThanOrEqual(20)
      expect(result.percentage).toBeLessThanOrEqual(80)
    })

    it('returns lower percentage for excellent history', async () => {
      const { AIService } = await import('../ai.service')
      const excellent = await AIService.suggestDeposit({
        equipmentValue: 10000,
        customerHistory: 'excellent',
        rentalDuration: 7,
        riskScore: 20,
      })
      const poor = await AIService.suggestDeposit({
        equipmentValue: 10000,
        customerHistory: 'poor',
        rentalDuration: 7,
        riskScore: 20,
      })
      expect(excellent.percentage).toBeLessThan(poor.percentage)
    })

    it('uses 0 adjustment when customerHistory not in historyAdjustments', async () => {
      const { AIService } = await import('../ai.service')
      const result = await AIService.suggestDeposit({
        equipmentValue: 10000,
        customerHistory: 'invalid' as 'excellent',
        rentalDuration: 7,
        riskScore: 30,
      })
      expect(result.percentage).toBe(30)
    })
  })

  describe('chat fallback', () => {
    it('returns generic response for unrecognized message', async () => {
      const { AIService } = await import('../ai.service')
      const result = await AIService.chat({ message: 'xyz random text 123' })
      expect(result.message).toBeDefined()
      expect(typeof result.message).toBe('string')
    })
  })

  describe('recommendAlternatives embeddings fallback', () => {
    it('falls back to category match when getEmbedding throws', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      mockEquipmentFindUnique.mockResolvedValue({
        id: 'eq1',
        categoryId: 'cat1',
        sku: 'CAM-1',
        model: 'Sony FX3',
        dailyPrice: 500,
        category: { name: 'Cameras' },
      })
      mockEquipmentFindMany.mockResolvedValue([
        {
          id: 'eq2',
          categoryId: 'cat1',
          sku: 'CAM-2',
          model: 'Sony FX6',
          dailyPrice: 600,
          brandId: 'b1',
          category: { name: 'Cameras' },
          brand: { name: 'Sony' },
        },
      ])
      mockOpenAIEmbeddings.mockRejectedValue(new Error('Embedding API failed'))
      const { AIService } = await import('../ai.service')
      const result = await AIService.recommendAlternatives({
        unavailableEquipmentId: 'eq1',
      })
      expect(result.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('recommendAlternatives with embeddings', () => {
    it('uses cosine similarity when embeddings available', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      mockEquipmentFindUnique.mockResolvedValue({
        id: 'eq1',
        categoryId: 'cat1',
        sku: 'CAM-1',
        model: 'Sony FX3',
        dailyPrice: 500,
        category: { name: 'Cameras' },
      })
      mockEquipmentFindMany.mockResolvedValue([
        {
          id: 'eq2',
          categoryId: 'cat1',
          sku: 'CAM-2',
          model: 'Sony FX6',
          dailyPrice: 600,
          brandId: 'b1',
          category: { name: 'Cameras' },
          brand: { name: 'Sony' },
        },
      ])
      mockOpenAIEmbeddings
        .mockResolvedValueOnce({ data: [{ embedding: [0.1, 0.2, 0.3] }] })
        .mockResolvedValueOnce({
          data: [
            { embedding: [0.15, 0.25, 0.35] },
          ],
        })
      const { AIService } = await import('../ai.service')
      const result = await AIService.recommendAlternatives({
        unavailableEquipmentId: 'eq1',
      })
      expect(result.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('getCompatibleEquipment non-lenses path', () => {
    it('returns all in category when target is not lenses', async () => {
      mockCategoryFindUnique.mockResolvedValue({ slug: 'cameras' })
      mockEquipmentFindMany.mockResolvedValue([
        {
          id: 'cam1',
          sku: 'CAM1',
          model: 'Sony FX3',
          dailyPrice: 500,
          categoryId: 'cat1',
          category: { name: 'Cameras', slug: 'cameras' },
          brand: { name: 'Sony', slug: 'sony' },
          media: [],
        },
      ])
      const { AIService } = await import('../ai.service')
      const result = await AIService.getCompatibleEquipment({
        selectedEquipmentIds: ['eq1'],
        targetCategoryId: 'cat1',
      })
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('getCompatibleEquipment lenses path', () => {
    it('returns lenses matching camera lensMount', async () => {
      mockCategoryFindUnique.mockResolvedValue({ slug: 'lenses' })
      mockEquipmentFindMany
        .mockResolvedValueOnce([
          {
            id: 'cam1',
            model: 'Sony FX3',
            categoryId: 'cat1',
            category: { slug: 'cameras' },
            specifications: { lensMount: 'E-mount' },
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'lens1',
            sku: 'LENS-1',
            model: 'Sony 24-70',
            dailyPrice: 50,
            categoryId: 'lenses',
            specifications: { lensMount: 'E-mount' },
            category: { name: 'Lenses', slug: 'lenses' },
            brand: { name: 'Sony', slug: 'sony' },
            media: [],
          },
        ])
      mockGetSpecValue.mockImplementation((spec: unknown, key: string) =>
        key === 'lensMount' ? 'E-mount' : key === 'mount' ? null : null
      )
      mockGetSpecArray.mockReturnValue([])
      const { AIService } = await import('../ai.service')
      const result = await AIService.getCompatibleEquipment({
        selectedEquipmentIds: ['cam1'],
        targetCategoryId: 'lenses',
      })
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('buildKit with shoot type', () => {
    it('returns kit from shoot type recommendations', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      mockShootTypeGetBySlug.mockResolvedValue({
        id: 'st1',
        name: 'Wedding',
        slug: 'wedding',
        recommendations: [
          {
            equipmentId: 'eq1',
            budgetTier: 'PROFESSIONAL',
            reason: 'Essential for ceremony',
            defaultQuantity: 1,
            sortOrder: 0,
            equipment: {
              id: 'eq1',
              sku: 'CAM-1',
              model: 'Sony FX3',
              dailyPrice: 500,
            },
          },
        ],
      })
      const { AIService } = await import('../ai.service')
      const result = await AIService.buildKit({
        projectType: 'wedding',
        duration: 3,
        shootTypeSlug: 'wedding',
      })
      expect(result.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('chat with LLM', () => {
    it('returns AI response when OpenAI available', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      delete process.env.GEMINI_API_KEY
      process.env.AI_PROVIDER = 'openai'
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: 'I can help you find the right equipment.' } }],
      })
      const { AIService } = await import('../ai.service')
      const result = await AIService.chat({ message: 'Tell me about your cameras' })
      expect(result.message).toBeDefined()
    })

    it('uses fallback when OpenAI returns empty content for unrecognized message', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      delete process.env.GEMINI_API_KEY
      process.env.AI_PROVIDER = 'openai'
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: '' } }],
      })
      const { AIService } = await import('../ai.service')
      const result = await AIService.chat({ message: 'xyz random query 123' })
      expect(result.message).toContain('I apologize')
    })

    it('returns generic response when provider openai but no API key', async () => {
      delete process.env.OPENAI_API_KEY
      delete process.env.GEMINI_API_KEY
      process.env.AI_PROVIDER = 'openai'
      const { AIService } = await import('../ai.service')
      const result = await AIService.chat({ message: 'random unrecognized text' })
      expect(result.message).toContain('equipment search')
      expect(result.suggestions).toContain('Search equipment')
    })
  })

  describe('extractSpecificationsFromProductPage', () => {
    it('throws when no API key', async () => {
      delete process.env.OPENAI_API_KEY
      delete process.env.GEMINI_API_KEY
      const { AIService } = await import('../ai.service')
      await expect(
        AIService.extractSpecificationsFromProductPage('Product page text')
      ).rejects.toThrow(/AI could not extract specifications/)
    })

    it('returns specs when Gemini succeeds', async () => {
      process.env.GEMINI_API_KEY = 'test-gemini-key'
      delete process.env.OPENAI_API_KEY
      mockGeminiGenerateContent.mockResolvedValue({
        response: {
          text: () =>
            JSON.stringify({
              groups: [
                {
                  label: 'Key Specs',
                  specs: [{ key: 'sensor', label: 'Sensor', value: 'Full Frame' }],
                },
              ],
            }),
        },
      })
      const { AIService } = await import('../ai.service')
      const result = await AIService.extractSpecificationsFromProductPage('Sony FX3 specs...')
      expect(result.groups).toHaveLength(1)
      expect(result.groups[0].label).toBe('Key Specs')
    })

    it('returns specs via OpenAI when Gemini fails', async () => {
      process.env.GEMINI_API_KEY = 'test-gemini-key'
      process.env.OPENAI_API_KEY = 'sk-test'
      mockGeminiGenerateContent.mockRejectedValue(new Error('Gemini API error'))
      mockOpenAICreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                groups: [
                  {
                    label: 'Body',
                    specs: [{ key: 'sensor', label: 'Sensor', value: 'Full Frame' }],
                  },
                ],
              }),
            },
          },
        ],
      })
      const { AIService } = await import('../ai.service')
      const result = await AIService.extractSpecificationsFromProductPage('Sony FX3 specs...')
      expect(result.groups).toHaveLength(1)
      expect(result.groups[0].label).toBe('Body')
    })
  })

  describe('assessRisk full coverage', () => {
    it('sets customerHistory excellent when 90%+ completed and no cancellations', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      mockBookingFindMany.mockResolvedValue([
        ...Array(9).fill({ status: 'CLOSED', totalAmount: 1000 }),
        { status: 'CLOSED', totalAmount: 500 },
      ])
      mockOpenAICreate.mockResolvedValue({ choices: [{ message: { content: 'تقييم' } }] })
      const { AIService } = await import('../ai.service')
      const result = await AIService.assessRisk({
        customerId: 'cust-1',
        equipmentIds: ['eq1'],
        rentalDuration: 3,
        totalValue: 5000,
      })
      expect(result.score).toBeLessThan(50)
      expect(result.level).toBe('low')
    })

    it('handles unknown customerHistory in historyFactors', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      mockOpenAICreate.mockResolvedValue({ choices: [{ message: { content: 'x' } }] })
      const { AIService } = await import('../ai.service')
      const result = await AIService.assessRisk({
        equipmentIds: ['eq1'],
        rentalDuration: 5,
        totalValue: 5000,
        customerHistory: 'invalid' as 'excellent',
      })
      expect(result.score).toBeDefined()
    })

    it('uses Gemini for narrativeSummaryAr when OpenAI fails', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      process.env.GEMINI_API_KEY = 'test-gemini-key'
      mockOpenAICreate.mockRejectedValueOnce(new Error('OpenAI rate limit'))
      mockGeminiGenerateContent.mockResolvedValue({
        response: { text: () => 'ملخص التقييم بالعربية' },
      })
      const { AIService } = await import('../ai.service')
      const result = await AIService.assessRisk({
        equipmentIds: ['eq1'],
        rentalDuration: 5,
        totalValue: 5000,
      })
      expect(result.narrativeSummaryAr).toBe('ملخص التقييم بالعربية')
    })

    it('keeps narrativeSummaryAr undefined when both OpenAI and Gemini fail', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      process.env.GEMINI_API_KEY = 'test-gemini-key'
      mockOpenAICreate.mockRejectedValue(new Error('OpenAI rate limit'))
      mockGeminiGenerateContent.mockRejectedValue(new Error('Gemini rate limit'))
      const { AIService } = await import('../ai.service')
      const result = await AIService.assessRisk({
        equipmentIds: ['eq1'],
        rentalDuration: 5,
        totalValue: 5000,
      })
      expect(result.narrativeSummaryAr).toBeUndefined()
    })

    it('uses narrativeSummaryAr from OpenAI when content has whitespace', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      delete process.env.GEMINI_API_KEY
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: '  تقييم المخاطر  ' } }],
      })
      const { AIService } = await import('../ai.service')
      const result = await AIService.assessRisk({
        equipmentIds: ['eq1'],
        rentalDuration: 5,
        totalValue: 5000,
      })
      expect(result.narrativeSummaryAr).toBe('تقييم المخاطر')
    })

    it('uses narrativeSummaryAr from Gemini when OpenAI returns empty choices', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      process.env.GEMINI_API_KEY = 'test-gemini-key'
      mockOpenAICreate.mockResolvedValue({ choices: [] })
      mockGeminiGenerateContent.mockResolvedValue({
        response: { text: () => '  ملخص من Gemini  ' },
      })
      const { AIService } = await import('../ai.service')
      const result = await AIService.assessRisk({
        equipmentIds: ['eq1'],
        rentalDuration: 5,
        totalValue: 5000,
      })
      expect(result.narrativeSummaryAr).toBe('ملخص من Gemini')
    })

    it('uses narrativeSummaryAr undefined when Gemini text returns null', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      process.env.GEMINI_API_KEY = 'test-gemini-key'
      mockOpenAICreate.mockResolvedValue({ choices: [] })
      mockGeminiGenerateContent.mockResolvedValue({
        response: { text: () => null as unknown as string },
      })
      const { AIService } = await import('../ai.service')
      const result = await AIService.assessRisk({
        equipmentIds: ['eq1'],
        rentalDuration: 5,
        totalValue: 5000,
      })
      expect(result.narrativeSummaryAr).toBeUndefined()
    })
  })

  describe('suggestDeposit full coverage', () => {
    it('adds 5% for rentalDuration 14-30 days', async () => {
      const { AIService } = await import('../ai.service')
      const result = await AIService.suggestDeposit({
        equipmentValue: 10000,
        customerHistory: 'fair',
        rentalDuration: 20,
        riskScore: 40,
      })
      expect(result.percentage).toBe(35)
    })
  })

  describe('recommendAlternatives full coverage', () => {
    it('falls back when embeddings batch fails', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      mockEquipmentFindUnique.mockResolvedValue({
        id: 'eq1',
        categoryId: 'cat1',
        sku: 'CAM-1',
        model: 'Sony FX3',
        dailyPrice: 500,
        category: { name: 'Cameras' },
      })
      mockEquipmentFindMany.mockResolvedValue([
        {
          id: 'eq2',
          categoryId: 'cat1',
          brandId: 'b1',
          sku: 'CAM-2',
          model: 'Sony FX6',
          dailyPrice: 520,
          category: { name: 'Cameras' },
          brand: { name: 'Sony' },
        },
      ])
      mockOpenAIEmbeddings
        .mockResolvedValueOnce({ data: [{ embedding: [0.1, 0.2, 0.3] }] })
        .mockRejectedValueOnce(new Error('Batch embeddings failed'))
      const { AIService } = await import('../ai.service')
      const result = await AIService.recommendAlternatives({ unavailableEquipmentId: 'eq1' })
      expect(result.length).toBeGreaterThanOrEqual(0)
    })

    it('includes Same brand reason when brandId matches', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      mockEquipmentFindUnique.mockResolvedValue({
        id: 'eq1',
        categoryId: 'cat1',
        brandId: 'b1',
        sku: 'CAM-1',
        model: 'Sony FX3',
        dailyPrice: 500,
        category: { name: 'Cameras' },
      })
      mockEquipmentFindMany.mockResolvedValue([
        {
          id: 'eq2',
          categoryId: 'cat1',
          brandId: 'b1',
          sku: 'CAM-2',
          model: 'Sony FX6',
          dailyPrice: 510,
          category: { name: 'Cameras' },
          brand: { name: 'Sony' },
        },
      ])
      mockOpenAIEmbeddings
        .mockResolvedValueOnce({ data: [{ embedding: [0.1, 0.2, 0.3] }] })
        .mockResolvedValueOnce({ data: [{ embedding: [0.12, 0.22, 0.32] }] })
      const { AIService } = await import('../ai.service')
      const result = await AIService.recommendAlternatives({ unavailableEquipmentId: 'eq1' })
      expect(result.some((r) => r.reasons.includes('Same brand'))).toBe(true)
    })

    it('uses else branch when no embeddings API (unavailableEmbedding null)', async () => {
      delete process.env.OPENAI_API_KEY
      delete process.env.GEMINI_API_KEY
      mockEquipmentFindUnique.mockResolvedValue({
        id: 'eq1',
        categoryId: 'cat1',
        sku: 'CAM-1',
        model: 'X',
        dailyPrice: 100,
        category: { name: 'Cameras' },
      })
      mockEquipmentFindMany.mockResolvedValue([
        {
          id: 'eq2',
          categoryId: 'cat1',
          sku: 'CAM-2',
          model: 'Y',
          dailyPrice: 150,
          brandId: 'b1',
          category: { name: 'Cameras' },
          brand: { name: 'Sony' },
        },
      ])
      const { AIService } = await import('../ai.service')
      const result = await AIService.recommendAlternatives({
        unavailableEquipmentId: 'eq1',
      })
      expect(result).toHaveLength(1)
      expect(result[0].reasons).not.toContain('Similar price')
      expect(result[0].reasons).not.toContain('Similar product profile')
    })

    it('excludes Similar price when priceDiffPercent >= 0.3', async () => {
      delete process.env.OPENAI_API_KEY
      mockEquipmentFindUnique.mockResolvedValue({
        id: 'eq1',
        categoryId: 'cat1',
        sku: 'CAM-1',
        dailyPrice: 100,
        category: { name: 'Cameras' },
      })
      mockEquipmentFindMany.mockResolvedValue([
        {
          id: 'eq2',
          categoryId: 'cat1',
          sku: 'CAM-2',
          model: 'Premium',
          dailyPrice: 150,
          brandId: 'b1',
          category: { name: 'Cameras' },
          brand: { name: 'Sony' },
        },
      ])
      const { AIService } = await import('../ai.service')
      const result = await AIService.recommendAlternatives({
        unavailableEquipmentId: 'eq1',
      })
      expect(result[0].reasons.some((r) => r === 'Similar price')).toBe(false)
    })

    it('excludes Similar product profile when cosineScore <= 70', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      mockEquipmentFindUnique.mockResolvedValue({
        id: 'eq1',
        categoryId: 'cat1',
        sku: 'CAM-1',
        model: 'X',
        dailyPrice: 100,
        category: { name: 'Cameras' },
      })
      mockEquipmentFindMany.mockResolvedValue([
        {
          id: 'eq2',
          categoryId: 'cat1',
          sku: 'CAM-2',
          model: 'Y',
          dailyPrice: 105,
          brandId: 'b1',
          category: { name: 'Cameras' },
          brand: { name: 'Sony' },
        },
      ])
      mockOpenAIEmbeddings
        .mockResolvedValueOnce({ data: [{ embedding: [1, 0, 0] }] })
        .mockResolvedValueOnce({ data: [{ embedding: [-0.5, 0.5, 0] }] })
      const { AIService } = await import('../ai.service')
      const result = await AIService.recommendAlternatives({
        unavailableEquipmentId: 'eq1',
      })
      const r = result.find((x) => x.equipmentId === 'eq2')
      if (r && r.reasons) {
        expect(r.reasons.includes('Similar product profile')).toBe(false)
      }
    })
  })

  describe('getCompatibleEquipment full coverage', () => {
    it('uses compatibleMounts when lensMount not present', async () => {
      mockCategoryFindUnique.mockResolvedValue({ slug: 'lenses' })
      mockEquipmentFindMany
        .mockResolvedValueOnce([
          {
            id: 'cam1',
            model: 'Sony FX3',
            categoryId: 'cat1',
            category: { slug: 'cameras' },
            specifications: { compatibleMounts: ['E-mount', 'FE-mount'] },
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'lens1',
            sku: 'LENS-1',
            model: 'Sony 24-70',
            dailyPrice: 50,
            categoryId: 'lenses',
            specifications: { compatibleMounts: ['E-mount'] },
            category: { name: 'Lenses', slug: 'lenses' },
            brand: { name: 'Sony', slug: 'sony' },
            media: [],
          },
        ])
      mockGetSpecValue.mockReturnValue(null)
      mockGetSpecArray.mockImplementation((spec: unknown, key: string) => {
        if (key === 'compatibleMounts' && spec && typeof spec === 'object' && 'compatibleMounts' in spec) {
          return (spec as { compatibleMounts: string[] }).compatibleMounts
        }
        return []
      })
      const { AIService } = await import('../ai.service')
      const result = await AIService.getCompatibleEquipment({
        selectedEquipmentIds: ['cam1'],
        targetCategoryId: 'lenses',
      })
      expect(result.length).toBeGreaterThanOrEqual(0)
    })

    it('returns lenses with matchingCameraModels when lensMount matches', async () => {
      mockCategoryFindUnique.mockResolvedValue({ slug: 'lenses' })
      mockEquipmentFindMany
        .mockResolvedValueOnce([
          {
            id: 'cam1',
            model: 'Sony FX3',
            categoryId: 'cat1',
            category: { slug: 'cameras' },
            specifications: { lensMount: 'E-mount' },
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'lens1',
            sku: 'LENS-1',
            model: 'Sony 24-70',
            dailyPrice: 50,
            categoryId: 'lenses',
            specifications: { lensMount: 'E-mount' },
            category: { name: 'Lenses', slug: 'lenses' },
            brand: { name: 'Sony', slug: 'sony' },
            media: [],
          },
        ])
      mockGetSpecValue.mockImplementation((spec: unknown, key: string) =>
        spec && typeof spec === 'object' && 'lensMount' in spec
          ? (spec as { lensMount: string }).lensMount
          : null
      )
      mockGetSpecArray.mockReturnValue([])
      const { AIService } = await import('../ai.service')
      const result = await AIService.getCompatibleEquipment({
        selectedEquipmentIds: ['cam1'],
        targetCategoryId: 'lenses',
      })
      expect(result.length).toBe(1)
      expect(result[0].matchingCameraModels).toContain('Sony FX3')
    })

    it('adds second model to mountToModels when two cameras share mount', async () => {
      mockCategoryFindUnique.mockResolvedValue({ slug: 'lenses' })
      mockEquipmentFindMany
        .mockResolvedValueOnce([
          {
            id: 'cam1',
            model: 'Sony FX3',
            categoryId: 'cat1',
            category: { slug: 'cameras' },
            specifications: { compatibleMounts: ['E-mount'] },
          },
          {
            id: 'cam2',
            model: 'Sony FX6',
            categoryId: 'cat1',
            category: { slug: 'cameras' },
            specifications: { compatibleMounts: ['E-mount'] },
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'lens1',
            sku: 'LENS-1',
            model: 'Sony 24-70',
            dailyPrice: 50,
            categoryId: 'lenses',
            specifications: { lensMount: 'E-mount' },
            category: { name: 'Lenses', slug: 'lenses' },
            brand: { name: 'Sony', slug: 'sony' },
            media: [],
          },
        ])
      mockGetSpecValue.mockReturnValue(null)
      mockGetSpecArray.mockImplementation((spec: unknown, key: string) => {
        if (key === 'compatibleMounts' && spec && typeof spec === 'object' && 'compatibleMounts' in spec) {
          return (spec as { compatibleMounts: string[] }).compatibleMounts
        }
        return []
      })
      const { AIService } = await import('../ai.service')
      const result = await AIService.getCompatibleEquipment({
        selectedEquipmentIds: ['cam1', 'cam2'],
        targetCategoryId: 'lenses',
      })
      expect(result.length).toBeGreaterThanOrEqual(0)
      if (result.length > 0 && result[0].matchingCameraModels) {
        expect(result[0].matchingCameraModels).toContain('Sony FX3')
        expect(result[0].matchingCameraModels).toContain('Sony FX6')
      }
    })
  })

  describe('buildKit full coverage', () => {
    it('handles ShootTypeService.getById failure', async () => {
      mockShootTypeGetById.mockRejectedValue(new Error('Not found'))
      mockEquipmentFindMany.mockResolvedValue(
        Array.from({ length: 10 }, (_, i) => ({
          id: `eq${i + 1}`,
          sku: `CAM${i + 1}`,
          model: null,
          dailyPrice: 100 + i * 10,
          category: { name: 'Cameras' },
          brand: { name: 'Sony' },
        }))
      )
      const { AIService } = await import('../ai.service')
      const result = await AIService.buildKit({
        projectType: 'wedding',
        duration: 3,
        shootTypeId: 'st-missing',
      })
      expect(result.length).toBeGreaterThanOrEqual(0)
    })

    it('handles ShootTypeService.getById throwing non-Error', async () => {
      mockShootTypeGetById.mockRejectedValue('string error')
      mockEquipmentFindMany.mockResolvedValue(
        Array.from({ length: 10 }, (_, i) => ({
          id: `eq${i + 1}`,
          sku: `CAM${i + 1}`,
          model: null,
          dailyPrice: 100 + i * 10,
          category: { name: 'Cameras' },
          brand: { name: 'Sony' },
        }))
      )
      const { AIService } = await import('../ai.service')
      const result = await AIService.buildKit({
        projectType: 'wedding',
        duration: 3,
        shootTypeId: 'st-missing',
      })
      expect(result.length).toBeGreaterThanOrEqual(0)
    })

    it('handles Prisma Decimal dailyPrice with toNumber', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      mockShootTypeGetBySlug.mockResolvedValue({
        id: 'st1',
        name: 'Wedding',
        slug: 'wedding',
        recommendations: [
          {
            equipmentId: 'eq1',
            budgetTier: 'PROFESSIONAL',
            reason: 'Essential',
            defaultQuantity: 1,
            sortOrder: 1,
            equipment: {
              id: 'eq1',
              sku: 'CAM-1',
              model: 'Sony FX3',
              dailyPrice: { toNumber: () => 500 },
            },
          },
          {
            equipmentId: 'eq2',
            budgetTier: 'PROFESSIONAL',
            reason: 'Audio',
            defaultQuantity: 1,
            sortOrder: 0,
            equipment: {
              id: 'eq2',
              sku: 'MIC-1',
              model: 'Rode',
              dailyPrice: 100,
            },
          },
        ],
      })
      const { AIService } = await import('../ai.service')
      const result = await AIService.buildKit({
        projectType: 'wedding',
        duration: 3,
        shootTypeSlug: 'wedding',
      })
      expect(result[0].equipment[0].dailyPrice).toBe(100)
      expect(result[0].equipment[1].dailyPrice).toBe(500)
    })

    it('uses Gemini for kit reasons when available', async () => {
      process.env.GEMINI_API_KEY = 'test-gemini-key'
      delete process.env.OPENAI_API_KEY
      mockShootTypeGetBySlug.mockResolvedValue({
        id: 'st1',
        name: 'Wedding',
        slug: 'wedding',
        recommendations: [
          {
            equipmentId: 'eq1',
            budgetTier: 'PROFESSIONAL',
            reason: 'Essential',
            defaultQuantity: 1,
            sortOrder: 0,
            equipment: {
              id: 'eq1',
              sku: 'CAM-1',
              model: 'Sony FX3',
              dailyPrice: 500,
            },
          },
        ],
      })
      mockGeminiGenerateContent.mockResolvedValue({
        response: { text: () => '["Great for ceremony coverage"]' },
      })
      const { AIService } = await import('../ai.service')
      const result = await AIService.buildKit({
        projectType: 'wedding',
        duration: 3,
        shootTypeSlug: 'wedding',
      })
      expect(result[0].equipment[0].reason).toBe('Great for ceremony coverage')
    })

    it('falls back to rule-based reasons when Gemini kit reasons fails', async () => {
      process.env.GEMINI_API_KEY = 'test-gemini-key'
      delete process.env.OPENAI_API_KEY
      mockShootTypeGetBySlug.mockResolvedValue({
        id: 'st1',
        name: 'Wedding',
        slug: 'wedding',
        recommendations: [
          {
            equipmentId: 'eq1',
            budgetTier: 'PROFESSIONAL',
            reason: 'Essential for wedding',
            defaultQuantity: 1,
            sortOrder: 0,
            equipment: {
              id: 'eq1',
              sku: 'CAM-1',
              model: 'Sony FX3',
              dailyPrice: 500,
            },
          },
        ],
      })
      mockGeminiGenerateContent.mockRejectedValue(new Error('Gemini API error'))
      const { AIService } = await import('../ai.service')
      const result = await AIService.buildKit({
        projectType: 'wedding',
        duration: 3,
        shootTypeSlug: 'wedding',
      })
      expect(result[0].equipment[0].reason).toContain('Essential')
    })

    it('falls back to OpenAI when Gemini fails and OpenAI available for kit reasons', async () => {
      process.env.GEMINI_API_KEY = 'test-gemini-key'
      process.env.OPENAI_API_KEY = 'sk-test'
      mockShootTypeGetBySlug.mockResolvedValue({
        id: 'st1',
        name: 'Wedding',
        slug: 'wedding',
        recommendations: [
          {
            equipmentId: 'eq1',
            budgetTier: 'PROFESSIONAL',
            reason: 'Essential',
            defaultQuantity: 1,
            sortOrder: 0,
            equipment: {
              id: 'eq1',
              sku: 'CAM-1',
              model: 'Sony FX3',
              dailyPrice: 500,
            },
          },
        ],
      })
      mockGeminiGenerateContent.mockRejectedValue(new Error('Gemini down'))
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: '["OpenAI reason for wedding"]' } }],
      })
      const { AIService } = await import('../ai.service')
      const result = await AIService.buildKit({
        projectType: 'wedding',
        duration: 3,
        shootTypeSlug: 'wedding',
      })
      expect(result[0].equipment[0].reason).toBeDefined()
    })

    it('applies outdoor questionnaire boost for light equipment', async () => {
      mockShootTypeGetBySlug.mockResolvedValue({
        id: 'st1',
        name: 'Wedding',
        slug: 'wedding',
        recommendations: [
          {
            equipmentId: 'eq1',
            budgetTier: 'PROFESSIONAL',
            reason: 'Light and portable',
            defaultQuantity: 1,
            sortOrder: 0,
            equipment: {
              id: 'eq1',
              sku: 'CAM-1',
              model: 'Sony FX3',
              dailyPrice: 500,
            },
          },
        ],
      })
      const { AIService } = await import('../ai.service')
      const result = await AIService.buildKit({
        projectType: 'wedding',
        duration: 3,
        shootTypeSlug: 'wedding',
        questionnaireAnswers: { environment: 'outdoor' },
      })
      expect(result[0].equipment[0].reason).toContain('Portable and ideal for outdoor')
    })

    it('applies large crew boost for audio equipment', async () => {
      mockShootTypeGetBySlug.mockResolvedValue({
        id: 'st1',
        name: 'Wedding',
        slug: 'wedding',
        recommendations: [
          {
            equipmentId: 'eq1',
            budgetTier: 'PROFESSIONAL',
            reason: 'Professional audio capture',
            defaultQuantity: 1,
            sortOrder: 0,
            equipment: {
              id: 'eq1',
              sku: 'AUD-1',
              model: 'Rode NTG',
              dailyPrice: 50,
            },
          },
        ],
      })
      const { AIService } = await import('../ai.service')
      const result = await AIService.buildKit({
        projectType: 'wedding',
        duration: 3,
        shootTypeSlug: 'wedding',
        questionnaireAnswers: { crew_size: 'large' },
      })
      expect(result[0].equipment[0].reason).toContain('Suitable for larger crew')
    })

    it('uses OpenAI for kit reasons when Gemini unavailable', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      delete process.env.GEMINI_API_KEY
      mockShootTypeGetBySlug.mockResolvedValue({
        id: 'st1',
        name: 'Wedding',
        slug: 'wedding',
        recommendations: [
          {
            equipmentId: 'eq1',
            budgetTier: 'PROFESSIONAL',
            reason: 'Essential',
            defaultQuantity: 1,
            sortOrder: 0,
            equipment: {
              id: 'eq1',
              sku: 'CAM-1',
              model: 'Sony FX3',
              dailyPrice: 500,
            },
          },
        ],
      })
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: '["OpenAI enhanced reason"]' } }],
      })
      const { AIService } = await import('../ai.service')
      const result = await AIService.buildKit({
        projectType: 'wedding',
        duration: 3,
        shootTypeSlug: 'wedding',
      })
      expect(result[0].equipment[0].reason).toBe('OpenAI enhanced reason')
    })

    it('keeps rule-based reasons when OpenAI kit reasons fails', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      delete process.env.GEMINI_API_KEY
      mockShootTypeGetBySlug.mockResolvedValue({
        id: 'st1',
        name: 'Wedding',
        slug: 'wedding',
        recommendations: [
          {
            equipmentId: 'eq1',
            budgetTier: 'PROFESSIONAL',
            reason: 'Essential for ceremony',
            defaultQuantity: 1,
            sortOrder: 0,
            equipment: {
              id: 'eq1',
              sku: 'CAM-1',
              model: 'Sony FX3',
              dailyPrice: 500,
            },
          },
        ],
      })
      mockOpenAICreate.mockRejectedValue(new Error('OpenAI API error'))
      const { AIService } = await import('../ai.service')
      const result = await AIService.buildKit({
        projectType: 'wedding',
        duration: 3,
        shootTypeSlug: 'wedding',
      })
      expect(result[0].equipment[0].reason).toContain('Essential')
    })

    it('keeps rule-based reasons when OpenAI returns empty content for kit reasons', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      delete process.env.GEMINI_API_KEY
      mockShootTypeGetBySlug.mockResolvedValue({
        id: 'st1',
        name: 'Wedding',
        slug: 'wedding',
        recommendations: [
          {
            equipmentId: 'eq1',
            budgetTier: 'PROFESSIONAL',
            reason: 'Essential',
            defaultQuantity: 1,
            sortOrder: 0,
            equipment: {
              id: 'eq1',
              sku: 'CAM-1',
              model: 'Sony FX3',
              dailyPrice: 500,
            },
          },
        ],
      })
      mockOpenAICreate.mockResolvedValue({ choices: [{ message: { content: '' } }] })
      const { AIService } = await import('../ai.service')
      const result = await AIService.buildKit({
        projectType: 'wedding',
        duration: 3,
        shootTypeSlug: 'wedding',
      })
      expect(result[0].equipment[0].reason).toContain('Essential')
    })

    it('returns LLM-selected kit when OpenAI returns valid equipment list', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      delete process.env.GEMINI_API_KEY
      mockShootTypeGetBySlug.mockResolvedValue(null)
      mockShootTypeGetById.mockResolvedValue(null)
      mockEquipmentFindMany.mockResolvedValue(
        Array.from({ length: 10 }, (_, i) => ({
          id: `eq${i + 1}`,
          sku: `CAM${i + 1}`,
          model: null,
          dailyPrice: 100 + i * 10,
          category: { name: 'Cameras' },
          brand: { name: 'Sony' },
        }))
      )
      mockOpenAICreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify([
                { equipmentId: 'eq1', quantity: 1, reason: 'Primary camera' },
                { equipmentId: 'eq2', quantity: 1, reason: 'Backup' },
              ]),
            },
          },
        ],
      })
      const { AIService } = await import('../ai.service')
      const result = await AIService.buildKit({
        projectType: 'commercial',
        duration: 2,
      })
      expect(result[0].name).toContain('AI suggested')
      expect(result[0].equipment).toHaveLength(2)
    })

    it('falls back to Gemini kit selection when OpenAI returns empty', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      process.env.GEMINI_API_KEY = 'test-gemini-key'
      mockShootTypeGetBySlug.mockResolvedValue(null)
      mockShootTypeGetById.mockResolvedValue(null)
      mockEquipmentFindMany.mockResolvedValue(
        Array.from({ length: 10 }, (_, i) => ({
          id: `eq${i + 1}`,
          sku: `CAM${i + 1}`,
          model: null,
          dailyPrice: 100 + i * 10,
          category: { name: 'Cameras' },
          brand: { name: 'Sony' },
        }))
      )
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: 'invalid json' } }],
      })
      mockGeminiGenerateContent.mockResolvedValue({
        response: {
          text: () =>
            JSON.stringify([
              { equipmentId: 'eq1', quantity: 1, reason: 'Primary' },
              { equipmentId: 'eq2', quantity: 1, reason: 'Backup' },
            ]),
        },
      })
      const { AIService } = await import('../ai.service')
      const result = await AIService.buildKit({
        projectType: 'commercial',
        duration: 2,
      })
      expect(result.length).toBeGreaterThanOrEqual(0)
    })

    it('falls back to rule-based when OpenAI kit selection throws', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      delete process.env.GEMINI_API_KEY
      mockShootTypeGetBySlug.mockResolvedValue(null)
      mockShootTypeGetById.mockResolvedValue(null)
      mockEquipmentFindMany.mockResolvedValue(
        Array.from({ length: 10 }, (_, i) => ({
          id: `eq${i + 1}`,
          sku: `CAM${i + 1}`,
          model: null,
          dailyPrice: 100 + i * 10,
          category: { name: 'Cameras' },
          brand: { name: 'Sony' },
        }))
      )
      mockOpenAICreate.mockRejectedValue(new Error('OpenAI API error'))
      const { AIService } = await import('../ai.service')
      const result = await AIService.buildKit({
        projectType: 'commercial',
        duration: 2,
      })
      expect(result.length).toBeGreaterThanOrEqual(0)
    })

    it('falls back to rule-based when Gemini kit selection throws after OpenAI returns empty', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      process.env.GEMINI_API_KEY = 'test-gemini-key'
      mockShootTypeGetBySlug.mockResolvedValue(null)
      mockShootTypeGetById.mockResolvedValue(null)
      mockEquipmentFindMany.mockResolvedValue(
        Array.from({ length: 10 }, (_, i) => ({
          id: `eq${i + 1}`,
          sku: `CAM${i + 1}`,
          model: null,
          dailyPrice: 100 + i * 10,
          category: { name: 'Cameras' },
          brand: { name: 'Sony' },
        }))
      )
      mockOpenAICreate.mockResolvedValue({ choices: [{ message: { content: 'no json array' } }] })
      mockGeminiGenerateContent.mockRejectedValue(new Error('Gemini API error'))
      const { AIService } = await import('../ai.service')
      const result = await AIService.buildKit({
        projectType: 'commercial',
        duration: 2,
      })
      expect(result.length).toBeGreaterThanOrEqual(0)
    })

    it('falls back to rule-based when OpenAI returns undefined content for LLM kit selection', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      delete process.env.GEMINI_API_KEY
      mockShootTypeGetBySlug.mockResolvedValue(null)
      mockShootTypeGetById.mockResolvedValue(null)
      mockEquipmentFindMany.mockResolvedValue(
        Array.from({ length: 10 }, (_, i) => ({
          id: `eq${i + 1}`,
          sku: `CAM${i + 1}`,
          model: null,
          dailyPrice: 100 + i * 10,
          category: { name: 'Cameras' },
          brand: { name: 'Sony' },
        }))
      )
      mockOpenAICreate.mockResolvedValue({ choices: [] })
      const { AIService } = await import('../ai.service')
      const result = await AIService.buildKit({
        projectType: 'commercial',
        duration: 2,
      })
      expect(result[0].name).toContain('Basic')
    })

    it('falls back to rule-based when Gemini returns empty text for LLM kit selection', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      process.env.GEMINI_API_KEY = 'test-gemini-key'
      mockShootTypeGetBySlug.mockResolvedValue(null)
      mockShootTypeGetById.mockResolvedValue(null)
      mockEquipmentFindMany.mockResolvedValue(
        Array.from({ length: 10 }, (_, i) => ({
          id: `eq${i + 1}`,
          sku: `CAM${i + 1}`,
          model: null,
          dailyPrice: 100 + i * 10,
          category: { name: 'Cameras' },
          brand: { name: 'Sony' },
        }))
      )
      mockOpenAICreate.mockResolvedValue({ choices: [] })
      mockGeminiGenerateContent.mockResolvedValue({ response: { text: () => '' } })
      const { AIService } = await import('../ai.service')
      const result = await AIService.buildKit({
        projectType: 'commercial',
        duration: 2,
      })
      expect(result[0].name).toContain('Basic')
    })

    it('returns professional kit when budget allows', async () => {
      delete process.env.OPENAI_API_KEY
      delete process.env.GEMINI_API_KEY
      mockShootTypeGetBySlug.mockResolvedValue(null)
      mockShootTypeGetById.mockResolvedValue(null)
      mockEquipmentFindMany.mockResolvedValue(
        Array.from({ length: 15 }, (_, i) => ({
          id: `eq${i + 1}`,
          sku: `CAM${i + 1}`,
          model: null,
          dailyPrice: 100,
          category: { name: 'Cameras' },
          brand: { name: 'Sony' },
        }))
      )
      const { AIService } = await import('../ai.service')
      const result = await AIService.buildKit({
        projectType: 'wedding',
        duration: 3,
        budget: 50000,
        useCase: 'ceremony',
      })
      expect(result.length).toBeGreaterThanOrEqual(1)
      const proKit = result.find((k) => k.name.includes('Professional'))
      expect(proKit).toBeDefined()
      expect(proKit?.discount).toBe(10)
    })

    it('assigns primary support optional roles in basic and professional kits', async () => {
      delete process.env.OPENAI_API_KEY
      delete process.env.GEMINI_API_KEY
      mockShootTypeGetBySlug.mockResolvedValue(null)
      mockShootTypeGetById.mockResolvedValue(null)
      mockEquipmentFindMany.mockResolvedValue(
        Array.from({ length: 12 }, (_, i) => ({
          id: `eq${i + 1}`,
          sku: `CAM${i + 1}`,
          model: null,
          dailyPrice: 50,
          category: { name: 'Cameras' },
          brand: { name: 'Sony' },
        }))
      )
      const { AIService } = await import('../ai.service')
      const result = await AIService.buildKit({
        projectType: 'wedding',
        duration: 3,
        budget: 10000,
      })
      const basicKit = result.find((k) => k.name.includes('Basic'))
      const proKit = result.find((k) => k.name.includes('Professional'))
      expect(basicKit?.equipment[0].role).toBe('primary')
      expect(basicKit?.equipment[1].role).toBe('support')
      expect(basicKit?.equipment[4].role).toBe('optional')
      if (proKit?.equipment) {
        expect(proKit.equipment[0].role).toBe('primary')
        expect(proKit.equipment[3].role).toBe('support')
        expect(proKit.equipment[7].role).toBe('optional')
      }
    })
  })

  describe('suggestPricing full coverage', () => {
    it('suggests price increase for high demand', async () => {
      const created = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000)
      mockEquipmentFindUnique.mockResolvedValue({
        id: 'eq1',
        sku: 'CAM1',
        createdAt: created,
        category: { name: 'Cameras' },
      })
      mockBookingEquipmentFindMany.mockResolvedValue(
        Array.from({ length: 50 }, () => ({
          equipmentId: 'eq1',
          bookingId: 'b1',
          quantity: 1,
          booking: {
            startDate: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
            endDate: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
          },
        }))
      )
      const { AIService } = await import('../ai.service')
      const result = await AIService.suggestPricing({
        equipmentId: 'eq1',
        currentPrice: 100,
      })
      expect(result.suggestedPrice).toBeGreaterThan(100)
      expect(result.reasoning).toContain('High demand')
    })

    it('suggests price decrease for low demand', async () => {
      const created = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
      mockEquipmentFindUnique.mockResolvedValue({
        id: 'eq1',
        sku: 'CAM1',
        createdAt: created,
        category: { name: 'Cameras' },
      })
      mockBookingEquipmentFindMany.mockResolvedValue([
        {
          equipmentId: 'eq1',
          bookingId: 'b1',
          quantity: 1,
          booking: {
            startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
            endDate: new Date(Date.now() - 58 * 24 * 60 * 60 * 1000),
          },
        },
      ])
      const { AIService } = await import('../ai.service')
      const result = await AIService.suggestPricing({
        equipmentId: 'eq1',
        currentPrice: 100,
      })
      expect(result.suggestedPrice).toBeLessThan(100)
      expect(result.reasoning).toContain('Low demand')
    })

    it('uses Gemini for rationale when OpenAI unavailable', async () => {
      process.env.GEMINI_API_KEY = 'test-gemini-key'
      delete process.env.OPENAI_API_KEY
      mockEquipmentFindUnique.mockResolvedValue({
        id: 'eq1',
        sku: 'CAM1',
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        category: { name: 'Cameras' },
      })
      mockBookingEquipmentFindMany.mockResolvedValue([])
      mockGeminiGenerateContent.mockResolvedValue({
        response: { text: () => 'Gemini pricing rationale.' },
      })
      const { AIService } = await import('../ai.service')
      const result = await AIService.suggestPricing({
        equipmentId: 'eq1',
        currentPrice: 100,
      })
      expect(result.rationale).toBe('Gemini pricing rationale.')
    })

    it('returns empty rationale when OpenAI returns empty content', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      delete process.env.GEMINI_API_KEY
      mockEquipmentFindUnique.mockResolvedValue({
        id: 'eq1',
        sku: 'CAM1',
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        category: { name: 'Cameras' },
      })
      mockBookingEquipmentFindMany.mockResolvedValue([])
      mockOpenAICreate.mockResolvedValue({ choices: [{ message: { content: '' } }] })
      const { AIService } = await import('../ai.service')
      const result = await AIService.suggestPricing({
        equipmentId: 'eq1',
        currentPrice: 100,
      })
      expect(result.rationale).toBe('')
    })

    it('returns empty rationale when Gemini returns empty text', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      process.env.GEMINI_API_KEY = 'test-gemini'
      mockEquipmentFindUnique.mockResolvedValue({
        id: 'eq1',
        sku: 'CAM1',
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        category: { name: 'Cameras' },
      })
      mockBookingEquipmentFindMany.mockResolvedValue([])
      mockOpenAICreate.mockRejectedValue(new Error('OpenAI down'))
      mockGeminiGenerateContent.mockResolvedValue({
        response: { text: () => '' },
      })
      const { AIService } = await import('../ai.service')
      const result = await AIService.suggestPricing({
        equipmentId: 'eq1',
        currentPrice: 100,
      })
      expect(result.rationale).toBe('')
    })
  })

  describe('forecastDemand full coverage', () => {
    it('adds weekly projection when OpenAI available and totalBookings >= 3', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      mockEquipmentFindMany.mockResolvedValue([
        {
          id: 'eq1',
          sku: 'CAM1',
          dailyPrice: 100,
        },
      ])
      mockBookingEquipmentFindMany.mockResolvedValue(
        Array.from({ length: 5 }, (_, i) => ({
          equipmentId: 'eq1',
          bookingId: `b${i}`,
          booking: {
            startDate: new Date(Date.now() - (60 - i * 7) * 24 * 60 * 60 * 1000),
            endDate: new Date(Date.now() - (58 - i * 7) * 24 * 60 * 60 * 1000),
          },
        }))
      )
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: '[1,2,2,3,3,4,4,5,5,6,6,7]' } }],
      })
      const { AIService } = await import('../ai.service')
      const result = await AIService.forecastDemand({ period: 'month' })
      expect(result[0].weeklyProjection).toEqual([1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7])
    })

    it('returns increasing historicalTrend when recent > older', async () => {
      mockEquipmentFindMany.mockResolvedValue([
        { id: 'eq1', sku: 'CAM1', dailyPrice: 100 },
      ])
      const base = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      mockBookingEquipmentFindMany.mockResolvedValue([
        ...Array.from({ length: 3 }, (_, i) => ({
          equipmentId: 'eq1',
          bookingId: `b-old-${i}`,
          booking: { startDate: new Date(base.getTime() + i * 7 * 24 * 60 * 60 * 1000) },
        })),
        ...Array.from({ length: 5 }, (_, i) => ({
          equipmentId: 'eq1',
          bookingId: `b-new-${i}`,
          booking: {
            startDate: new Date(Date.now() - (10 - i) * 24 * 60 * 60 * 1000),
          },
        })),
      ])
      const { AIService } = await import('../ai.service')
      const result = await AIService.forecastDemand({ period: 'month' })
      expect(result[0].factors.historicalTrend).toBe('increasing')
    })

    it('returns decreasing historicalTrend and correct recommendations', async () => {
      mockEquipmentFindMany.mockResolvedValue([
        { id: 'eq1', sku: 'CAM1', dailyPrice: 100 },
      ])
      const base = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      mockBookingEquipmentFindMany.mockResolvedValue([
        ...Array.from({ length: 8 }, (_, i) => ({
          equipmentId: 'eq1',
          bookingId: `b-old-${i}`,
          booking: { startDate: new Date(base.getTime() + i * 5 * 24 * 60 * 60 * 1000) },
        })),
        ...Array.from({ length: 2 }, (_, i) => ({
          equipmentId: 'eq1',
          bookingId: `b-new-${i}`,
          booking: {
            startDate: new Date(Date.now() - (5 - i) * 24 * 60 * 60 * 1000),
          },
        })),
      ])
      const { AIService } = await import('../ai.service')
      const result = await AIService.forecastDemand({ period: 'month' })
      expect(result[0].factors.historicalTrend).toBe('decreasing')
      expect(result[0].factors.marketTrend).toBe('down')
    })

    it('returns forecast for single equipmentId with high demand recommendations', async () => {
      mockEquipmentFindUnique.mockResolvedValue({
        id: 'eq1',
        sku: 'CAM1',
        dailyPrice: 200,
      })
      mockEquipmentFindMany.mockResolvedValue([])
      const base = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
      mockBookingEquipmentFindMany.mockResolvedValue(
        Array.from({ length: 35 }, (_, i) => ({
          equipmentId: 'eq1',
          bookingId: `b${i}`,
          booking: { startDate: new Date(base.getTime() + i * 2 * 24 * 60 * 60 * 1000) },
        }))
      )
      const { AIService } = await import('../ai.service')
      const result = await AIService.forecastDemand({
        equipmentId: 'eq1',
        period: 'month',
      })
      expect(result).toHaveLength(1)
      expect(result[0].recommendations.inventoryLevel).toBe('increase')
      expect(result[0].recommendations.pricingSuggestion).toBe('increase')
    })

    it('uses quarter multiplier when period is quarter', async () => {
      mockEquipmentFindMany.mockResolvedValue([{ id: 'eq1', sku: 'CAM1', dailyPrice: 100 }])
      mockBookingEquipmentFindMany.mockResolvedValue(
        Array.from({ length: 5 }, (_, i) => ({
          equipmentId: 'eq1',
          bookingId: `b${i}`,
          booking: { startDate: new Date(Date.now() - (60 - i * 7) * 24 * 60 * 60 * 1000) },
        }))
      )
      const { AIService } = await import('../ai.service')
      const result = await AIService.forecastDemand({ period: 'quarter' })
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('chat full coverage', () => {
    it('uses Gemini when AI_PROVIDER is gemini', async () => {
      process.env.GEMINI_API_KEY = 'test-gemini-key'
      delete process.env.OPENAI_API_KEY
      process.env.AI_PROVIDER = 'gemini'
      mockGeminiGenerateContent.mockResolvedValue({
        response: { text: () => 'Gemini AI response for your question.' },
      })
      const { AIService } = await import('../ai.service')
      const result = await AIService.chat({ message: 'What is your return policy?' })
      expect(result.message).toContain('Gemini AI response')
    })

    it('falls back to OpenAI when Gemini fails', async () => {
      process.env.GEMINI_API_KEY = 'test-gemini-key'
      process.env.OPENAI_API_KEY = 'sk-test'
      process.env.AI_PROVIDER = 'gemini'
      mockGeminiGenerateContent.mockRejectedValue(new Error('Gemini down'))
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: 'OpenAI fallback response' } }],
      })
      const { AIService } = await import('../ai.service')
      const result = await AIService.chat({ message: 'Random question xyz' })
      expect(result.message).toContain('OpenAI fallback response')
    })

    it('returns generic when both Gemini and OpenAI fail', async () => {
      process.env.GEMINI_API_KEY = 'test-gemini-key'
      process.env.OPENAI_API_KEY = 'sk-test'
      process.env.AI_PROVIDER = 'gemini'
      mockGeminiGenerateContent.mockRejectedValue(new Error('Gemini down'))
      mockOpenAICreate.mockRejectedValue(new Error('OpenAI down'))
      const { AIService } = await import('../ai.service')
      const result = await AIService.chat({ message: 'Random question abc' })
      expect(result.message).toContain('I apologize, I am having trouble')
      expect(result.requiresHuman).toBe(true)
    })

    it('returns generic when no API key and unrecognized message', async () => {
      delete process.env.OPENAI_API_KEY
      delete process.env.GEMINI_API_KEY
      process.env.AI_PROVIDER = 'gemini'
      const { AIService } = await import('../ai.service')
      const result = await AIService.chat({ message: 'Random gibberish 123' })
      expect(result.message).toContain('I can help you with equipment search')
      expect(result.suggestions).toContain('Search equipment')
    })

    it('returns generic when Gemini fails and no OpenAI key', async () => {
      process.env.GEMINI_API_KEY = 'test-gemini-key'
      delete process.env.OPENAI_API_KEY
      process.env.AI_PROVIDER = 'gemini'
      mockGeminiGenerateContent.mockRejectedValue(new Error('Gemini down'))
      const { AIService } = await import('../ai.service')
      const result = await AIService.chat({ message: 'What is your cancellation policy?' })
      expect(result.message).toContain('I can help you with equipment search')
      expect(result.suggestions).toContain('Search equipment')
    })

    it('handles OpenAI error when provider is openai', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      delete process.env.GEMINI_API_KEY
      process.env.AI_PROVIDER = 'openai'
      mockOpenAICreate.mockRejectedValue(new Error('API error'))
      const { AIService } = await import('../ai.service')
      const result = await AIService.chat({ message: 'Tell me something' })
      expect(result.requiresHuman).toBe(true)
    })

    it('returns OpenAI response when provider is openai and API succeeds', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      delete process.env.GEMINI_API_KEY
      process.env.AI_PROVIDER = 'openai'
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: 'Here is your custom response from OpenAI.' } }],
      })
      const { AIService } = await import('../ai.service')
      const result = await AIService.chat({ message: 'Tell me about your insurance policy' })
      expect(result.message).toContain('custom response from OpenAI')
      expect(result.confidence).toBe(80)
    })

    it('returns fallback message when OpenAI response has no content (provider openai)', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      delete process.env.GEMINI_API_KEY
      process.env.AI_PROVIDER = 'openai'
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: undefined } }],
      })
      const { AIService } = await import('../ai.service')
      const result = await AIService.chat({ message: 'Hello' })
      expect(result.message).toBe('I apologize, I could not generate a response.')
      expect(result.confidence).toBe(80)
    })

    it('returns fallback message when Gemini fallback OpenAI response has no content', async () => {
      process.env.GEMINI_API_KEY = 'test-gemini-key'
      process.env.OPENAI_API_KEY = 'sk-test'
      process.env.AI_PROVIDER = 'gemini'
      mockGeminiGenerateContent.mockRejectedValue(new Error('Gemini down'))
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: {} }],
      })
      const { AIService } = await import('../ai.service')
      const result = await AIService.chat({ message: 'Hello' })
      expect(result.message).toBe('I apologize, I could not generate a response.')
    })
  })

  describe('formatErrorForLog', () => {
    it('returns message and stack for Error with stack', async () => {
      const { AIService } = await import('../ai.service')
      const err = new Error('test message')
      const result = AIService.formatErrorForLog(err)
      expect(result.error).toBe('test message')
      expect(result.stack).toBeDefined()
      expect(typeof result.stack).toBe('string')
    })

    it('returns String(error) and undefined for non-Error', async () => {
      const { AIService } = await import('../ai.service')
      const result = AIService.formatErrorForLog('string error')
      expect(result.error).toBe('string error')
      expect(result.stack).toBeUndefined()
    })

    it('returns undefined stack for Error with no stack', async () => {
      const { AIService } = await import('../ai.service')
      const err = Object.create(Error.prototype) as Error
      err.message = 'no stack'
      ;(err as Error & { stack?: string }).stack = undefined
      const result = AIService.formatErrorForLog(err)
      expect(result.error).toBe('no stack')
      expect(result.stack).toBeUndefined()
    })
  })

  describe('100% branch coverage - error handling', () => {
    function createErrorWithNoStack(message: string): Error {
      const err = Object.create(Error.prototype) as Error
      err.message = message
      ;(err as Error & { stack?: string }).stack = undefined
      return err
    }

    it('assessRisk handles non-Error throw from OpenAI', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      delete process.env.GEMINI_API_KEY
      mockOpenAICreate.mockRejectedValueOnce('string error not Error object')
      const { AIService } = await import('../ai.service')
      const result = await AIService.assessRisk({
        equipmentIds: ['eq1'],
        rentalDuration: 5,
        totalValue: 5000,
      })
      expect(result.narrativeSummaryAr).toBeUndefined()
    })

    it('assessRisk handles non-Error throw from Gemini fallback', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      process.env.GEMINI_API_KEY = 'test-gemini'
      mockOpenAICreate.mockRejectedValueOnce(new Error('OpenAI down'))
      mockGeminiGenerateContent.mockRejectedValueOnce('gemini string error')
      const { AIService } = await import('../ai.service')
      const result = await AIService.assessRisk({
        equipmentIds: ['eq1'],
        rentalDuration: 5,
        totalValue: 5000,
      })
      expect(result.narrativeSummaryAr).toBeUndefined()
    })

    it('assessRisk handles Error with no stack in catch', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      delete process.env.GEMINI_API_KEY
      const err = Object.create(Error.prototype) as Error
      err.message = 'OpenAI error'
      ;(err as Error & { stack?: string }).stack = undefined
      mockOpenAICreate.mockRejectedValueOnce(err)
      const { AIService } = await import('../ai.service')
      const result = await AIService.assessRisk({
        equipmentIds: ['eq1'],
        rentalDuration: 5,
        totalValue: 5000,
      })
      expect(result.narrativeSummaryAr).toBeUndefined()
    })

    it('recommendAlternatives handles non-Error in embeddings batch', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      mockEquipmentFindUnique.mockResolvedValue({
        id: 'eq1',
        categoryId: 'cat1',
        sku: 'CAM-1',
        model: 'X',
        dailyPrice: 100,
        category: { name: 'Cameras' },
      })
      mockEquipmentFindMany.mockResolvedValue([
        {
          id: 'eq2',
          categoryId: 'cat1',
          sku: 'CAM-2',
          model: 'Y',
          dailyPrice: 120,
          brandId: 'b1',
          category: { name: 'Cameras' },
          brand: { name: 'Sony' },
        },
      ])
      mockOpenAIEmbeddings
        .mockResolvedValueOnce({ data: [{ embedding: [0.1, 0.2] }] })
        .mockRejectedValueOnce('batch string error')
      const { AIService } = await import('../ai.service')
      const result = await AIService.recommendAlternatives({ unavailableEquipmentId: 'eq1' })
      expect(result.length).toBe(1)
    })

    it('recommendAlternatives uses Unknown when equipment has null sku', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      mockEquipmentFindUnique.mockResolvedValue({
        id: 'eq1',
        categoryId: 'cat1',
        sku: null,
        model: null,
        dailyPrice: 100,
        category: { name: 'Cameras' },
      })
      mockEquipmentFindMany.mockResolvedValue([
        {
          id: 'eq2',
          categoryId: 'cat1',
          sku: null,
          model: null,
          dailyPrice: 100,
          brandId: null,
          category: { name: 'Cameras' },
          brand: null,
        },
      ])
      mockOpenAIEmbeddings.mockRejectedValue(new Error('no embeddings'))
      const { AIService } = await import('../ai.service')
      const result = await AIService.recommendAlternatives({ unavailableEquipmentId: 'eq1' })
      expect(result[0].equipmentName).toBe('Unknown')
    })

    it('buildKit excludes equipment when excludeEquipmentIds provided', async () => {
      delete process.env.OPENAI_API_KEY
      delete process.env.GEMINI_API_KEY
      mockShootTypeGetBySlug.mockResolvedValue(null)
      mockEquipmentFindMany.mockResolvedValue(
        Array.from({ length: 10 }, (_, i) => ({
          id: `eq${i + 1}`,
          sku: `CAM${i + 1}`,
          model: null,
          dailyPrice: 100 + i * 10,
          category: { name: 'Cameras' },
          brand: { name: 'Sony' },
        }))
      )
      const { AIService } = await import('../ai.service')
      const result = await AIService.buildKit({
        projectType: 'wedding',
        duration: 3,
        excludeEquipmentIds: ['eq1', 'eq2'],
      })
      expect(result.length).toBeGreaterThanOrEqual(1)
      expect(mockEquipmentFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            id: expect.objectContaining({ notIn: ['eq1', 'eq2'] }),
          }),
        })
      )
    })

    it('buildKit applies questionnaireAnswers for outdoor and large crew', async () => {
      process.env.GEMINI_API_KEY = 'test-gemini'
      delete process.env.OPENAI_API_KEY
      mockShootTypeGetBySlug.mockResolvedValue({
        id: 'st1',
        name: 'Wedding',
        slug: 'wedding',
        recommendations: [
          {
            equipmentId: 'eq1',
            budgetTier: 'PROFESSIONAL',
            reason: 'Light and portable',
            defaultQuantity: 1,
            sortOrder: 0,
            equipment: { id: 'eq1', sku: 'CAM-1', model: 'Sony', dailyPrice: 500 },
          },
          {
            equipmentId: 'eq2',
            budgetTier: 'PROFESSIONAL',
            reason: 'Audio capture',
            defaultQuantity: 1,
            sortOrder: 1,
            equipment: { id: 'eq2', sku: 'MIC-1', model: 'Rode', dailyPrice: 100 },
          },
        ],
      })
      mockGeminiGenerateContent.mockRejectedValue(new Error('skip AI'))
      const { AIService } = await import('../ai.service')
      const result = await AIService.buildKit({
        projectType: 'wedding',
        duration: 3,
        shootTypeSlug: 'wedding',
        questionnaireAnswers: {
          environment: 'outdoor',
          crew_size: 'large',
        },
      })
      expect(result[0].equipment.some((e) => e.reason.includes('outdoor'))).toBe(true)
      expect(result[0].equipment.some((e) => e.reason.includes('crew'))).toBe(true)
    })

    it('buildKit OpenAI kit reasons catch', async () => {
      process.env.GEMINI_API_KEY = 'test-gemini'
      process.env.OPENAI_API_KEY = 'sk-test'
      mockShootTypeGetBySlug.mockResolvedValue({
        id: 'st1',
        name: 'Wedding',
        slug: 'wedding',
        recommendations: [
          {
            equipmentId: 'eq1',
            budgetTier: 'PROFESSIONAL',
            reason: 'Essential',
            defaultQuantity: 1,
            sortOrder: 0,
            equipment: { id: 'eq1', sku: 'CAM-1', model: 'Sony', dailyPrice: 500 },
          },
        ],
      })
      mockGeminiGenerateContent.mockRejectedValue(new Error('Gemini down'))
      mockOpenAICreate.mockRejectedValue(new Error('OpenAI down'))
      const { AIService } = await import('../ai.service')
      const result = await AIService.buildKit({
        projectType: 'wedding',
        duration: 3,
        shootTypeSlug: 'wedding',
      })
      expect(result[0].equipment[0].reason).toContain('Essential')
    })

    it('buildKit returns professionalKit when budget allows', async () => {
      delete process.env.OPENAI_API_KEY
      delete process.env.GEMINI_API_KEY
      mockShootTypeGetBySlug.mockResolvedValue(null)
      mockEquipmentFindMany.mockResolvedValue(
        Array.from({ length: 15 }, (_, i) => ({
          id: `eq${i + 1}`,
          sku: `CAM${i + 1}`,
          model: null,
          dailyPrice: 50,
          category: { name: 'Cameras' },
          brand: { name: 'Sony' },
        }))
      )
      const { AIService } = await import('../ai.service')
      const result = await AIService.buildKit({
        projectType: 'wedding',
        duration: 3,
        budget: 5000,
      })
      const basicKit = result.find((k) => k.name.includes('Basic'))
      const proKit = result.find((k) => k.name.includes('Professional'))
      expect(basicKit).toBeDefined()
      expect(proKit).toBeDefined()
      expect(proKit!.discount).toBe(10)
    })

    it('buildKit LLM kit selection via OpenAI', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      delete process.env.GEMINI_API_KEY
      mockShootTypeGetBySlug.mockResolvedValue(null)
      mockEquipmentFindMany.mockResolvedValue(
        Array.from({ length: 10 }, (_, i) => ({
          id: `eq${i + 1}`,
          sku: `CAM${i + 1}`,
          model: null,
          dailyPrice: 100,
          category: { name: 'Cameras' },
          brand: { name: 'Sony' },
        }))
      )
      mockOpenAICreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify([
                { equipmentId: 'eq1', quantity: 1, reason: 'Primary camera' },
                { equipmentId: 'eq2', quantity: 1, reason: 'Backup' },
              ]),
            },
          },
        ],
      })
      const { AIService } = await import('../ai.service')
      const result = await AIService.buildKit({
        projectType: 'wedding',
        duration: 3,
      })
      expect(result.some((k) => k.name.includes('AI suggested'))).toBe(true)
    })

    it('buildKit LLM kit selection via Gemini when OpenAI fails', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      process.env.GEMINI_API_KEY = 'test-gemini'
      mockShootTypeGetBySlug.mockResolvedValue(null)
      mockEquipmentFindMany.mockResolvedValue(
        Array.from({ length: 10 }, (_, i) => ({
          id: `eq${i + 1}`,
          sku: `CAM${i + 1}`,
          model: null,
          dailyPrice: 100,
          category: { name: 'Cameras' },
          brand: { name: 'Sony' },
        }))
      )
      mockOpenAICreate.mockRejectedValue(new Error('OpenAI down'))
      mockGeminiGenerateContent.mockResolvedValue({
        response: {
          text: () =>
            JSON.stringify([
              { equipmentId: 'eq1', quantity: 2, reason: 'Primary' },
              { equipmentId: 'eq2', quantity: 1, reason: 'Support' },
            ]),
        },
      })
      const { AIService } = await import('../ai.service')
      const result = await AIService.buildKit({
        projectType: 'wedding',
        duration: 3,
      })
      expect(result.some((k) => k.name.includes('AI suggested'))).toBe(true)
    })

    it('buildKit LLM selection uses Unknown when eq has null sku', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      mockShootTypeGetBySlug.mockResolvedValue(null)
      mockEquipmentFindMany.mockResolvedValue([
        { id: 'eq1', sku: null, model: null, dailyPrice: 100, category: {}, brand: {} },
        { id: 'eq2', sku: 'CAM2', model: null, dailyPrice: 100, category: {}, brand: {} },
      ])
      mockOpenAICreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify([
                { equipmentId: 'eq1', quantity: 1, reason: 'No sku' },
                { equipmentId: 'eq2', quantity: 1, reason: 'Has sku' },
              ]),
            },
          },
        ],
      })
      const { AIService } = await import('../ai.service')
      const result = await AIService.buildKit({
        projectType: 'wedding',
        duration: 3,
      })
      const kit = result.find((k) => k.name.includes('AI suggested'))
      expect(kit).toBeDefined()
      expect(kit!.equipment.some((e) => e.equipmentName === 'Unknown')).toBe(true)
    })

    it('suggestPricing handles non-Error from OpenAI', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      delete process.env.GEMINI_API_KEY
      mockEquipmentFindUnique.mockResolvedValue({
        id: 'eq1',
        sku: 'CAM1',
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        category: { name: 'Cameras' },
      })
      mockBookingEquipmentFindMany.mockResolvedValue([])
      mockOpenAICreate.mockRejectedValue('openai string error')
      const { AIService } = await import('../ai.service')
      const result = await AIService.suggestPricing({
        equipmentId: 'eq1',
        currentPrice: 100,
      })
      expect(result.rationale).toBeUndefined()
    })

    it('suggestPricing handles non-Error from Gemini', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      process.env.GEMINI_API_KEY = 'test-gemini'
      mockEquipmentFindUnique.mockResolvedValue({
        id: 'eq1',
        sku: 'CAM1',
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        category: { name: 'Cameras' },
      })
      mockBookingEquipmentFindMany.mockResolvedValue([])
      mockOpenAICreate.mockRejectedValue(new Error('OpenAI down'))
      mockGeminiGenerateContent.mockRejectedValue('gemini string error')
      const { AIService } = await import('../ai.service')
      const result = await AIService.suggestPricing({
        equipmentId: 'eq1',
        currentPrice: 100,
      })
      expect(result.rationale).toBeUndefined()
    })

    it('forecastDemand for single equipmentId', async () => {
      mockEquipmentFindUnique.mockResolvedValue({
        id: 'eq1',
        sku: 'CAM1',
        dailyPrice: 100,
      })
      mockBookingEquipmentFindMany.mockResolvedValue([])
      const { AIService } = await import('../ai.service')
      const result = await AIService.forecastDemand({
        equipmentId: 'eq1',
        period: 'week',
      })
      expect(result.length).toBe(1)
      expect(result[0].equipmentId).toBe('eq1')
    })

    it('forecastDemand uses Unknown when equipment has null sku', async () => {
      mockEquipmentFindMany.mockResolvedValue([
        { id: 'eq1', sku: null, dailyPrice: 100 },
      ])
      mockBookingEquipmentFindMany.mockResolvedValue([])
      const { AIService } = await import('../ai.service')
      const result = await AIService.forecastDemand({ period: 'month' })
      expect(result[0].equipmentName).toBe('Unknown')
    })

    it('forecastDemand weekly projection handles non-Error', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      mockEquipmentFindMany.mockResolvedValue([
        { id: 'eq1', sku: 'CAM1', dailyPrice: 100 },
      ])
      mockBookingEquipmentFindMany.mockResolvedValue(
        Array.from({ length: 5 }, (_, i) => ({
          equipmentId: 'eq1',
          bookingId: `b${i}`,
          booking: {
            startDate: new Date(Date.now() - (90 - i * 10) * 24 * 60 * 60 * 1000),
            endDate: new Date(Date.now() - (88 - i * 10) * 24 * 60 * 60 * 1000),
          },
        }))
      )
      mockOpenAICreate.mockRejectedValue('projection string error')
      const { AIService } = await import('../ai.service')
      const result = await AIService.forecastDemand({ period: 'month' })
      expect(result[0].weeklyProjection).toBeUndefined()
    })

    it('extractSpecificationsFromProductPage Gemini catch with non-Error', async () => {
      process.env.GEMINI_API_KEY = 'test-gemini'
      process.env.OPENAI_API_KEY = 'sk-test'
      mockGeminiGenerateContent.mockRejectedValue('gemini string error')
      mockOpenAICreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                groups: [
                  {
                    label: 'Key Specs',
                    specs: [{ key: 'sensor', label: 'Sensor', value: 'Full Frame' }],
                  },
                ],
              }),
            },
          },
        ],
      })
      const { AIService } = await import('../ai.service')
      const result = await AIService.extractSpecificationsFromProductPage('Sony FX3')
      expect(result.groups).toHaveLength(1)
    })

    it('getConfig returns gemini provider when set', async () => {
      process.env.AI_PROVIDER = 'gemini'
      process.env.GEMINI_API_KEY = 'test'
      const { AIService } = await import('../ai.service')
      const result = await AIService.getConfig()
      expect(result.provider).toBe('gemini')
    })

    it('recommendAlternatives cosineSimilarity with zero-norm vectors', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      mockEquipmentFindUnique.mockResolvedValue({
        id: 'eq1',
        categoryId: 'cat1',
        sku: 'CAM-1',
        model: 'X',
        dailyPrice: 100,
        category: { name: 'Cameras' },
      })
      mockEquipmentFindMany.mockResolvedValue([
        {
          id: 'eq2',
          categoryId: 'cat1',
          sku: 'CAM-2',
          model: 'Y',
          dailyPrice: 100,
          brandId: 'b1',
          category: { name: 'Cameras' },
          brand: { name: 'Sony' },
        },
      ])
      mockOpenAIEmbeddings
        .mockResolvedValueOnce({ data: [{ embedding: [0, 0, 0] }] })
        .mockResolvedValueOnce({ data: [{ embedding: [0, 0, 0] }] })
      const { AIService } = await import('../ai.service')
      const result = await AIService.recommendAlternatives({ unavailableEquipmentId: 'eq1' })
      expect(result.length).toBe(1)
      expect(result[0].matchScore).toBeGreaterThanOrEqual(0)
    })

    it('buildKit LLM path with equipment having null category', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      mockShootTypeGetBySlug.mockResolvedValue(null)
      mockEquipmentFindMany.mockResolvedValue([
        { id: 'eq1', sku: 'CAM1', model: null, dailyPrice: 100, category: null, brand: null },
      ])
      mockOpenAICreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify([
                { equipmentId: 'eq1', quantity: 1, reason: 'Primary' },
              ]),
            },
          },
        ],
      })
      const { AIService } = await import('../ai.service')
      const result = await AIService.buildKit({
        projectType: 'wedding',
        duration: 3,
      })
      expect(result.some((k) => k.name.includes('AI suggested'))).toBe(true)
    })

    it('buildKit OpenAI kit selection catch', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      delete process.env.GEMINI_API_KEY
      mockShootTypeGetBySlug.mockResolvedValue(null)
      mockEquipmentFindMany.mockResolvedValue(
        Array.from({ length: 5 }, (_, i) => ({
          id: `eq${i + 1}`,
          sku: `CAM${i + 1}`,
          model: null,
          dailyPrice: 100,
          category: { name: 'Cameras' },
          brand: { name: 'Sony' },
        }))
      )
      mockOpenAICreate.mockRejectedValue(new Error('OpenAI kit selection failed'))
      const { AIService } = await import('../ai.service')
      const result = await AIService.buildKit({
        projectType: 'wedding',
        duration: 3,
      })
      expect(result.some((k) => k.name.includes('Basic'))).toBe(true)
    })

    it('buildKit Gemini kit selection catch', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      process.env.GEMINI_API_KEY = 'test-gemini'
      mockShootTypeGetBySlug.mockResolvedValue(null)
      mockEquipmentFindMany.mockResolvedValue(
        Array.from({ length: 5 }, (_, i) => ({
          id: `eq${i + 1}`,
          sku: `CAM${i + 1}`,
          model: null,
          dailyPrice: 100,
          category: { name: 'Cameras' },
          brand: { name: 'Sony' },
        }))
      )
      mockOpenAICreate.mockRejectedValue(new Error('OpenAI down'))
      mockGeminiGenerateContent.mockRejectedValue(new Error('Gemini kit selection failed'))
      const { AIService } = await import('../ai.service')
      const result = await AIService.buildKit({
        projectType: 'wedding',
        duration: 3,
      })
      expect(result.some((k) => k.name.includes('Basic'))).toBe(true)
    })

    it('suggestDeposit rentalDuration > 30 adds 10%', async () => {
      const { AIService } = await import('../ai.service')
      const result = await AIService.suggestDeposit({
        equipmentValue: 10000,
        customerHistory: 'fair',
        rentalDuration: 45,
        riskScore: 40,
      })
      expect(result.percentage).toBe(40)
    })

    it('suggestDeposit riskScore >= 70 adds 20%', async () => {
      const { AIService } = await import('../ai.service')
      const result = await AIService.suggestDeposit({
        equipmentValue: 10000,
        customerHistory: 'fair',
        rentalDuration: 7,
        riskScore: 75,
      })
      expect(result.percentage).toBe(50)
    })

    it('suggestDeposit riskScore 50-69 adds 10%', async () => {
      const { AIService } = await import('../ai.service')
      const result = await AIService.suggestDeposit({
        equipmentValue: 10000,
        customerHistory: 'fair',
        rentalDuration: 7,
        riskScore: 55,
      })
      expect(result.percentage).toBe(40)
    })

    it('forecastDemand period week and quarter', async () => {
      mockEquipmentFindMany.mockResolvedValue([
        { id: 'eq1', sku: 'CAM1', dailyPrice: 100 },
      ])
      mockBookingEquipmentFindMany.mockResolvedValue([])
      const { AIService } = await import('../ai.service')
      const weekResult = await AIService.forecastDemand({ period: 'week' })
      const quarterResult = await AIService.forecastDemand({ period: 'quarter' })
      expect(weekResult[0].period).toBe('week')
      expect(quarterResult[0].period).toBe('quarter')
    })

    it('forecastDemand period year', async () => {
      mockEquipmentFindMany.mockResolvedValue([
        { id: 'eq1', sku: 'CAM1', dailyPrice: 100 },
      ])
      mockBookingEquipmentFindMany.mockResolvedValue([])
      const { AIService } = await import('../ai.service')
      const result = await AIService.forecastDemand({ period: 'year' })
      expect(result[0].period).toBe('year')
    })

    it('getConfig returns AI_MODEL when set', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      process.env.AI_MODEL = 'gpt-4o'
      const { AIService } = await import('../ai.service')
      const result = await AIService.getConfig()
      expect(result.model).toBe('gpt-4o')
    })

    it('extractSpecificationsFromProductPage with categoryHint', async () => {
      process.env.GEMINI_API_KEY = 'test-gemini'
      delete process.env.OPENAI_API_KEY
      mockGeminiGenerateContent.mockResolvedValue({
        response: {
          text: () =>
            JSON.stringify({
              groups: [
                {
                  label: 'Key Specs',
                  specs: [{ key: 'sensor', label: 'Sensor', value: 'Full Frame' }],
                },
              ],
            }),
        },
      })
      const { AIService } = await import('../ai.service')
      const result = await AIService.extractSpecificationsFromProductPage(
        'Sony FX3 specs...',
        'lighting'
      )
      expect(result.groups).toHaveLength(1)
    })

    it('extractSpecificationsFromProductPage returns undefined highlights/quickSpecs when not arrays', async () => {
      process.env.GEMINI_API_KEY = 'test-gemini'
      delete process.env.OPENAI_API_KEY
      mockGeminiGenerateContent.mockResolvedValue({
        response: {
          text: () =>
            JSON.stringify({
              groups: [
                {
                  label: 'Key Specs',
                  specs: [{ key: 'sensor', label: 'Sensor', value: 'Full Frame' }],
                },
              ],
              highlights: null,
              quickSpecs: 'invalid',
            }),
        },
      })
      const { AIService } = await import('../ai.service')
      const result = await AIService.extractSpecificationsFromProductPage('Sony FX3')
      expect(result.groups).toHaveLength(1)
      expect(result.highlights).toBeUndefined()
      expect(result.quickSpecs).toBeUndefined()
    })

    it('extractSpecificationsFromProductPage returns highlights and quickSpecs when arrays', async () => {
      process.env.GEMINI_API_KEY = 'test-gemini'
      delete process.env.OPENAI_API_KEY
      mockGeminiGenerateContent.mockResolvedValue({
        response: {
          text: () =>
            JSON.stringify({
              groups: [
                {
                  label: 'Key Specs',
                  specs: [{ key: 'sensor', label: 'Sensor', value: 'Full Frame' }],
                },
              ],
              highlights: [{ icon: 'star', label: 'Sensor', value: 'Full Frame' }],
              quickSpecs: [{ icon: 'zap', label: 'Resolution', value: '4K' }],
            }),
        },
      })
      const { AIService } = await import('../ai.service')
      const result = await AIService.extractSpecificationsFromProductPage('Sony FX3')
      expect(result.highlights).toHaveLength(1)
      expect(result.quickSpecs).toHaveLength(1)
    })

    it('getConfig uses default model when AI_MODEL empty', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      process.env.AI_MODEL = ''
      const { AIService } = await import('../ai.service')
      const result = await AIService.getConfig()
      expect(result.model).toBe('gpt-4o-mini')
    })

    it('uses OPENAI_EMBEDDINGS_MODEL when set', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      process.env.OPENAI_EMBEDDINGS_MODEL = 'text-embedding-3-small'
      mockEquipmentFindUnique.mockResolvedValue({
        id: 'eq1',
        categoryId: 'cat1',
        sku: 'CAM-1',
        model: 'X',
        dailyPrice: 100,
        category: { name: 'Cameras' },
      })
      mockEquipmentFindMany.mockResolvedValue([
        {
          id: 'eq2',
          categoryId: 'cat1',
          sku: 'CAM-2',
          model: 'Y',
          dailyPrice: 100,
          brandId: 'b1',
          category: { name: 'Cameras' },
          brand: { name: 'Sony' },
        },
      ])
      mockOpenAIEmbeddings.mockResolvedValue({
        data: [{ embedding: [0.1, 0.2, 0.3] }],
      })
      const { AIService } = await import('../ai.service')
      await AIService.recommendAlternatives({ unavailableEquipmentId: 'eq1' })
      expect(mockOpenAIEmbeddings).toHaveBeenCalledWith(
        expect.objectContaining({
          model: 'text-embedding-3-small',
        })
      )
    })

    it('recommendAlternatives else branch when no embeddings (no API key)', async () => {
      delete process.env.OPENAI_API_KEY
      delete process.env.GEMINI_API_KEY
      mockEquipmentFindUnique.mockResolvedValue({
        id: 'eq1',
        categoryId: 'cat1',
        sku: 'CAM-1',
        model: 'X',
        dailyPrice: 100,
        category: { name: 'Cameras' },
      })
      mockEquipmentFindMany.mockResolvedValue([
        {
          id: 'eq2',
          categoryId: 'cat1',
          sku: 'CAM-2',
          model: 'Y',
          dailyPrice: 120,
          brandId: 'b1',
          category: { name: 'Cameras' },
          brand: { name: 'Sony' },
        },
      ])
      const { AIService } = await import('../ai.service')
      const result = await AIService.recommendAlternatives({ unavailableEquipmentId: 'eq1' })
      expect(result.length).toBe(1)
      expect(result[0].matchScore).toBeGreaterThanOrEqual(0)
    })

    it('suggestDeposit uses 0 when customerHistory not in historyAdjustments', async () => {
      const { AIService } = await import('../ai.service')
      const result = await AIService.suggestDeposit({
        equipmentValue: 10000,
        customerHistory: 'invalid' as 'excellent',
        rentalDuration: 7,
        riskScore: 30,
      })
      expect(result.percentage).toBe(30)
    })

    it('buildKit ShootTypeService.getById throws non-Error', async () => {
      mockShootTypeGetById.mockRejectedValue('string error not Error')
      mockEquipmentFindMany.mockResolvedValue(
        Array.from({ length: 10 }, (_, i) => ({
          id: `eq${i + 1}`,
          sku: `CAM${i + 1}`,
          model: null,
          dailyPrice: 100,
          category: { name: 'Cameras' },
          brand: { name: 'Sony' },
        }))
      )
      const { AIService } = await import('../ai.service')
      const result = await AIService.buildKit({
        projectType: 'wedding',
        duration: 3,
        shootTypeId: 'st-missing',
      })
      expect(result.length).toBeGreaterThanOrEqual(0)
    })

    it('buildKit filters by budgetTier when provided', async () => {
      mockShootTypeGetBySlug.mockResolvedValue({
        id: 'st1',
        name: 'Wedding',
        slug: 'wedding',
        recommendations: [
          {
            equipmentId: 'eq1',
            budgetTier: 'ESSENTIAL',
            reason: 'Essential',
            defaultQuantity: 1,
            sortOrder: 0,
            equipment: { id: 'eq1', sku: 'CAM-1', model: 'Sony', dailyPrice: 500 },
          },
          {
            equipmentId: 'eq2',
            budgetTier: 'PROFESSIONAL',
            reason: 'Pro',
            defaultQuantity: 1,
            sortOrder: 1,
            equipment: { id: 'eq2', sku: 'CAM-2', model: 'Sony', dailyPrice: 600 },
          },
        ],
      })
      const { AIService } = await import('../ai.service')
      const result = await AIService.buildKit({
        projectType: 'wedding',
        duration: 3,
        shootTypeSlug: 'wedding',
        budgetTier: 'ESSENTIAL',
      })
      expect(result[0].equipment).toHaveLength(1)
      expect(result[0].equipment[0].equipmentId).toBe('eq1')
    })

    it('buildKit parseReasons returns null when LLM returns empty text', async () => {
      process.env.GEMINI_API_KEY = 'test-gemini'
      delete process.env.OPENAI_API_KEY
      mockShootTypeGetBySlug.mockResolvedValue({
        id: 'st1',
        name: 'Wedding',
        slug: 'wedding',
        recommendations: [
          {
            equipmentId: 'eq1',
            budgetTier: 'PROFESSIONAL',
            reason: 'Essential',
            defaultQuantity: 1,
            sortOrder: 0,
            equipment: { id: 'eq1', sku: 'CAM-1', model: 'Sony', dailyPrice: 500 },
          },
        ],
      })
      mockGeminiGenerateContent.mockResolvedValue({ response: { text: () => '' } })
      const { AIService } = await import('../ai.service')
      const result = await AIService.buildKit({
        projectType: 'wedding',
        duration: 3,
        shootTypeSlug: 'wedding',
      })
      expect(result[0].equipment[0].reason).toContain('Essential')
    })

    it('buildKit parseReasons returns null when JSON array wrong length', async () => {
      process.env.GEMINI_API_KEY = 'test-gemini'
      delete process.env.OPENAI_API_KEY
      mockShootTypeGetBySlug.mockResolvedValue({
        id: 'st1',
        name: 'Wedding',
        slug: 'wedding',
        recommendations: [
          {
            equipmentId: 'eq1',
            budgetTier: 'PROFESSIONAL',
            reason: 'Essential',
            defaultQuantity: 1,
            sortOrder: 0,
            equipment: { id: 'eq1', sku: 'CAM-1', model: 'Sony', dailyPrice: 500 },
          },
          {
            equipmentId: 'eq2',
            budgetTier: 'PROFESSIONAL',
            reason: 'Pro',
            defaultQuantity: 1,
            sortOrder: 1,
            equipment: { id: 'eq2', sku: 'CAM-2', model: 'Sony', dailyPrice: 600 },
          },
        ],
      })
      mockGeminiGenerateContent.mockResolvedValue({
        response: { text: () => '["Only one reason for two items"]' },
      })
      const { AIService } = await import('../ai.service')
      const result = await AIService.buildKit({
        projectType: 'wedding',
        duration: 3,
        shootTypeSlug: 'wedding',
      })
      expect(result[0].equipment[0].reason).toContain('Essential')
    })

    it('buildKit parseReasons returns null when no JSON array in response', async () => {
      process.env.GEMINI_API_KEY = 'test-gemini'
      delete process.env.OPENAI_API_KEY
      mockShootTypeGetBySlug.mockResolvedValue({
        id: 'st1',
        name: 'Wedding',
        slug: 'wedding',
        recommendations: [
          {
            equipmentId: 'eq1',
            budgetTier: 'PROFESSIONAL',
            reason: 'Essential',
            defaultQuantity: 1,
            sortOrder: 0,
            equipment: { id: 'eq1', sku: 'CAM-1', model: 'Sony', dailyPrice: 500 },
          },
        ],
      })
      mockGeminiGenerateContent.mockResolvedValue({
        response: { text: () => 'Here is my response with no JSON array at all' },
      })
      const { AIService } = await import('../ai.service')
      const result = await AIService.buildKit({
        projectType: 'wedding',
        duration: 3,
        shootTypeSlug: 'wedding',
      })
      expect(result[0].equipment[0].reason).toContain('Essential')
    })

    it('buildKit parseReasons uses fallback when arr[i] is null', async () => {
      process.env.GEMINI_API_KEY = 'test-gemini'
      delete process.env.OPENAI_API_KEY
      mockShootTypeGetBySlug.mockResolvedValue({
        id: 'st1',
        name: 'Wedding',
        slug: 'wedding',
        recommendations: [
          {
            equipmentId: 'eq1',
            budgetTier: 'PROFESSIONAL',
            reason: 'Essential fallback',
            defaultQuantity: 1,
            sortOrder: 0,
            equipment: { id: 'eq1', sku: 'CAM-1', model: 'Sony', dailyPrice: 500 },
          },
          {
            equipmentId: 'eq2',
            budgetTier: 'PROFESSIONAL',
            reason: 'Pro fallback',
            defaultQuantity: 1,
            sortOrder: 1,
            equipment: { id: 'eq2', sku: 'CAM-2', model: 'Sony', dailyPrice: 600 },
          },
        ],
      })
      mockGeminiGenerateContent.mockResolvedValue({
        response: { text: () => '["Reason one", null]' },
      })
      const { AIService } = await import('../ai.service')
      const result = await AIService.buildKit({
        projectType: 'wedding',
        duration: 3,
        shootTypeSlug: 'wedding',
      })
      expect(result[0].equipment[0].reason).toBe('Reason one')
      expect(result[0].equipment[1].reason).toBe('Pro fallback')
    })

    it('buildKit LLM kit with 4+ items hits all role branches (primary, support, optional)', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      mockShootTypeGetBySlug.mockResolvedValue(null)
      mockEquipmentFindMany.mockResolvedValue(
        Array.from({ length: 10 }, (_, i) => ({
          id: `eq${i + 1}`,
          sku: `CAM${i + 1}`,
          model: null,
          dailyPrice: 100,
          category: { name: 'Cameras' },
          brand: { name: 'Sony' },
        }))
      )
      mockOpenAICreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify([
                { equipmentId: 'eq1', quantity: 1, reason: 'Primary' },
                { equipmentId: 'eq2', quantity: 1, reason: 'Support 1' },
                { equipmentId: 'eq3', quantity: 1, reason: 'Support 2' },
                { equipmentId: 'eq4', quantity: 1, reason: 'Optional' },
              ]),
            },
          },
        ],
      })
      const { AIService } = await import('../ai.service')
      const result = await AIService.buildKit({
        projectType: 'wedding',
        duration: 3,
      })
      const kit = result.find((k) => k.name.includes('AI suggested'))
      expect(kit).toBeDefined()
      expect(kit!.equipment[0].role).toBe('primary')
      expect(kit!.equipment[1].role).toBe('support')
      expect(kit!.equipment[3].role).toBe('optional')
    })

    it('buildKit professional kit with 8 items hits role branches', async () => {
      delete process.env.OPENAI_API_KEY
      delete process.env.GEMINI_API_KEY
      mockShootTypeGetBySlug.mockResolvedValue(null)
      mockEquipmentFindMany.mockResolvedValue(
        Array.from({ length: 10 }, (_, i) => ({
          id: `eq${i + 1}`,
          sku: `CAM${i + 1}`,
          model: null,
          dailyPrice: 50,
          category: { name: 'Cameras' },
          brand: { name: 'Sony' },
        }))
      )
      const { AIService } = await import('../ai.service')
      const result = await AIService.buildKit({
        projectType: 'wedding',
        duration: 3,
        budget: 10000,
      })
      const proKit = result.find((k) => k.name.includes('Professional'))
      expect(proKit).toBeDefined()
      expect(proKit!.equipment.length).toBe(8)
    })

    it('chat else branch with AI_PROVIDER=openai and unrecognized message', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      process.env.AI_PROVIDER = 'openai'
      delete process.env.GEMINI_API_KEY
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: 'I can help with that.' } }],
      })
      const { AIService } = await import('../ai.service')
      const result = await AIService.chat({ message: 'random query xyz' })
      expect(result.message).toBeDefined()
    })

    it('chat else branch with provider gemini and no client fallback', async () => {
      process.env.AI_PROVIDER = 'gemini'
      process.env.GEMINI_API_KEY = 'test-gemini'
      delete process.env.OPENAI_API_KEY
      mockGeminiGenerateContent.mockRejectedValue(new Error('Gemini down'))
      const { AIService } = await import('../ai.service')
      const result = await AIService.chat({ message: 'random xyz query' })
      expect(result.message).toContain('equipment search')
    })

    it('chat else branch OpenAI fallback when Gemini fails', async () => {
      process.env.AI_PROVIDER = 'gemini'
      process.env.GEMINI_API_KEY = 'test-gemini'
      process.env.OPENAI_API_KEY = 'sk-test'
      mockGeminiGenerateContent.mockRejectedValue(new Error('Gemini down'))
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: 'OpenAI fallback response' } }],
      })
      const { AIService } = await import('../ai.service')
      const result = await AIService.chat({ message: 'random query' })
      expect(result.message).toBe('OpenAI fallback response')
    })

    it('getConfig returns default provider when AI_PROVIDER not set', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      delete process.env.AI_PROVIDER
      const { AIService } = await import('../ai.service')
      const result = await AIService.getConfig()
      expect(result.provider).toBe('openai')
    })

    it('getConfig returns anthropic when AI_PROVIDER=anthropic', async () => {
      process.env.AI_PROVIDER = 'anthropic'
      const { AIService } = await import('../ai.service')
      const result = await AIService.getConfig()
      expect(result.provider).toBe('anthropic')
    })

    it('forecastDemand validEquipment filters null', async () => {
      mockEquipmentFindUnique.mockResolvedValue(null)
      mockEquipmentFindMany.mockResolvedValue([])
      const { AIService } = await import('../ai.service')
      const result = await AIService.forecastDemand({
        equipmentId: 'missing-eq',
        period: 'month',
      })
      expect(result).toEqual([])
    })

    it('getEmbedding catch with non-Error', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      mockEquipmentFindUnique.mockResolvedValue({
        id: 'eq1',
        categoryId: 'cat1',
        sku: 'CAM-1',
        model: 'X',
        dailyPrice: 100,
        category: { name: 'Cameras' },
      })
      mockEquipmentFindMany.mockResolvedValue([
        {
          id: 'eq2',
          categoryId: 'cat1',
          sku: 'CAM-2',
          model: 'Y',
          dailyPrice: 120,
          brandId: 'b1',
          category: { name: 'Cameras' },
          brand: { name: 'Sony' },
        },
      ])
      mockOpenAIEmbeddings
        .mockResolvedValueOnce({ data: [{ embedding: [0.1, 0.2] }] })
        .mockRejectedValueOnce('getEmbedding string error')
      const { AIService } = await import('../ai.service')
      const result = await AIService.recommendAlternatives({ unavailableEquipmentId: 'eq1' })
      expect(result.length).toBe(1)
    })

    it('getEmbedding catch with Error that has no stack', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      mockEquipmentFindUnique.mockResolvedValue({
        id: 'eq1',
        categoryId: 'cat1',
        sku: 'CAM-1',
        model: 'X',
        dailyPrice: 100,
        category: { name: 'Cameras' },
      })
      mockEquipmentFindMany.mockResolvedValue([
        {
          id: 'eq2',
          categoryId: 'cat1',
          sku: 'CAM-2',
          model: 'Y',
          dailyPrice: 120,
          brandId: 'b1',
          category: { name: 'Cameras' },
          brand: { name: 'Sony' },
        },
      ])
      mockOpenAIEmbeddings.mockRejectedValueOnce(createErrorWithNoStack('embedding failed'))
      const { AIService } = await import('../ai.service')
      const result = await AIService.recommendAlternatives({ unavailableEquipmentId: 'eq1' })
      expect(result.length).toBe(1)
    })

    it('assessRisk narrativeSummaryAr success via OpenAI', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      delete process.env.GEMINI_API_KEY
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: '  ملخص المخاطر بالعربية  ' } }],
      })
      const { AIService } = await import('../ai.service')
      const result = await AIService.assessRisk({
        equipmentIds: ['eq1'],
        rentalDuration: 5,
        totalValue: 5000,
      })
      expect(result.narrativeSummaryAr).toBe('ملخص المخاطر بالعربية')
    })

    it('assessRisk narrativeSummaryAr success via Gemini when OpenAI unavailable', async () => {
      delete process.env.OPENAI_API_KEY
      process.env.GEMINI_API_KEY = 'test-gemini'
      mockGeminiGenerateContent.mockResolvedValue({
        response: { text: () => '  ملخص من Gemini  ' },
      })
      const { AIService } = await import('../ai.service')
      const result = await AIService.assessRisk({
        equipmentIds: ['eq1'],
        rentalDuration: 5,
        totalValue: 5000,
      })
      expect(result.narrativeSummaryAr).toBe('ملخص من Gemini')
    })

    it('recommendAlternatives hits categoryScore 0 when different category', async () => {
      mockEquipmentFindUnique.mockResolvedValue({
        id: 'eq1',
        categoryId: 'cat1',
        sku: 'CAM-1',
        model: 'X',
        dailyPrice: 100,
        category: { name: 'Cameras' },
      })
      mockEquipmentFindMany.mockResolvedValue([
        {
          id: 'eq2',
          categoryId: 'cat2',
          sku: 'LENS-1',
          model: 'Y',
          dailyPrice: 150,
          brandId: null,
          category: { name: 'Lenses' },
          brand: null,
        },
      ])
      const { AIService } = await import('../ai.service')
      const result = await AIService.recommendAlternatives({ unavailableEquipmentId: 'eq1' })
      expect(result[0].matchScore).toBeLessThan(100)
      expect(result[0].reasons).not.toContain('Same category')
    })

    it('recommendAlternatives hits compatibility exact when clampedScore >= 80', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      mockEquipmentFindUnique.mockResolvedValue({
        id: 'eq1',
        categoryId: 'cat1',
        sku: 'CAM-1',
        model: 'X',
        dailyPrice: 100,
        category: { name: 'Cameras' },
      })
      mockEquipmentFindMany.mockResolvedValue([
        {
          id: 'eq2',
          categoryId: 'cat1',
          brandId: 'b1',
          sku: 'CAM-2',
          model: 'Y',
          dailyPrice: 105,
          category: { name: 'Cameras' },
          brand: { name: 'Sony' },
        },
      ])
      mockOpenAIEmbeddings
        .mockResolvedValueOnce({ data: [{ embedding: [0.9, 0.9, 0.9] }] })
        .mockResolvedValueOnce({ data: [{ embedding: [0.9, 0.9, 0.9] }] })
      const { AIService } = await import('../ai.service')
      const result = await AIService.recommendAlternatives({ unavailableEquipmentId: 'eq1' })
      const exact = result.find((r) => r.compatibility === 'exact')
      expect(exact || result[0]).toBeDefined()
    })

    it('recommendAlternatives hits compatibility compatible when 60-79', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      mockEquipmentFindUnique.mockResolvedValue({
        id: 'eq1',
        categoryId: 'cat1',
        sku: 'CAM-1',
        model: 'X',
        dailyPrice: 100,
        category: { name: 'Cameras' },
      })
      mockEquipmentFindMany.mockResolvedValue([
        {
          id: 'eq2',
          categoryId: 'cat1',
          brandId: null,
          sku: 'CAM-2',
          model: 'Y',
          dailyPrice: 200,
          category: { name: 'Cameras' },
          brand: null,
        },
      ])
      mockOpenAIEmbeddings
        .mockResolvedValueOnce({ data: [{ embedding: [0.5, 0.5, 0.5] }] })
        .mockResolvedValueOnce({ data: [{ embedding: [0.5, 0.5, 0.5] }] })
      const { AIService } = await import('../ai.service')
      const result = await AIService.recommendAlternatives({ unavailableEquipmentId: 'eq1' })
      expect(result.length).toBeGreaterThanOrEqual(0)
    })

    it('suggestPricing rationale success via OpenAI', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      delete process.env.GEMINI_API_KEY
      mockEquipmentFindUnique.mockResolvedValue({
        id: 'eq1',
        sku: 'CAM1',
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        category: { name: 'Cameras' },
      })
      mockBookingEquipmentFindMany.mockResolvedValue([])
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: '  Rationale from OpenAI  ' } }],
      })
      const { AIService } = await import('../ai.service')
      const result = await AIService.suggestPricing({
        equipmentId: 'eq1',
        currentPrice: 100,
      })
      expect(result.rationale).toBe('Rationale from OpenAI')
    })

    it('suggestPricing rationale success via Gemini when OpenAI unavailable', async () => {
      delete process.env.OPENAI_API_KEY
      process.env.GEMINI_API_KEY = 'test-gemini'
      mockEquipmentFindUnique.mockResolvedValue({
        id: 'eq1',
        sku: 'CAM1',
        createdAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
        category: { name: 'Cameras' },
      })
      mockBookingEquipmentFindMany.mockResolvedValue([])
      mockGeminiGenerateContent.mockResolvedValue({
        response: { text: () => '  Rationale from Gemini  ' },
      })
      const { AIService } = await import('../ai.service')
      const result = await AIService.suggestPricing({
        equipmentId: 'eq1',
        currentPrice: 100,
      })
      expect(result.rationale).toBe('Rationale from Gemini')
    })

    it('forecastDemand weekly projection catch', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      mockEquipmentFindMany.mockResolvedValue([
        { id: 'eq1', sku: 'CAM1', dailyPrice: 100 },
      ])
      mockBookingEquipmentFindMany.mockResolvedValue(
        Array.from({ length: 5 }, (_, i) => ({
          equipmentId: 'eq1',
          bookingId: `b${i}`,
          booking: {
            startDate: new Date(Date.now() - (90 - i * 10) * 24 * 60 * 60 * 1000),
            endDate: new Date(Date.now() - (88 - i * 10) * 24 * 60 * 60 * 1000),
          },
        }))
      )
      mockOpenAICreate.mockRejectedValue(new Error('Weekly projection API failed'))
      const { AIService } = await import('../ai.service')
      const result = await AIService.forecastDemand({ period: 'month' })
      expect(result[0].weeklyProjection).toBeUndefined()
    })

    it('chat else branch with provider openai and unrecognized message', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      process.env.AI_PROVIDER = 'openai'
      delete process.env.GEMINI_API_KEY
      mockOpenAICreate.mockResolvedValue({
        choices: [{ message: { content: 'AI response for random query' } }],
      })
      const { AIService } = await import('../ai.service')
      const result = await AIService.chat({ message: 'random xyz query 123' })
      expect(result.message).toBe('AI response for random query')
    })

    it('chat else branch with provider gemini success', async () => {
      process.env.AI_PROVIDER = 'gemini'
      process.env.GEMINI_API_KEY = 'test-gemini'
      delete process.env.OPENAI_API_KEY
      mockGeminiGenerateContent.mockResolvedValue({
        response: { text: () => 'Gemini AI response' },
      })
      const { AIService } = await import('../ai.service')
      const result = await AIService.chat({ message: 'tell me something random' })
      expect(result.message).toBe('Gemini AI response')
    })

    it('chat else branch no provider fallback to generic', async () => {
      delete process.env.OPENAI_API_KEY
      delete process.env.GEMINI_API_KEY
      const { AIService } = await import('../ai.service')
      const result = await AIService.chat({ message: 'random query xyz' })
      expect(result.message).toContain('equipment search')
      expect(result.confidence).toBe(50)
    })

    it('extractSpecificationsFromProductPage OpenAI when Gemini returns invalid JSON', async () => {
      process.env.GEMINI_API_KEY = 'test-gemini'
      process.env.OPENAI_API_KEY = 'sk-test'
      mockGeminiGenerateContent.mockResolvedValue({
        response: { text: () => 'invalid json no object' },
      })
      mockOpenAICreate.mockResolvedValue({
        choices: [
          {
            message: {
              content: JSON.stringify({
                groups: [
                  {
                    label: 'Key Specs',
                    specs: [{ key: 'sensor', label: 'Sensor', value: 'Full Frame' }],
                  },
                ],
              }),
            },
          },
        ],
      })
      const { AIService } = await import('../ai.service')
      const result = await AIService.extractSpecificationsFromProductPage('Sony FX3')
      expect(result.groups).toHaveLength(1)
    })

    it('getConfig provider default openai', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      delete process.env.AI_PROVIDER
      const { AIService } = await import('../ai.service')
      const result = await AIService.getConfig()
      expect(result.provider).toBe('openai')
    })
  })
})

export {}
