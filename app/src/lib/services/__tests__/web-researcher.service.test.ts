/**
 * Unit tests for web-researcher.service
 * PATHS: researchProduct (cache hit, cache miss + deep DB fallback); getArabicSpecName; translateSpecsToArabic; isWebResearchAvailable
 */

const mockRedisGet = jest.fn()
const mockRedisSet = jest.fn()
jest.mock('@/lib/queue/redis.client', () => ({
  getRedisClient: () => ({
    get: mockRedisGet,
    set: mockRedisSet,
  }),
}))

const mockLookupDeepSpecs = jest.fn()
jest.mock('../specs-db.service', () => ({
  lookupDeepSpecs: (...args: unknown[]) => mockLookupDeepSpecs(...args),
}))

jest.mock('node-fetch', () => ({ __esModule: true, default: jest.fn() }), { virtual: true })

describe('web-researcher.service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRedisGet.mockResolvedValue(null)
    mockRedisSet.mockResolvedValue(undefined)
    delete process.env.GOOGLE_SEARCH_API_KEY
    delete process.env.GOOGLE_SEARCH_CX
    delete process.env.SCRAPING_API_KEY
  })

  describe('getArabicSpecName', () => {
    it('returns Arabic translation for known spec', async () => {
      const { getArabicSpecName } = await import('../web-researcher.service')
      expect(getArabicSpecName('Resolution')).toBe('الدقة')
      expect(getArabicSpecName('Sensor')).toBe('المستشعر')
    })

    it('returns English name when no translation', async () => {
      const { getArabicSpecName } = await import('../web-researcher.service')
      expect(getArabicSpecName('UnknownSpec')).toBe('UnknownSpec')
    })
  })

  describe('translateSpecsToArabic', () => {
    it('translates spec keys to Arabic', async () => {
      const { translateSpecsToArabic } = await import('../web-researcher.service')
      const result = translateSpecsToArabic({ Resolution: '4K', Sensor: '12MP' })
      expect(result).toHaveProperty('الدقة', '4K')
      expect(result).toHaveProperty('المستشعر', '12MP')
    })
  })

  describe('isWebResearchAvailable', () => {
    it('returns false when no API keys', async () => {
      const { isWebResearchAvailable } = await import('../web-researcher.service')
      expect(isWebResearchAvailable()).toBe(false)
    })

    it('returns true when GOOGLE_SEARCH_API_KEY and CX set', async () => {
      process.env.GOOGLE_SEARCH_API_KEY = 'key'
      process.env.GOOGLE_SEARCH_CX = 'cx'
      const { isWebResearchAvailable } = await import('../web-researcher.service')
      expect(isWebResearchAvailable()).toBe(true)
    })

    it('returns true when SCRAPING_API_KEY set', async () => {
      process.env.SCRAPING_API_KEY = 'sk'
      const { isWebResearchAvailable } = await import('../web-researcher.service')
      expect(isWebResearchAvailable()).toBe(true)
    })
  })

  describe('researchProduct', () => {
    it('returns cached result on cache hit', async () => {
      const cached = {
        specs: { Sensor: '12MP' },
        boxContents: [],
        marketingHighlights: [],
        sources: [],
        confidence: 90,
        conflicts: [],
      }
      mockRedisGet.mockResolvedValue(JSON.stringify(cached))
      const { researchProduct } = await import('../web-researcher.service')
      const result = await researchProduct('Sony FX6', 'Sony')
      expect(result).toEqual(cached)
      expect(mockLookupDeepSpecs).not.toHaveBeenCalled()
    })

    it('falls back to deep specs when no scrape results and deep match exists', async () => {
      process.env.RESEARCH_RATE_LIMIT_DELAY = '0'
      jest.resetModules()
      mockRedisGet.mockResolvedValue(null)
      mockLookupDeepSpecs.mockReturnValue({
        specs: { Sensor: '10.2MP', Resolution: '4K' },
        boxContents: ['Body', 'Lens'],
        marketingHighlights: 'CineAlta',
        confidence: 92,
      })
      const { researchProduct } = await import('../web-researcher.service')
      const result = await researchProduct('Sony FX6', 'Sony')
      expect(result.specs).toMatchObject({ Sensor: '10.2MP', Resolution: '4K' })
      expect(result.boxContents).toEqual(['Body', 'Lens'])
      expect(result.confidence).toBe(92)
      expect(result.sources).toHaveLength(1)
      expect(result.sources[0].provider).toBe('ai_inference')
    }, 15000)
  })
})

export {}
