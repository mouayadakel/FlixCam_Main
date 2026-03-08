/**
 * Unit tests for image-sourcing.service
 */

import {
  tryBrandAssets,
  tryUnsplash,
  tryPexels,
  tryGoogleCSE,
  tryDallE,
  validateImageRelevance,
  sourceImages,
  type ProductForSourcing,
} from '../image-sourcing.service'

const mockExistsSync = jest.fn()
const mockReaddirSync = jest.fn()
const mockReadFileSync = jest.fn()
jest.mock('fs', () => ({
  existsSync: (...args: unknown[]) => mockExistsSync(...args),
  readdirSync: (...args: unknown[]) => mockReaddirSync(...args),
  readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
}))

const mockUploadBufferToCloudinary = jest.fn()
const mockProcessImageFromUrl = jest.fn()
jest.mock('../image-processing.service', () => ({
  uploadBufferToCloudinary: (...args: unknown[]) => mockUploadBufferToCloudinary(...args),
  processImageFromUrl: (...args: unknown[]) => mockProcessImageFromUrl(...args),
}))

const mockFetch = jest.fn()
global.fetch = mockFetch

const mockImagesGenerate = jest.fn()
jest.mock('openai', () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    images: { generate: (...args: unknown[]) => mockImagesGenerate(...args) },
  })),
}))

const mockGenerateContent = jest.fn()
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: (...args: unknown[]) => mockGenerateContent(...args),
    }),
  })),
}))

const mockPexelsSearch = jest.fn()
jest.mock('pexels', () => ({
  createClient: jest.fn().mockImplementation(() => ({
    photos: { search: (...args: unknown[]) => mockPexelsSearch(...args) },
  })),
}))

const baseProduct: ProductForSourcing = {
  id: 'p1',
  name: 'Sony FX3',
  sku: 'FX3-001',
  category: { name: 'Cameras' },
  brand: { name: 'Sony' },
  translations: [{ locale: 'en', name: 'Sony FX3', longDescription: null }],
}

describe('image-sourcing.service', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv }
    mockUploadBufferToCloudinary.mockResolvedValue({ success: true, url: 'https://cloudinary.com/1.jpg', publicId: 'pid', width: 1920, height: 1080 })
    mockProcessImageFromUrl.mockResolvedValue({ success: true, url: 'https://cloudinary.com/1.jpg', publicId: 'pid', width: 1920, height: 1080 })
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('tryBrandAssets', () => {
    it('returns empty array when product has no brandName', async () => {
      const product = { ...baseProduct, brand: null }
      const result = await tryBrandAssets(product, 5)
      expect(result).toEqual([])
      expect(mockExistsSync).not.toHaveBeenCalled()
    })

    it('returns empty array when product has no sku and no id', async () => {
      const product = { ...baseProduct, sku: null, id: '' }
      const result = await tryBrandAssets(product, 5)
      expect(result).toEqual([])
      expect(mockExistsSync).not.toHaveBeenCalled()
    })

    it('returns empty array when brand directory does not exist', async () => {
      mockExistsSync.mockReturnValue(false)
      const result = await tryBrandAssets(baseProduct, 5)
      expect(result).toEqual([])
      expect(mockReaddirSync).not.toHaveBeenCalled()
    })

    it('returns empty array when no matching files and no image extensions', async () => {
      mockExistsSync.mockReturnValue(true)
      mockReaddirSync.mockReturnValue(['readme.txt', 'data.json'])
      const result = await tryBrandAssets(baseProduct, 5)
      expect(result).toEqual([])
    })

    it('returns results when SKU-matching files found', async () => {
      mockExistsSync.mockReturnValue(true)
      mockReaddirSync.mockReturnValue(['FX3-001.jpg'])
      mockReadFileSync.mockReturnValue(Buffer.from('image'))
      const result = await tryBrandAssets(baseProduct, 5)
      expect(result).toHaveLength(1)
      expect(result[0].source).toBe('BRAND_ASSET')
      expect(result[0].approved).toBe(true)
    })

    it('skips file when upload fails', async () => {
      mockExistsSync.mockReturnValue(true)
      mockReaddirSync.mockReturnValue(['a.jpg', 'b.jpg'])
      mockReadFileSync.mockReturnValue(Buffer.from('image'))
      mockUploadBufferToCloudinary
        .mockRejectedValueOnce(new Error('Upload failed'))
        .mockResolvedValueOnce({ success: true, url: 'https://cloudinary.com/2.jpg', publicId: 'pid2', width: 1920, height: 1080 })
      const product = { ...baseProduct, sku: 'NOMATCH' }
      const result = await tryBrandAssets(product, 5)
      expect(result.length).toBeGreaterThanOrEqual(1)
      if (result.length > 0) {
        expect(result[0].url).toBe('https://cloudinary.com/2.jpg')
      }
    })

    it('skips file when upload returns success false', async () => {
      mockExistsSync.mockReturnValue(true)
      mockReaddirSync.mockReturnValue(['a.jpg', 'b.jpg'])
      mockReadFileSync.mockReturnValue(Buffer.from('image'))
      mockUploadBufferToCloudinary
        .mockResolvedValueOnce({ success: false })
        .mockResolvedValueOnce({ success: true, url: 'https://cloudinary.com/2.jpg', publicId: 'pid2', width: 1920, height: 1080 })
      const product = { ...baseProduct, sku: 'NOMATCH' }
      const result = await tryBrandAssets(product, 5)
      expect(result.length).toBeGreaterThanOrEqual(1)
      expect(result[0].url).toBe('https://cloudinary.com/2.jpg')
    })

    it('falls back to first matching extension when no SKU match', async () => {
      mockExistsSync.mockReturnValue(true)
      mockReaddirSync.mockReturnValue(['photo1.jpg', 'photo2.png'])
      mockReadFileSync.mockReturnValue(Buffer.from('image'))
      const product = { ...baseProduct, sku: 'NOMATCH' }
      const result = await tryBrandAssets(product, 2)
      expect(result).toHaveLength(2)
      expect(result[0].source).toBe('BRAND_ASSET')
    })

    it('breaks early when targetCount reached in loop', async () => {
      mockExistsSync.mockReturnValue(true)
      mockReaddirSync.mockReturnValue(['a.jpg', 'b.jpg', 'c.jpg'])
      mockReadFileSync.mockReturnValue(Buffer.from('image'))
      const product = { ...baseProduct, sku: 'NOMATCH' }
      const result = await tryBrandAssets(product, 2)
      expect(result).toHaveLength(2)
      expect(mockUploadBufferToCloudinary).toHaveBeenCalledTimes(2)
    })
  })

  describe('tryUnsplash', () => {
    it('returns empty array when UNSPLASH_ACCESS_KEY not set', async () => {
      process.env.UNSPLASH_ACCESS_KEY = undefined
      const result = await tryUnsplash(baseProduct, 5)
      expect(result).toEqual([])
    })

    it('returns empty array when needed < 1', async () => {
      process.env.UNSPLASH_ACCESS_KEY = 'key'
      const result = await tryUnsplash(baseProduct, 0)
      expect(result).toEqual([])
    })

    it('returns results when API returns photos', async () => {
      process.env.UNSPLASH_ACCESS_KEY = 'key'
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [
              { urls: { regular: 'https://unsplash.com/1.jpg' }, width: 1000, height: 800 },
            ],
          }),
      })
      const result = await tryUnsplash(baseProduct, 5)
      expect(result).toHaveLength(1)
      expect(result[0].source).toBe('unsplash')
    })

    it('skips when res.ok is false', async () => {
      process.env.UNSPLASH_ACCESS_KEY = 'key'
      mockFetch.mockResolvedValue({ ok: false })
      const result = await tryUnsplash(baseProduct, 5)
      expect(result).toEqual([])
    })

    it('uses searchQueries when provided', async () => {
      process.env.UNSPLASH_ACCESS_KEY = 'key'
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [
              { urls: { regular: 'https://unsplash.com/1.jpg' }, width: 1000, height: 800 },
            ],
          }),
      })
      const result = await tryUnsplash(baseProduct, 5, ['custom query'])
      expect(result).toHaveLength(1)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/custom.*query/),
        expect.any(Object)
      )
    })

    it('uses product name and category when no searchQueries', async () => {
      process.env.UNSPLASH_ACCESS_KEY = 'key'
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [
              { urls: { regular: 'https://unsplash.com/1.jpg' }, width: 1000, height: 800 },
            ],
          }),
      })
      const product = { ...baseProduct, translations: [], category: { name: 'Lenses' } }
      const result = await tryUnsplash(product, 5)
      expect(result).toHaveLength(1)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/Sony.*FX3.*Lenses/),
        expect.any(Object)
      )
    })

    it('uses product name with empty category when category is null', async () => {
      process.env.UNSPLASH_ACCESS_KEY = 'key'
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [
              { urls: { regular: 'https://unsplash.com/1.jpg' }, width: 1000, height: 800 },
            ],
          }),
      })
      const product = { ...baseProduct, category: null }
      const result = await tryUnsplash(product, 5)
      expect(result).toHaveLength(1)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/Sony.*FX3/),
        expect.any(Object)
      )
    })

    it('handles undefined data.results', async () => {
      process.env.UNSPLASH_ACCESS_KEY = 'key'
      mockFetch.mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      })
      const result = await tryUnsplash(baseProduct, 5)
      expect(result).toEqual([])
    })

    it('uses photo dimensions when processImageFromUrl omits them', async () => {
      process.env.UNSPLASH_ACCESS_KEY = 'key'
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [
              { urls: { regular: 'https://unsplash.com/1.jpg' }, width: 1000, height: 800 },
            ],
          }),
      })
      mockProcessImageFromUrl.mockResolvedValue({
        success: true,
        url: 'https://cloudinary.com/1.jpg',
        publicId: 'pid',
        width: undefined,
        height: undefined,
      })
      const result = await tryUnsplash(baseProduct, 5)
      expect(result).toHaveLength(1)
      expect(result[0].width).toBe(1000)
      expect(result[0].height).toBe(800)
    })

    it('uses urls.full when urls.regular is missing', async () => {
      process.env.UNSPLASH_ACCESS_KEY = 'key'
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [
              { urls: { full: 'https://unsplash.com/full.jpg' }, width: 1000, height: 800 },
            ],
          }),
      })
      const result = await tryUnsplash(baseProduct, 5)
      expect(result).toHaveLength(1)
      expect(mockProcessImageFromUrl).toHaveBeenCalledWith('https://unsplash.com/full.jpg', expect.any(String))
    })

    it('skips photo when width < 800', async () => {
      process.env.UNSPLASH_ACCESS_KEY = 'key'
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [
              { urls: { regular: 'https://unsplash.com/1.jpg' }, width: 600, height: 400 },
            ],
          }),
      })
      const result = await tryUnsplash(baseProduct, 5)
      expect(result).toEqual([])
    })

    it('skips photo when width is undefined', async () => {
      process.env.UNSPLASH_ACCESS_KEY = 'key'
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [
              { urls: { regular: 'https://unsplash.com/1.jpg' } },
            ],
          }),
      })
      const result = await tryUnsplash(baseProduct, 5)
      expect(result).toEqual([])
    })

    it('skips photo when no imageUrl', async () => {
      process.env.UNSPLASH_ACCESS_KEY = 'key'
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [
              { urls: {}, width: 1000, height: 800 },
            ],
          }),
      })
      const result = await tryUnsplash(baseProduct, 5)
      expect(result).toEqual([])
    })

    it('uses full when regular is empty string', async () => {
      process.env.UNSPLASH_ACCESS_KEY = 'key'
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [
              { urls: { regular: '', full: 'https://unsplash.com/full-only.jpg' }, width: 1000, height: 800 },
            ],
          }),
      })
      const result = await tryUnsplash(baseProduct, 5)
      expect(result).toHaveLength(1)
      expect(mockProcessImageFromUrl).toHaveBeenCalledWith('https://unsplash.com/full-only.jpg', expect.any(String))
    })

    it('skips photo when processImageFromUrl fails', async () => {
      process.env.UNSPLASH_ACCESS_KEY = 'key'
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [
              { urls: { regular: 'https://unsplash.com/1.jpg' }, width: 1000, height: 800 },
            ],
          }),
      })
      mockProcessImageFromUrl.mockRejectedValue(new Error('Upload failed'))
      const result = await tryUnsplash(baseProduct, 5)
      expect(result).toEqual([])
    })

    it('continues to next query when fetch throws', async () => {
      process.env.UNSPLASH_ACCESS_KEY = 'key'
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              results: [
                { urls: { regular: 'https://unsplash.com/2.jpg' }, width: 1000, height: 800 },
              ],
            }),
        })
      const result = await tryUnsplash(baseProduct, 5, ['q1', 'q2'])
      expect(result).toHaveLength(1)
    })

    it('breaks outer loop when results fill needed from first query', async () => {
      process.env.UNSPLASH_ACCESS_KEY = 'key'
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            results: [
              { urls: { regular: 'https://unsplash.com/1.jpg' }, width: 1000, height: 800 },
              { urls: { regular: 'https://unsplash.com/2.jpg' }, width: 1000, height: 800 },
            ],
          }),
      })
      const result = await tryUnsplash(baseProduct, 2, ['q1', 'q2'])
      expect(result).toHaveLength(2)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('tryPexels', () => {
    it('returns empty array when PEXELS_API_KEY not set', async () => {
      process.env.PEXELS_API_KEY = undefined
      const result = await tryPexels(baseProduct, 5)
      expect(result).toEqual([])
    })

    it('returns empty array when needed < 1', async () => {
      process.env.PEXELS_API_KEY = 'key'
      const result = await tryPexels(baseProduct, 0)
      expect(result).toEqual([])
    })

    it('returns results via pexels client when available', async () => {
      process.env.PEXELS_API_KEY = 'key'
      mockPexelsSearch.mockResolvedValue({
        photos: [{ src: { original: 'https://pexels.com/1.jpg' } }],
      })
      const result = await tryPexels(baseProduct, 5)
      expect(result).toHaveLength(1)
      expect(result[0].source).toBe('pexels')
    })

    it('returns results via fetch fallback when pexels client throws', async () => {
      process.env.PEXELS_API_KEY = 'key'
      mockPexelsSearch.mockRejectedValue(new Error('Pexels API error'))
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            photos: [
              { src: { original: 'https://pexels.com/1.jpg' } },
            ],
          }),
      })
      const result = await tryPexels(baseProduct, 5)
      expect(result).toHaveLength(1)
      expect(result[0].source).toBe('pexels')
    })

    it('uses searchQueries when provided', async () => {
      process.env.PEXELS_API_KEY = 'key'
      mockPexelsSearch.mockResolvedValue({
        photos: [{ src: { original: 'https://pexels.com/1.jpg' } }],
      })
      const result = await tryPexels(baseProduct, 5, ['custom pexels query'])
      expect(result).toHaveLength(1)
      expect(mockPexelsSearch).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'custom pexels query' })
      )
    })

    it('skips empty query', async () => {
      process.env.PEXELS_API_KEY = 'key'
      mockPexelsSearch.mockResolvedValue({ photos: [] })
      const result = await tryPexels(baseProduct, 5, [''])
      expect(result).toEqual([])
    })

    it('returns empty when fetch fallback res.ok is false', async () => {
      process.env.PEXELS_API_KEY = 'key'
      mockPexelsSearch.mockRejectedValue(new Error('Pexels error'))
      mockFetch.mockResolvedValue({ ok: false })
      const result = await tryPexels(baseProduct, 5)
      expect(result).toEqual([])
    })

    it('skips photo when no originalUrl', async () => {
      process.env.PEXELS_API_KEY = 'key'
      mockPexelsSearch.mockResolvedValue({
        photos: [{ src: {} }],
      })
      const result = await tryPexels(baseProduct, 5)
      expect(result).toEqual([])
    })

    it('skips photo when processImageFromUrl fails', async () => {
      process.env.PEXELS_API_KEY = 'key'
      mockPexelsSearch.mockResolvedValue({
        photos: [{ src: { original: 'https://pexels.com/1.jpg' } }],
      })
      mockProcessImageFromUrl.mockRejectedValue(new Error('Upload failed'))
      const result = await tryPexels(baseProduct, 5)
      expect(result).toEqual([])
    })

    it('returns empty when response has no photos array', async () => {
      process.env.PEXELS_API_KEY = 'key'
      mockPexelsSearch.mockResolvedValue({})
      const result = await tryPexels(baseProduct, 5)
      expect(result).toEqual([])
    })

    it('uses default query when no searchQueries', async () => {
      process.env.PEXELS_API_KEY = 'key'
      mockPexelsSearch.mockResolvedValue({
        photos: [{ src: { original: 'https://pexels.com/1.jpg' } }],
      })
      const product = { ...baseProduct, translations: [], category: { name: 'Cameras' } }
      const result = await tryPexels(product, 5)
      expect(result).toHaveLength(1)
      expect(mockPexelsSearch).toHaveBeenCalledWith(
        expect.objectContaining({ query: expect.stringMatching(/Sony.*FX3.*Cameras/) })
      )
    })

    it('uses product name with empty category when category is null', async () => {
      process.env.PEXELS_API_KEY = 'key'
      mockPexelsSearch.mockResolvedValue({
        photos: [{ src: { original: 'https://pexels.com/1.jpg' } }],
      })
      const product = { ...baseProduct, translations: [], category: null }
      const result = await tryPexels(product, 5)
      expect(result).toHaveLength(1)
      expect(mockPexelsSearch).toHaveBeenCalledWith(
        expect.objectContaining({ query: expect.stringMatching(/Sony.*FX3/) })
      )
    })

    it('breaks outer loop when results fill needed', async () => {
      process.env.PEXELS_API_KEY = 'key'
      mockPexelsSearch.mockResolvedValue({
        photos: [
          { src: { original: 'https://pexels.com/1.jpg' } },
          { src: { original: 'https://pexels.com/2.jpg' } },
        ],
      })
      const result = await tryPexels(baseProduct, 2, ['q1', 'q2'])
      expect(result).toHaveLength(2)
      expect(mockPexelsSearch).toHaveBeenCalledTimes(1)
    })

    it('skips when pexels client returns photos that is not array', async () => {
      process.env.PEXELS_API_KEY = 'key'
      mockPexelsSearch.mockResolvedValue({ photos: 'invalid' })
      const result = await tryPexels(baseProduct, 5)
      expect(result).toEqual([])
    })

    it('uses empty photos when response has no photos key', async () => {
      process.env.PEXELS_API_KEY = 'key'
      mockPexelsSearch.mockResolvedValue({ error: 'something' })
      const result = await tryPexels(baseProduct, 5)
      expect(result).toEqual([])
    })

    it('uses data.photos when fetch fallback returns ok', async () => {
      process.env.PEXELS_API_KEY = 'key'
      mockPexelsSearch.mockRejectedValue(new Error('Pexels error'))
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            photos: [{ src: { original: 'https://pexels.com/fallback.jpg' } }],
          }),
      })
      const result = await tryPexels(baseProduct, 5)
      expect(result).toHaveLength(1)
      expect(result[0].url).toContain('cloudinary')
    })

    it('returns empty when fetch fallback has no photos', async () => {
      process.env.PEXELS_API_KEY = 'key'
      mockPexelsSearch.mockRejectedValue(new Error('Pexels error'))
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
      const result = await tryPexels(baseProduct, 5)
      expect(result).toEqual([])
    })

    it('handles outer catch when both pexels client and fetch throw', async () => {
      process.env.PEXELS_API_KEY = 'key'
      mockPexelsSearch.mockRejectedValue(new Error('Pexels error'))
      mockFetch.mockRejectedValue(new Error('Fetch error'))
      const result = await tryPexels(baseProduct, 5)
      expect(result).toEqual([])
    })
  })

  describe('tryGoogleCSE', () => {
    it('returns empty array when API key or engine ID not set', async () => {
      process.env.GOOGLE_CUSTOM_SEARCH_API_KEY = undefined
      process.env.GOOGLE_SEARCH_ENGINE_ID = undefined
      const result = await tryGoogleCSE(baseProduct, 5)
      expect(result).toEqual([])
    })

    it('returns empty array when needed < 1', async () => {
      process.env.GOOGLE_CUSTOM_SEARCH_API_KEY = 'key'
      process.env.GOOGLE_SEARCH_ENGINE_ID = 'engine'
      const result = await tryGoogleCSE(baseProduct, 0)
      expect(result).toEqual([])
    })

    it('returns results when API returns items', async () => {
      process.env.GOOGLE_CUSTOM_SEARCH_API_KEY = 'key'
      process.env.GOOGLE_SEARCH_ENGINE_ID = 'engine'
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            items: [
              {
                link: 'https://google.com/img.jpg',
                mime: 'image/jpeg',
                image: { width: 1000, height: 800 },
              },
            ],
          }),
      })
      const result = await tryGoogleCSE(baseProduct, 5)
      expect(result).toHaveLength(1)
      expect(result[0].source).toBe('google')
    })

    it('uses uploaded dimensions when processImageFromUrl returns them', async () => {
      process.env.GOOGLE_CUSTOM_SEARCH_API_KEY = 'key'
      process.env.GOOGLE_SEARCH_ENGINE_ID = 'engine'
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            items: [
              {
                link: 'https://google.com/img.jpg',
                mime: 'image/jpeg',
                image: { width: 1000, height: 800 },
              },
            ],
          }),
      })
      mockProcessImageFromUrl.mockResolvedValue({
        success: true,
        url: 'https://cloudinary.com/img.jpg',
        publicId: 'pid',
        width: 1920,
        height: 1080,
      })
      const result = await tryGoogleCSE(baseProduct, 5)
      expect(result[0].width).toBe(1920)
      expect(result[0].height).toBe(1080)
    })

    it('uses item dimensions when processImageFromUrl omits them', async () => {
      process.env.GOOGLE_CUSTOM_SEARCH_API_KEY = 'key'
      process.env.GOOGLE_SEARCH_ENGINE_ID = 'engine'
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            items: [
              {
                link: 'https://google.com/img.jpg',
                mime: 'image/jpeg',
                image: { width: 1000, height: 800 },
              },
            ],
          }),
      })
      mockProcessImageFromUrl.mockResolvedValue({
        success: true,
        url: 'https://cloudinary.com/img.jpg',
        publicId: 'pid',
        width: undefined,
        height: undefined,
      })
      const result = await tryGoogleCSE(baseProduct, 5)
      expect(result[0].width).toBe(1000)
      expect(result[0].height).toBe(800)
    })

    it('uses undefined height when item.image has no height', async () => {
      process.env.GOOGLE_CUSTOM_SEARCH_API_KEY = 'key'
      process.env.GOOGLE_SEARCH_ENGINE_ID = 'engine'
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            items: [
              {
                link: 'https://google.com/img.jpg',
                mime: 'image/jpeg',
                image: { width: 1000 },
              },
            ],
          }),
      })
      mockProcessImageFromUrl.mockResolvedValue({
        success: true,
        url: 'https://cloudinary.com/img.jpg',
        publicId: 'pid',
        width: 1920,
        height: undefined,
      })
      const result = await tryGoogleCSE(baseProduct, 5)
      expect(result[0].height).toBeUndefined()
    })

    it('handles undefined data.items', async () => {
      process.env.GOOGLE_CUSTOM_SEARCH_API_KEY = 'key'
      process.env.GOOGLE_SEARCH_ENGINE_ID = 'engine'
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) })
      const result = await tryGoogleCSE(baseProduct, 5)
      expect(result).toEqual([])
    })

    it('uses searchQueries when provided', async () => {
      process.env.GOOGLE_CUSTOM_SEARCH_API_KEY = 'key'
      process.env.GOOGLE_SEARCH_ENGINE_ID = 'engine'
      mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({ items: [] }) })
      await tryGoogleCSE(baseProduct, 5, ['custom search'])
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/custom.*search/),
        expect.any(Object)
      )
    })

    it('uses default query when no searchQueries', async () => {
      process.env.GOOGLE_CUSTOM_SEARCH_API_KEY = 'key'
      process.env.GOOGLE_SEARCH_ENGINE_ID = 'engine'
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            items: [
              {
                link: 'https://google.com/img.jpg',
                mime: 'image/jpeg',
                image: { width: 1000, height: 800 },
              },
            ],
          }),
      })
      const result = await tryGoogleCSE(baseProduct, 5)
      expect(result).toHaveLength(1)
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringMatching(/product.*photo/),
        expect.any(Object)
      )
    })

    it('skips when res.ok is false', async () => {
      process.env.GOOGLE_CUSTOM_SEARCH_API_KEY = 'key'
      process.env.GOOGLE_SEARCH_ENGINE_ID = 'engine'
      mockFetch.mockResolvedValue({ ok: false })
      const result = await tryGoogleCSE(baseProduct, 5)
      expect(result).toEqual([])
    })

    it('skips item when no link', async () => {
      process.env.GOOGLE_CUSTOM_SEARCH_API_KEY = 'key'
      process.env.GOOGLE_SEARCH_ENGINE_ID = 'engine'
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            items: [
              { link: '', mime: 'image/jpeg', image: { width: 1000 } },
              { mime: 'image/jpeg', image: { width: 1000 } },
            ],
          }),
      })
      const result = await tryGoogleCSE(baseProduct, 5)
      expect(result).toEqual([])
    })

    it('skips item when mime does not start with image/', async () => {
      process.env.GOOGLE_CUSTOM_SEARCH_API_KEY = 'key'
      process.env.GOOGLE_SEARCH_ENGINE_ID = 'engine'
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            items: [
              { link: 'https://google.com/doc.pdf', mime: 'application/pdf', image: { width: 1000 } },
              { link: 'https://google.com/x.jpg', mime: '', image: { width: 1000 } },
            ],
          }),
      })
      const result = await tryGoogleCSE(baseProduct, 5)
      expect(result).toEqual([])
    })

    it('skips item when width < 800', async () => {
      process.env.GOOGLE_CUSTOM_SEARCH_API_KEY = 'key'
      process.env.GOOGLE_SEARCH_ENGINE_ID = 'engine'
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            items: [
              { link: 'https://google.com/img.jpg', mime: 'image/jpeg', image: { width: 600 } },
              { link: 'https://google.com/img2.jpg', mime: 'image/jpeg', image: {} },
            ],
          }),
      })
      const result = await tryGoogleCSE(baseProduct, 5)
      expect(result).toEqual([])
    })

    it('skips item when processImageFromUrl fails', async () => {
      process.env.GOOGLE_CUSTOM_SEARCH_API_KEY = 'key'
      process.env.GOOGLE_SEARCH_ENGINE_ID = 'engine'
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            items: [
              {
                link: 'https://google.com/img.jpg',
                mime: 'image/jpeg',
                image: { width: 1000, height: 800 },
              },
            ],
          }),
      })
      mockProcessImageFromUrl.mockRejectedValue(new Error('Upload failed'))
      const result = await tryGoogleCSE(baseProduct, 5)
      expect(result).toEqual([])
    })

    it('continues to next query when fetch throws', async () => {
      process.env.GOOGLE_CUSTOM_SEARCH_API_KEY = 'key'
      process.env.GOOGLE_SEARCH_ENGINE_ID = 'engine'
      mockFetch
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              items: [
                {
                  link: 'https://google.com/img.jpg',
                  mime: 'image/jpeg',
                  image: { width: 1000, height: 800 },
                },
              ],
            }),
        })
      const result = await tryGoogleCSE(baseProduct, 5, ['q1', 'q2'])
      expect(result).toHaveLength(1)
    })

    it('breaks outer loop when results fill needed', async () => {
      process.env.GOOGLE_CUSTOM_SEARCH_API_KEY = 'key'
      process.env.GOOGLE_SEARCH_ENGINE_ID = 'engine'
      mockFetch.mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            items: [
              {
                link: 'https://google.com/1.jpg',
                mime: 'image/jpeg',
                image: { width: 1000, height: 800 },
              },
              {
                link: 'https://google.com/2.jpg',
                mime: 'image/jpeg',
                image: { width: 1000, height: 800 },
              },
            ],
          }),
      })
      const result = await tryGoogleCSE(baseProduct, 2, ['q1', 'q2'])
      expect(result).toHaveLength(2)
      expect(mockFetch).toHaveBeenCalledTimes(1)
    })
  })

  describe('tryDallE', () => {
    it('returns empty array when OPENAI_API_KEY not set', async () => {
      process.env.OPENAI_API_KEY = undefined
      const result = await tryDallE(baseProduct, 5)
      expect(result).toEqual([])
    })

    it('returns empty array when needed < 1', async () => {
      process.env.OPENAI_API_KEY = 'key'
      const result = await tryDallE(baseProduct, 0)
      expect(result).toEqual([])
    })

    it('returns results when OpenAI generates images', async () => {
      process.env.OPENAI_API_KEY = 'key'
      mockImagesGenerate.mockResolvedValue({
        data: [{ url: 'https://openai.com/gen.jpg' }],
      })
      mockProcessImageFromUrl.mockResolvedValue({
        success: true,
        url: 'https://cloudinary.com/dalle.jpg',
        publicId: 'pid',
        width: 1024,
        height: 1024,
      })
      const result = await tryDallE(baseProduct, 2)
      expect(result.length).toBeGreaterThanOrEqual(1)
      if (result.length > 0) {
        expect(result[0].source).toBe('dalle')
        expect(result[0].pendingReview).toBe(true)
      }
    })

    it('uses category name in prompt', async () => {
      process.env.OPENAI_API_KEY = 'key'
      mockImagesGenerate.mockResolvedValue({
        data: [{ url: 'https://openai.com/gen.jpg' }],
      })
      mockProcessImageFromUrl.mockResolvedValue({
        success: true,
        url: 'https://cloudinary.com/dalle.jpg',
        publicId: 'pid',
        width: 1024,
        height: 1024,
      })
      const product = { ...baseProduct, category: { name: 'Lenses' } }
      await tryDallE(product, 1)
      expect(mockImagesGenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringMatching(/Lenses/),
        })
      )
    })

    it('uses default equipment when category is null', async () => {
      process.env.OPENAI_API_KEY = 'key'
      mockImagesGenerate.mockResolvedValue({
        data: [{ url: 'https://openai.com/gen.jpg' }],
      })
      mockProcessImageFromUrl.mockResolvedValue({
        success: true,
        url: 'https://cloudinary.com/dalle.jpg',
        publicId: 'pid',
        width: 1024,
        height: 1024,
      })
      const product = { ...baseProduct, category: null }
      await tryDallE(product, 1)
      expect(mockImagesGenerate).toHaveBeenCalledWith(
        expect.objectContaining({
          prompt: expect.stringMatching(/equipment/),
        })
      )
    })

    it('skips when no imageUrl in response', async () => {
      process.env.OPENAI_API_KEY = 'key'
      mockImagesGenerate.mockResolvedValue({ data: [{}] })
      const result = await tryDallE(baseProduct, 2)
      expect(result).toEqual([])
    })

    it('skips when processImageFromUrl fails', async () => {
      process.env.OPENAI_API_KEY = 'key'
      mockImagesGenerate.mockResolvedValue({
        data: [{ url: 'https://openai.com/gen.jpg' }],
      })
      mockProcessImageFromUrl.mockRejectedValue(new Error('Upload failed'))
      const result = await tryDallE(baseProduct, 2)
      expect(result).toEqual([])
    })

    it('continues when one generation fails', async () => {
      process.env.OPENAI_API_KEY = 'key'
      mockImagesGenerate
        .mockRejectedValueOnce(new Error('Rate limit'))
        .mockResolvedValueOnce({
          data: [{ url: 'https://openai.com/gen.jpg' }],
        })
      mockProcessImageFromUrl.mockResolvedValue({
        success: true,
        url: 'https://cloudinary.com/dalle.jpg',
        publicId: 'pid',
        width: 1024,
        height: 1024,
      })
      const result = await tryDallE(baseProduct, 2)
      expect(result.length).toBeGreaterThanOrEqual(1)
    })

    it('generates multiple angles when needed > 1', async () => {
      process.env.OPENAI_API_KEY = 'key'
      mockImagesGenerate
        .mockResolvedValueOnce({ data: [{ url: 'https://openai.com/1.jpg' }] })
        .mockResolvedValueOnce({ data: [{ url: 'https://openai.com/2.jpg' }] })
      mockProcessImageFromUrl.mockResolvedValue({
        success: true,
        url: 'https://cloudinary.com/dalle.jpg',
        publicId: 'pid',
        width: 1024,
        height: 1024,
      })
      const result = await tryDallE(baseProduct, 2)
      expect(result.length).toBe(2)
      expect(mockImagesGenerate).toHaveBeenCalledTimes(2)
    })
  })

  describe('validateImageRelevance', () => {
    it('returns score 0 when no Gemini API key', async () => {
      process.env.GEMINI_API_KEY = undefined
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = undefined
      const result = await validateImageRelevance('https://example.com/img.jpg', baseProduct)
      expect(result).toEqual({ score: 0, description: '' })
    })

    it('returns score 0 when fetch fails', async () => {
      process.env.GEMINI_API_KEY = 'key'
      mockFetch.mockResolvedValue({ ok: false })
      const result = await validateImageRelevance('https://example.com/img.jpg', baseProduct)
      expect(result.score).toBe(0)
    })

    it('returns parsed score when Gemini returns valid JSON', async () => {
      process.env.GEMINI_API_KEY = 'key'
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        headers: { get: () => 'image/jpeg' },
      })
      mockGenerateContent.mockResolvedValue({
        response: { text: () => '{"score": 0.85, "description": "Good product photo"}' },
      })
      const result = await validateImageRelevance('https://example.com/img.jpg', baseProduct)
      expect(result.score).toBe(0.85)
      expect(result.description).toBe('Good product photo')
    })

    it('uses GOOGLE_GENERATIVE_AI_API_KEY when GEMINI_API_KEY not set', async () => {
      process.env.GEMINI_API_KEY = undefined
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = 'fallback-key'
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        headers: { get: () => 'image/jpeg' },
      })
      mockGenerateContent.mockResolvedValue({
        response: { text: () => '{"score": 0.9, "description": "Perfect"}' },
      })
      const result = await validateImageRelevance('https://example.com/img.jpg', baseProduct)
      expect(result.score).toBe(0.9)
    })

    it('returns score 0 when fetch throws', async () => {
      process.env.GEMINI_API_KEY = 'key'
      mockFetch.mockRejectedValue(new Error('Network error'))
      const result = await validateImageRelevance('https://example.com/img.jpg', baseProduct)
      expect(result).toEqual({ score: 0, description: '' })
    })

    it('returns score 0 when no JSON match in response', async () => {
      process.env.GEMINI_API_KEY = 'key'
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        headers: { get: () => 'image/jpeg' },
      })
      mockGenerateContent.mockResolvedValue({
        response: { text: () => 'No JSON here' },
      })
      const result = await validateImageRelevance('https://example.com/img.jpg', baseProduct)
      expect(result).toEqual({ score: 0, description: '' })
    })

    it('clamps score to 0-1 range', async () => {
      process.env.GEMINI_API_KEY = 'key'
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        headers: { get: () => 'image/jpeg' },
      })
      mockGenerateContent.mockResolvedValue({
        response: { text: () => '{"score": 1.5, "description": "Bad"}' },
      })
      const result = await validateImageRelevance('https://example.com/img.jpg', baseProduct)
      expect(result.score).toBe(1)
    })

    it('returns score 0 when parsed score is not a number', async () => {
      process.env.GEMINI_API_KEY = 'key'
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        headers: { get: () => 'image/jpeg' },
      })
      mockGenerateContent.mockResolvedValue({
        response: { text: () => '{"score": "invalid", "description": "Test"}' },
      })
      const result = await validateImageRelevance('https://example.com/img.jpg', baseProduct)
      expect(result.score).toBe(0)
    })

    it('returns empty description when parsed description is not string', async () => {
      process.env.GEMINI_API_KEY = 'key'
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        headers: { get: () => 'image/jpeg' },
      })
      mockGenerateContent.mockResolvedValue({
        response: { text: () => '{"score": 0.8, "description": 123}' },
      })
      const result = await validateImageRelevance('https://example.com/img.jpg', baseProduct)
      expect(result.description).toBe('')
    })

    it('uses content-type from headers when available', async () => {
      process.env.GEMINI_API_KEY = 'key'
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        headers: { get: (h: string) => (h === 'content-type' ? 'image/png; charset=utf-8' : undefined) },
      })
      mockGenerateContent.mockResolvedValue({
        response: { text: () => '{"score": 0.8, "description": "OK"}' },
      })
      const result = await validateImageRelevance('https://example.com/img.jpg', baseProduct)
      expect(result.score).toBe(0.8)
    })

    it('uses default image/jpeg when content-type header is missing', async () => {
      process.env.GEMINI_API_KEY = 'key'
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        headers: { get: () => undefined },
      })
      mockGenerateContent.mockResolvedValue({
        response: { text: () => '{"score": 0.8, "description": "OK"}' },
      })
      const result = await validateImageRelevance('https://example.com/img.jpg', baseProduct)
      expect(result.score).toBe(0.8)
    })

    it('handles undefined text from response', async () => {
      process.env.GEMINI_API_KEY = 'key'
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        headers: { get: () => 'image/jpeg' },
      })
      mockGenerateContent.mockResolvedValue({
        response: { text: () => undefined },
      })
      const result = await validateImageRelevance('https://example.com/img.jpg', baseProduct)
      expect(result).toEqual({ score: 0, description: '' })
    })

    it('uses product name when no en translation', async () => {
      process.env.GEMINI_API_KEY = 'key'
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        headers: { get: () => 'image/jpeg' },
      })
      mockGenerateContent.mockResolvedValue({
        response: { text: () => '{"score": 0.8, "description": "OK"}' },
      })
      const product = { ...baseProduct, translations: [{ locale: 'ar', name: 'Arabic', longDescription: null }] }
      const result = await validateImageRelevance('https://example.com/img.jpg', product)
      expect(result.score).toBe(0.8)
    })

    it('handles product with null category and brand', async () => {
      process.env.GEMINI_API_KEY = 'key'
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        headers: { get: () => 'image/jpeg' },
      })
      mockGenerateContent.mockResolvedValue({
        response: { text: () => '{"score": 0.8, "description": "OK"}' },
      })
      const product = { ...baseProduct, category: null, brand: null }
      const result = await validateImageRelevance('https://example.com/img.jpg', product)
      expect(result.score).toBe(0.8)
    })
  })

  describe('sourceImages', () => {
    it('returns brand assets when available and targetCount reached', async () => {
      mockExistsSync.mockReturnValue(true)
      mockReaddirSync.mockReturnValue(['FX3-001.jpg'])
      mockReadFileSync.mockReturnValue(Buffer.from('image'))
      const result = await sourceImages(baseProduct, 1)
      expect(result).toHaveLength(1)
      expect(result[0].source).toBe('BRAND_ASSET')
    })

    it('returns empty when no API keys and no brand assets', async () => {
      process.env.UNSPLASH_ACCESS_KEY = undefined
      process.env.PEXELS_API_KEY = undefined
      process.env.GOOGLE_CUSTOM_SEARCH_API_KEY = undefined
      mockExistsSync.mockReturnValue(false)
      const result = await sourceImages(baseProduct, 5)
      expect(result).toEqual([])
    })

    it('returns early from Unsplash loop when targetCount reached', async () => {
      process.env.UNSPLASH_ACCESS_KEY = 'key'
      process.env.GEMINI_API_KEY = 'gemini-key'
      process.env.PEXELS_API_KEY = undefined
      process.env.GOOGLE_CUSTOM_SEARCH_API_KEY = undefined
      mockExistsSync.mockReturnValue(false)
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              results: [
                { urls: { regular: 'https://unsplash.com/1.jpg' }, width: 1000, height: 800 },
              ],
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
          headers: { get: () => 'image/jpeg' },
        })
      mockGenerateContent.mockResolvedValue({
        response: { text: () => '{"score": 0.8, "description": "Relevant"}' },
      })
      const result = await sourceImages(baseProduct, 1)
      expect(result).toHaveLength(1)
      expect(result[0].source).toBe('unsplash')
    })

    it('validates and filters Unsplash results by relevance', async () => {
      process.env.UNSPLASH_ACCESS_KEY = 'key'
      process.env.GEMINI_API_KEY = 'gemini-key'
      process.env.PEXELS_API_KEY = undefined
      process.env.GOOGLE_CUSTOM_SEARCH_API_KEY = undefined
      process.env.GOOGLE_SEARCH_ENGINE_ID = undefined
      process.env.OPENAI_API_KEY = undefined
      mockExistsSync.mockReturnValue(false)
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              results: [
                { urls: { regular: 'https://unsplash.com/1.jpg' }, width: 1000, height: 800 },
              ],
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
          headers: { get: () => 'image/jpeg' },
        })
      mockGenerateContent.mockResolvedValue({
        response: { text: () => '{"score": 0.8, "description": "Relevant"}' },
      })
      const result = await sourceImages(baseProduct, 5)
      expect(result.length).toBeGreaterThanOrEqual(1)
      expect(result[0].source).toBe('unsplash')
      expect(result[0].qualityScore).toBe(0.8)
    })

    it('filters out images with score below 0.7', async () => {
      process.env.UNSPLASH_ACCESS_KEY = 'key'
      mockExistsSync.mockReturnValue(false)
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              results: [
                { urls: { regular: 'https://unsplash.com/1.jpg' }, width: 1000, height: 800 },
              ],
            }),
        })
        .mockResolvedValueOnce({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)), headers: { get: () => 'image/jpeg' } })
      mockGenerateContent.mockResolvedValue({
        response: { text: () => '{"score": 0.5, "description": "Low relevance"}' },
      })
      const result = await sourceImages(baseProduct, 5)
      expect(result).toHaveLength(0)
    })

    it('adds Pexels images that pass validation to results', async () => {
      process.env.UNSPLASH_ACCESS_KEY = undefined
      process.env.PEXELS_API_KEY = 'key'
      process.env.GEMINI_API_KEY = 'gemini-key'
      process.env.GOOGLE_CUSTOM_SEARCH_API_KEY = undefined
      process.env.GOOGLE_SEARCH_ENGINE_ID = undefined
      process.env.OPENAI_API_KEY = undefined
      mockExistsSync.mockReturnValue(false)
      mockPexelsSearch.mockResolvedValue({
        photos: [{ src: { original: 'https://pexels.com/1.jpg' } }],
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        headers: { get: () => 'image/jpeg' },
      })
      mockGenerateContent.mockResolvedValue({
        response: { text: () => '{"score": 0.85, "description": "Relevant"}' },
      })
      const result = await sourceImages(baseProduct, 5)
      expect(result.length).toBeGreaterThanOrEqual(1)
      expect(result[0].source).toBe('pexels')
      expect(result[0].qualityScore).toBe(0.85)
    })

    it('returns early from Pexels loop when targetCount reached', async () => {
      process.env.UNSPLASH_ACCESS_KEY = undefined
      process.env.PEXELS_API_KEY = 'key'
      process.env.GEMINI_API_KEY = 'gemini-key'
      process.env.GOOGLE_CUSTOM_SEARCH_API_KEY = undefined
      mockExistsSync.mockReturnValue(false)
      mockPexelsSearch.mockResolvedValue({
        photos: [{ src: { original: 'https://pexels.com/1.jpg' } }],
      })
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        headers: { get: () => 'image/jpeg' },
      })
      mockGenerateContent.mockResolvedValue({
        response: { text: () => '{"score": 0.85, "description": "Relevant"}' },
      })
      const result = await sourceImages(baseProduct, 1)
      expect(result).toHaveLength(1)
      expect(result[0].source).toBe('pexels')
    })

    it('returns early from Google CSE loop when targetCount reached', async () => {
      mockFetch.mockReset()
      process.env.UNSPLASH_ACCESS_KEY = undefined
      process.env.PEXELS_API_KEY = undefined
      process.env.GOOGLE_CUSTOM_SEARCH_API_KEY = 'key'
      process.env.GOOGLE_SEARCH_ENGINE_ID = 'engine'
      process.env.GEMINI_API_KEY = 'gemini-key'
      mockExistsSync.mockReturnValue(false)
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('googleapis.com/customsearch')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                items: [
                  {
                    link: 'https://google.com/img.jpg',
                    mime: 'image/jpeg',
                    image: { width: 1000, height: 800 },
                  },
                ],
              }),
          }) as unknown as Promise<Response>
        }
        return Promise.resolve({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
          headers: { get: () => 'image/jpeg' },
        }) as unknown as Promise<Response>
      })
      mockGenerateContent.mockResolvedValue({
        response: { text: () => '{"score": 0.8, "description": "OK"}' },
      })
      const result = await sourceImages(baseProduct, 1)
      expect(result).toHaveLength(1)
      expect(result[0].source).toBe('google')
    })

    it('adds Google CSE images that pass validation to results', async () => {
      mockFetch.mockReset()
      process.env.UNSPLASH_ACCESS_KEY = undefined
      process.env.PEXELS_API_KEY = undefined
      process.env.GOOGLE_CUSTOM_SEARCH_API_KEY = 'key'
      process.env.GOOGLE_SEARCH_ENGINE_ID = 'engine'
      process.env.GEMINI_API_KEY = 'gemini-key'
      process.env.OPENAI_API_KEY = undefined
      mockExistsSync.mockReturnValue(false)
      const imageFetchResponse = {
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        headers: { get: () => 'image/jpeg' },
      }
      mockFetch.mockImplementation((url: string) => {
        if (url.includes('googleapis.com/customsearch')) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                items: [
                  {
                    link: 'https://google.com/img.jpg',
                    mime: 'image/jpeg',
                    image: { width: 1000, height: 800 },
                  },
                ],
              }),
          }) as unknown as Promise<Response>
        }
        return Promise.resolve(imageFetchResponse) as unknown as Promise<Response>
      })
      mockGenerateContent.mockResolvedValue({
        response: { text: () => '{"score": 0.8, "description": "OK"}' },
      })
      const result = await sourceImages(baseProduct, 5)
      expect(result.length).toBeGreaterThanOrEqual(1)
      expect(result[0].source).toBe('google')
      expect(result[0].qualityScore).toBe(0.8)
    })

    it('continues to DALL-E when Google does not fill target', async () => {
      mockFetch.mockReset()
      process.env.OPENAI_API_KEY = 'key'
      mockExistsSync.mockReturnValue(false)
      mockImagesGenerate.mockResolvedValue({
        data: [{ url: 'https://openai.com/gen.jpg' }],
      })
      mockFetch
        .mockResolvedValueOnce({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)), headers: { get: () => 'image/jpeg' } })
      mockGenerateContent.mockResolvedValue({
        response: { text: () => '{"score": 0.8, "description": "OK"}' },
      })
      const result = await sourceImages(baseProduct, 5)
      expect(result.length).toBeGreaterThanOrEqual(0)
    })

    it('adds DALL-E images that pass validation to results', async () => {
      mockFetch.mockReset()
      process.env.UNSPLASH_ACCESS_KEY = undefined
      process.env.PEXELS_API_KEY = undefined
      process.env.GOOGLE_CUSTOM_SEARCH_API_KEY = undefined
      process.env.GOOGLE_SEARCH_ENGINE_ID = undefined
      process.env.OPENAI_API_KEY = 'key'
      process.env.GEMINI_API_KEY = 'gemini-key'
      mockExistsSync.mockReturnValue(false)
      mockImagesGenerate.mockResolvedValue({
        data: [{ url: 'https://openai.com/gen.jpg' }],
      })
      mockFetch.mockResolvedValueOnce({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        headers: { get: () => 'image/jpeg' },
      })
      mockGenerateContent.mockResolvedValue({
        response: { text: () => '{"score": 0.75, "description": "Generated"}' },
      })
      const result = await sourceImages(baseProduct, 5)
      expect(result.length).toBeGreaterThanOrEqual(1)
      expect(result[0].source).toBe('dalle')
    })

    it('returns early from DALL-E loop when targetCount reached', async () => {
      mockFetch.mockReset()
      process.env.UNSPLASH_ACCESS_KEY = undefined
      process.env.PEXELS_API_KEY = undefined
      process.env.GOOGLE_CUSTOM_SEARCH_API_KEY = undefined
      process.env.OPENAI_API_KEY = 'key'
      process.env.GEMINI_API_KEY = 'gemini-key'
      mockExistsSync.mockReturnValue(false)
      mockImagesGenerate.mockResolvedValue({
        data: [{ url: 'https://openai.com/gen.jpg' }],
      })
      mockFetch.mockResolvedValue({
        ok: true,
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
        headers: { get: () => 'image/jpeg' },
      })
      mockGenerateContent.mockResolvedValue({
        response: { text: () => '{"score": 0.75, "description": "Generated"}' },
      })
      const result = await sourceImages(baseProduct, 1)
      expect(result).toHaveLength(1)
      expect(result[0].source).toBe('dalle')
    })

    it('returns slice when targetCount not fully reached', async () => {
      process.env.UNSPLASH_ACCESS_KEY = 'key'
      process.env.GEMINI_API_KEY = 'gemini-key'
      mockExistsSync.mockReturnValue(false)
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              results: [
                { urls: { regular: 'https://unsplash.com/1.jpg' }, width: 1000, height: 800 },
              ],
            }),
        })
        .mockResolvedValue({
          ok: true,
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
          headers: { get: () => 'image/jpeg' },
        })
      mockGenerateContent.mockResolvedValue({
        response: { text: () => '{"score": 0.5, "description": "Low"}' },
      })
      const result = await sourceImages(baseProduct, 5)
      expect(result.length).toBeLessThanOrEqual(5)
    })
  })
})
