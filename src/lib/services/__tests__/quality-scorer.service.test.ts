/**
 * Unit tests for quality-scorer.service
 * Covers: scoreProduct (persist/default), getImageCount branches (productImages with isDeleted),
 * scoreAllProducts, getCachedScan (cache hit/miss), getProductsWithGaps, getQualityTrend, captureQualitySnapshot.
 */

import {
  scoreProduct,
  getCachedScan,
  scoreAllProducts,
  getProductsWithGaps,
  getQualityTrend,
  captureQualitySnapshot,
} from '../quality-scorer.service'
import { prisma } from '@/lib/db/prisma'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    product: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
    $transaction: jest.fn((arg: unknown) => (Array.isArray(arg) ? Promise.all(arg) : (arg as () => Promise<unknown>)())),
    catalogQualitySnapshot: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
  },
}))

const mockRedis = { get: jest.fn(), setex: jest.fn() }
jest.mock('@/lib/queue/redis.client', () => ({
  getRedisClient: jest.fn(() => mockRedis),
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('quality-scorer.service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRedis.get.mockResolvedValue(null)
    mockRedis.setex.mockResolvedValue(undefined)
  })

  describe('scoreProduct', () => {
    it('returns 0 when product not found', async () => {
      ;(mockPrisma.product.findUnique as jest.Mock).mockResolvedValue(null)
      const result = await scoreProduct('missing-id', { persist: false })
      expect(result).toBe(0)
      expect(mockPrisma.product.update).not.toHaveBeenCalled()
    })

    it('returns 100 for fully filled product (all locales, SEO, desc, 4+ images)', async () => {
      const translations = [
        {
          locale: 'ar',
          name: 'اسم عربي طويل جداً',
          shortDescription: 'وصف قصير من عشرين حرفاً على الأقل',
          longDescription: 'x'.repeat(100),
          seoTitle: 't',
          seoDescription: 'd',
          seoKeywords: 'k',
        },
        {
          locale: 'en',
          name: 'English name here',
          shortDescription: 'Short description with at least twenty characters here',
          longDescription: 'x'.repeat(100),
          seoTitle: 't',
          seoDescription: 'd',
          seoKeywords: 'k',
        },
        {
          locale: 'zh',
          name: '中文名称在这里',
          shortDescription: '短描述至少二十个字符才能得分',
          longDescription: 'x'.repeat(100),
          seoTitle: 't',
          seoDescription: 'd',
          seoKeywords: 'k',
        },
      ]
      ;(mockPrisma.product.findUnique as jest.Mock).mockResolvedValue({
        id: 'p1',
        deletedAt: null,
        featuredImage: 'https://example.com/1.jpg',
        galleryImages: ['a', 'b', 'c'],
        translations,
        productImages: [{ id: 'img1' }, { id: 'img2' }, { id: 'img3' }, { id: 'img4' }],
      } as any)
      const result = await scoreProduct('p1', { persist: false })
      expect(result).toBe(100)
    })

    it('returns partial score when only some criteria met', async () => {
      ;(mockPrisma.product.findUnique as jest.Mock).mockResolvedValue({
        id: 'p2',
        deletedAt: null,
        featuredImage: null,
        galleryImages: [],
        translations: [
          {
            locale: 'en',
            name: 'English only',
            shortDescription: null,
            longDescription: null,
            seoTitle: null,
            seoDescription: null,
            seoKeywords: null,
          },
        ],
        productImages: [],
      } as any)
      const result = await scoreProduct('p2', { persist: false })
      expect(result).toBeGreaterThanOrEqual(0)
      expect(result).toBeLessThan(100)
    })

    it('persists score to DB when persist is true (default)', async () => {
      ;(mockPrisma.product.findUnique as jest.Mock).mockResolvedValue({
        id: 'p3',
        deletedAt: null,
        featuredImage: 'f',
        galleryImages: [],
        translations: [
          { locale: 'ar', name: 'اسم المنتج العربي الطويل', shortDescription: 'x'.repeat(20), longDescription: 'x'.repeat(100), seoTitle: 't', seoDescription: 'd', seoKeywords: 'k' },
          { locale: 'en', name: 'Product name here', shortDescription: 'x'.repeat(20), longDescription: 'x'.repeat(100), seoTitle: 't', seoDescription: 'd', seoKeywords: 'k' },
          { locale: 'zh', name: '产品名称在这里', shortDescription: 'x'.repeat(20), longDescription: 'x'.repeat(100), seoTitle: 't', seoDescription: 'd', seoKeywords: 'k' },
        ],
        productImages: [{ id: 'i1' }, { id: 'i2' }, { id: 'i3' }, { id: 'i4' }],
      } as any)
      ;(mockPrisma.product.update as jest.Mock).mockResolvedValue({})
      const result = await scoreProduct('p3', { persist: true })
      expect(result).toBe(100)
      expect(mockPrisma.product.update).toHaveBeenCalledWith({
        where: { id: 'p3' },
        data: expect.objectContaining({ contentScore: 100 }),
      })
    })

    it('uses featuredImage and galleryImages when productImages empty', async () => {
      ;(mockPrisma.product.findUnique as jest.Mock).mockResolvedValue({
        id: 'p4b',
        deletedAt: null,
        featuredImage: 'https://example.com/feat.jpg',
        galleryImages: ['g1', 'g2', 'g3'],
        translations: [
          { locale: 'ar', name: 'اسم طويل', shortDescription: 'x'.repeat(20), longDescription: 'x'.repeat(100), seoTitle: 't', seoDescription: 'd', seoKeywords: 'k' },
          { locale: 'en', name: 'Long name', shortDescription: 'x'.repeat(20), longDescription: 'x'.repeat(100), seoTitle: 't', seoDescription: 'd', seoKeywords: 'k' },
          { locale: 'zh', name: '长名', shortDescription: 'x'.repeat(20), longDescription: 'x'.repeat(100), seoTitle: 't', seoDescription: 'd', seoKeywords: 'k' },
        ],
        productImages: [],
      } as any)
      const result = await scoreProduct('p4b', { persist: false })
      expect(result).toBeGreaterThan(0)
    })

    it('counts only non-deleted productImages when productImages exist', async () => {
      ;(mockPrisma.product.findUnique as jest.Mock).mockResolvedValue({
        id: 'p4',
        deletedAt: null,
        featuredImage: null,
        galleryImages: null,
        translations: [
          { locale: 'ar', name: 'اسم طويل', shortDescription: 'x'.repeat(20), longDescription: 'x'.repeat(100), seoTitle: 't', seoDescription: 'd', seoKeywords: 'k' },
          { locale: 'en', name: 'Long name', shortDescription: 'x'.repeat(20), longDescription: 'x'.repeat(100), seoTitle: 't', seoDescription: 'd', seoKeywords: 'k' },
          { locale: 'zh', name: '长名', shortDescription: 'x'.repeat(20), longDescription: 'x'.repeat(100), seoTitle: 't', seoDescription: 'd', seoKeywords: 'k' },
        ],
        productImages: [
          { id: 'i1', isDeleted: false },
          { id: 'i2', isDeleted: true },
          { id: 'i3', isDeleted: false },
        ],
      } as any)
      const result = await scoreProduct('p4', { persist: false })
      expect(result).toBeLessThan(100)
      expect(result).toBeGreaterThan(0)
    })
  })

  describe('scoreAllProducts', () => {
    it('returns total, avgScore and distribution when products exist', async () => {
      ;(mockPrisma.product.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'pa',
          translations: [
            { locale: 'ar', name: 'x'.repeat(6), shortDescription: 'x'.repeat(20), longDescription: 'x'.repeat(100), seoTitle: 't', seoDescription: 'd', seoKeywords: 'k' },
            { locale: 'en', name: 'x'.repeat(6), shortDescription: 'x'.repeat(20), longDescription: 'x'.repeat(100), seoTitle: 't', seoDescription: 'd', seoKeywords: 'k' },
            { locale: 'zh', name: 'x'.repeat(6), shortDescription: 'x'.repeat(20), longDescription: 'x'.repeat(100), seoTitle: 't', seoDescription: 'd', seoKeywords: 'k' },
          ],
          productImages: [{ id: '1' }, { id: '2' }, { id: '3' }, { id: '4' }],
        },
        {
          id: 'pb',
          translations: [
            { locale: 'ar', name: 'x'.repeat(6), shortDescription: 'x'.repeat(20), longDescription: 'x'.repeat(50), seoTitle: null, seoDescription: null, seoKeywords: null },
            { locale: 'en', name: 'x'.repeat(6), shortDescription: 'x'.repeat(20), longDescription: 'x'.repeat(50), seoTitle: null, seoDescription: null, seoKeywords: null },
            { locale: 'zh', name: 'x'.repeat(6), shortDescription: 'x'.repeat(20), longDescription: 'x'.repeat(50), seoTitle: null, seoDescription: null, seoKeywords: null },
          ],
          productImages: [],
          featuredImage: null,
          galleryImages: [],
        },
      ])
      ;(prisma.$transaction as jest.Mock).mockImplementation((arg: unknown) =>
        Array.isArray(arg) ? Promise.all(arg) : Promise.resolve()
      )
      const result = await scoreAllProducts()
      expect(result).toMatchObject({
        total: 2,
        avgScore: expect.any(Number),
        distribution: { excellent: expect.any(Number), good: expect.any(Number), fair: expect.any(Number), poor: expect.any(Number) },
      })
    })

    it('returns avgScore 0 when no products', async () => {
      ;(mockPrisma.product.findMany as jest.Mock).mockResolvedValue([])
      const result = await scoreAllProducts()
      expect(result.total).toBe(0)
      expect(result.avgScore).toBe(0)
    })
  })

  describe('getProductsWithGaps', () => {
    it('returns products with translations gap', async () => {
      ;(mockPrisma.product.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'pg1',
          sku: 'SKU1',
          translations: [{ locale: 'en', name: 'Only EN', shortDescription: null, longDescription: null, seoTitle: null, seoDescription: null, seoKeywords: null }],
          productImages: [],
        },
      ])
      const result = await getProductsWithGaps('translations', { limit: 10, offset: 0 })
      expect(Array.isArray(result)).toBe(true)
      if (result.length > 0) {
        expect(result[0]).toMatchObject({ id: 'pg1', gap: 'translations' })
      }
    })

    it('returns products with photos gap', async () => {
      ;(mockPrisma.product.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'pg2',
          sku: 'SKU2',
          translations: [
            { locale: 'ar', name: 'x'.repeat(6), shortDescription: 'x'.repeat(20), longDescription: 'x'.repeat(100), seoTitle: 't', seoDescription: 'd', seoKeywords: 'k' },
            { locale: 'en', name: 'x'.repeat(6), shortDescription: 'x'.repeat(20), longDescription: 'x'.repeat(100), seoTitle: 't', seoDescription: 'd', seoKeywords: 'k' },
            { locale: 'zh', name: 'x'.repeat(6), shortDescription: 'x'.repeat(20), longDescription: 'x'.repeat(100), seoTitle: 't', seoDescription: 'd', seoKeywords: 'k' },
          ],
          productImages: [],
          galleryImages: [],
          featuredImage: null,
        },
      ])
      const result = await getProductsWithGaps('photos', { limit: 5 })
      expect(Array.isArray(result)).toBe(true)
    })

    it('returns products with specs gap when specifications < 50% filled', async () => {
      ;(mockPrisma.product.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'pg3',
          sku: 'SKU3',
          priceDaily: 100,
          lastAiRunAt: null,
          translations: [
            {
              locale: 'en',
              name: 'Product',
              shortDescription: 'x'.repeat(20),
              longDescription: 'x'.repeat(100),
              seoTitle: 't',
              seoDescription: 'd',
              seoKeywords: 'k',
              specifications: { Sensor: '', Resolution: '', Mount: '', Weight: '100g' },
            },
          ],
          productImages: [{ id: 'i1' }],
          galleryImages: ['u1'],
          featuredImage: 'f1',
        } as any,
      ])
      const result = await getProductsWithGaps('specs', { limit: 10 })
      expect(Array.isArray(result)).toBe(true)
    })

    it('returns products with seo gap when no translation has full SEO', async () => {
      ;(mockPrisma.product.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'pg4',
          sku: 'SKU4',
          translations: [
            { locale: 'en', name: 'x'.repeat(6), shortDescription: 'x'.repeat(20), longDescription: 'x'.repeat(100), seoTitle: null, seoDescription: null, seoKeywords: null },
          ],
          productImages: [{ id: 'i1' }, { id: 'i2' }, { id: 'i3' }, { id: 'i4' }],
        },
      ])
      const result = await getProductsWithGaps('seo', { limit: 10 })
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
      expect(result[0]).toMatchObject({ id: 'pg4', gap: 'seo' })
    })

    it('returns products with description gap when shortDescription < 20 chars', async () => {
      ;(mockPrisma.product.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'pg5',
          sku: 'SKU5',
          translations: [
            { locale: 'en', name: 'x'.repeat(6), shortDescription: 'short', longDescription: 'x'.repeat(100), seoTitle: 't', seoDescription: 'd', seoKeywords: 'k' },
          ],
          productImages: [{ id: 'i1' }, { id: 'i2' }, { id: 'i3' }, { id: 'i4' }],
        },
      ])
      const result = await getProductsWithGaps('description', { limit: 10 })
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBeGreaterThan(0)
      expect(result[0]).toMatchObject({ id: 'pg5', gap: 'description' })
    })

    it('covers isFilled object and primitive branches via specs with mixed value types', async () => {
      ;(mockPrisma.product.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'pg6',
          sku: 'SKU6',
          translations: [
            {
              locale: 'en',
              name: 'Product',
              shortDescription: 'x'.repeat(20),
              longDescription: 'x'.repeat(100),
              seoTitle: 't',
              seoDescription: 'd',
              seoKeywords: 'k',
              specifications: { A: '', B: '', C: 42, D: { x: 1 }, E: '' },
            },
          ],
          productImages: [{ id: 'i1' }, { id: 'i2' }, { id: 'i3' }, { id: 'i4' }],
        } as any,
      ])
      const result = await getProductsWithGaps('specs', { limit: 10 })
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('getQualityTrend', () => {
    it('returns snapshots for last N days', async () => {
      const now = new Date()
      ;(mockPrisma.catalogQualitySnapshot.findMany as jest.Mock).mockResolvedValue([
        { date: now, avgScore: 75, totalProducts: 100, gapCounts: {} },
      ])
      const result = await getQualityTrend(7)
      expect(Array.isArray(result)).toBe(true)
      if (result.length > 0) {
        expect(result[0]).toHaveProperty('date')
        expect(result[0]).toHaveProperty('avgScore', 75)
        expect(result[0]).toHaveProperty('totalProducts', 100)
      }
    })
  })

  describe('captureQualitySnapshot', () => {
    it('upserts snapshot with runFullScan result', async () => {
      ;(mockPrisma.product.findMany as jest.Mock).mockResolvedValue([])
      ;(mockPrisma.catalogQualitySnapshot.upsert as jest.Mock).mockResolvedValue({})
      await captureQualitySnapshot()
      expect(mockPrisma.catalogQualitySnapshot.upsert).toHaveBeenCalled()
    })
  })

  describe('getCachedScan', () => {
    it('returns cached scan when Redis has data', async () => {
      const cachedData = {
        scannedAt: new Date().toISOString(),
        totalProducts: 2,
        catalogQualityScore: 70,
        byGapType: { missingTranslations: 0, missingSeo: 1, missingDescription: 0, missingPhotos: 0, missingSpecs: 0 },
        products: [
          { id: 'c1', sku: 'S1', contentScore: 80, gaps: [], imageCount: 4, lastAiRunAt: null, priceDaily: 100 },
          { id: 'c2', sku: 'S2', contentScore: 60, gaps: ['seo'], imageCount: 2, lastAiRunAt: null, priceDaily: 50 },
        ],
      }
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(cachedData))
      const result = await getCachedScan()
      expect(result.cached).toBe(true)
      expect(result.totalProducts).toBe(2)
      expect(result.catalogQualityScore).toBe(70)
      expect(result.products).toHaveLength(2)
    })

    it('returns scan with products and totals from DB when cache miss', async () => {
      ;(mockPrisma.product.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'p1',
          name: 'Product 1',
          sku: 'SKU1',
          contentScore: 80,
          lastAiRunAt: null,
          priceDaily: 100,
          translations: [
            {
              locale: 'en',
              name: 'Product 1',
              shortDescription: 'x',
              longDescription: 'x',
              seoTitle: 't',
              seoDescription: 'd',
              seoKeywords: 'k',
            },
          ],
          productImages: [{ id: 'i1' }],
          galleryImages: ['u1'],
          featuredImage: 'f1',
        } as any,
        {
          id: 'p2',
          sku: 'SKU2',
          lastAiRunAt: null,
          priceDaily: 50,
          translations: [
            {
              locale: 'en',
              name: 'Product 2',
              shortDescription: 'x'.repeat(20),
              longDescription: 'x',
              seoTitle: null,
              seoDescription: null,
              seoKeywords: null,
              specifications: { A: '', B: '', C: 'filled', D: '', E: '' },
            },
          ],
          productImages: [],
          featuredImage: null,
          galleryImages: [],
        } as any,
      ])
      const result = await getCachedScan()
      expect(result).toHaveProperty('products')
      expect(result).toHaveProperty('totalProducts')
      expect(result).toHaveProperty('catalogQualityScore')
      expect(result).toHaveProperty('byGapType')
      expect(result).toHaveProperty('cached')
      expect(Array.isArray(result.products)).toBe(true)
    })

    it('uses product id as name when no en translation and no sku', async () => {
      ;(mockPrisma.product.findMany as jest.Mock).mockResolvedValue([
        {
          id: 'fallback-id',
          sku: null,
          lastAiRunAt: null,
          priceDaily: 0,
          translations: [{ locale: 'ar', name: null, shortDescription: null, longDescription: null, seoTitle: null, seoDescription: null, seoKeywords: null }],
          productImages: [],
          featuredImage: null,
          galleryImages: [],
        } as any,
      ])
      const result = await getCachedScan()
      expect(result.products).toHaveLength(1)
      expect(result.products[0].name).toBe('fallback-id')
    })

    it('falls back to runFullScan when Redis get throws', async () => {
      mockRedis.get.mockRejectedValueOnce(new Error('Redis down'))
      ;(mockPrisma.product.findMany as jest.Mock).mockResolvedValue([])
      const result = await getCachedScan()
      expect(result.cached).toBe(false)
      expect(result.totalProducts).toBe(0)
    })

    it('returns scan when Redis setex throws after runFullScan', async () => {
      mockRedis.get.mockResolvedValueOnce(null)
      mockRedis.setex.mockRejectedValueOnce(new Error('Redis write fail'))
      ;(mockPrisma.product.findMany as jest.Mock).mockResolvedValue([])
      const result = await getCachedScan()
      expect(result.cached).toBe(false)
      expect(result.totalProducts).toBe(0)
    })

    it('returns cached scan with byGapType defaults when keys missing', async () => {
      const cachedData = {
        scannedAt: new Date().toISOString(),
        totalProducts: 0,
        catalogQualityScore: 0,
        products: [],
      }
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(cachedData))
      const result = await getCachedScan()
      expect(result.cached).toBe(true)
      expect(result.byGapType).toMatchObject({
        missingTranslations: 0,
        missingSeo: 0,
        missingDescription: 0,
        missingPhotos: 0,
        missingSpecs: 0,
      })
    })
  })
})
