/**
 * Unit tests for content-health.service
 */

import {
  calculateQualityScore,
  findProductsWithGaps,
  getProductIdsWithGaps,
} from '../content-health.service'
import { prisma } from '@/lib/db/prisma'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    product: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  },
}))

const mockFindUnique = prisma.product.findUnique as jest.Mock
const mockFindMany = prisma.product.findMany as jest.Mock
const mockCount = prisma.product.count as jest.Mock

const fullProduct = {
  id: 'p1',
  sku: 'SKU-1',
  deletedAt: null,
  featuredImage: 'https://example.com/1.jpg',
  galleryImages: ['a', 'b', 'c', 'd'],
  translations: [
    {
      locale: 'ar',
      name: 'اسم',
      shortDescription: 'وصف قصير',
      longDescription: 'وصف طويل',
      seoTitle: 's',
      seoDescription: 'd',
      seoKeywords: 'k',
      specifications: { a: '1', b: '2' },
    },
    {
      locale: 'en',
      name: 'Name',
      shortDescription: 'Short',
      longDescription: 'Long desc',
      seoTitle: 's',
      seoDescription: 'd',
      seoKeywords: 'k',
      specifications: { a: '1', b: '2' },
    },
    {
      locale: 'zh',
      name: '名',
      shortDescription: '短',
      longDescription: '长描述',
      seoTitle: 's',
      seoDescription: 'd',
      seoKeywords: 'k',
      specifications: { a: '1', b: '2' },
    },
  ],
}

describe('content-health.service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFindMany.mockReset()
  })

  describe('calculateQualityScore', () => {
    it('returns 0 when product not found', async () => {
      mockFindUnique.mockResolvedValue(null)
      const result = await calculateQualityScore('missing-id')
      expect(result).toBe(0)
    })

    it('returns 100 for fully complete product', async () => {
      mockFindUnique.mockResolvedValue(fullProduct)
      const result = await calculateQualityScore('p1')
      expect(result).toBe(100)
    })

    it('returns 0 when translations missing required locales', async () => {
      mockFindUnique.mockResolvedValue({
        ...fullProduct,
        translations: [{ locale: 'en', name: 'x', shortDescription: 'x', longDescription: 'x', seoTitle: 's', seoDescription: 'd', seoKeywords: 'k', specifications: null }],
      })
      const result = await calculateQualityScore('p1')
      expect(result).toBeLessThan(100)
    })

    it('adds 10 pts for specs when firstSpecs is null', async () => {
      mockFindUnique.mockResolvedValue({
        ...fullProduct,
        translations: fullProduct.translations.map((t) => ({ ...t, specifications: null })),
      })
      const result = await calculateQualityScore('p1')
      expect(result).toBeGreaterThanOrEqual(90)
    })

    it('uses structured specifications for specs completeness', async () => {
      mockFindUnique.mockResolvedValue({
        ...fullProduct,
        translations: [
          {
            ...fullProduct.translations[0],
            specifications: {
              groups: [
                {
                  specs: [
                    { key: 'a', label: 'A', value: 'val1' },
                    { key: 'b', label: 'B', value: 'val2' },
                  ],
                },
              ],
            },
          },
          fullProduct.translations[1],
          fullProduct.translations[2],
        ],
      })
      const result = await calculateQualityScore('p1')
      expect(result).toBe(100)
    })

    it('excludes unknown and n/a from structured specs filled count', async () => {
      mockFindUnique.mockResolvedValue({
        ...fullProduct,
        translations: [
          {
            ...fullProduct.translations[0],
            specifications: {
              groups: [
                {
                  specs: [
                    { key: 'a', label: 'A', value: 'valid' },
                    { key: 'b', label: 'B', value: 'unknown' },
                    { key: 'c', label: 'C', value: 'n/a' },
                  ],
                },
              ],
            },
          },
          fullProduct.translations[1],
          fullProduct.translations[2],
        ],
      })
      const result = await calculateQualityScore('p1')
      expect(result).toBeLessThan(100)
    })

    it('handles flat specs with array object and primitive values for isFilled', async () => {
      mockFindUnique.mockResolvedValue({
        ...fullProduct,
        translations: [
          {
            ...fullProduct.translations[0],
            specifications: {
              weight: 5,
              arr: [1, 2, 3],
              nested: { x: 1 },
            },
          },
          fullProduct.translations[1],
          fullProduct.translations[2],
        ],
      })
      const result = await calculateQualityScore('p1')
      expect(result).toBeGreaterThanOrEqual(90)
    })

    it('returns 0 for structured specs with empty groups', async () => {
      mockFindUnique.mockResolvedValue({
        ...fullProduct,
        translations: [
          { ...fullProduct.translations[0], specifications: { groups: [{ specs: [] }] } },
          fullProduct.translations[1],
          fullProduct.translations[2],
        ],
      })
      const result = await calculateQualityScore('p1')
      expect(result).toBeLessThan(100)
    })

    it('returns 0 for flat specs with only excluded keys', async () => {
      mockFindUnique.mockResolvedValue({
        ...fullProduct,
        translations: [
          { ...fullProduct.translations[0], specifications: { highlights: [], quickSpecs: [], groups: [] } },
          fullProduct.translations[1],
          fullProduct.translations[2],
        ],
      })
      const result = await calculateQualityScore('p1')
      expect(result).toBeLessThan(100)
    })

    it('accepts longDescription when shortDescription empty for translations', async () => {
      mockFindUnique.mockResolvedValue({
        ...fullProduct,
        translations: [
          { ...fullProduct.translations[0], shortDescription: null, longDescription: 'وصف طويل' },
          { ...fullProduct.translations[1], shortDescription: 'Short', longDescription: 'Long' },
          { ...fullProduct.translations[2], shortDescription: '短', longDescription: '长' },
        ],
      })
      const result = await calculateQualityScore('p1')
      expect(result).toBe(100)
    })
  })

  describe('findProductsWithGaps', () => {
    it('returns report with total, byGapType, products', async () => {
      mockFindMany.mockResolvedValue([])
      mockCount.mockResolvedValue(0)
      const result = await findProductsWithGaps({ page: 1, limit: 20 })
      expect(result).toHaveProperty('total')
      expect(result).toHaveProperty('byGapType')
      expect(result).toHaveProperty('products')
      expect(result.byGapType).toMatchObject({
        translations: 0,
        seo: 0,
        description: 0,
        photos: 0,
        specs: 0,
      })
    })

    it('applies search filter when q provided', async () => {
      mockFindMany.mockResolvedValue([])
      mockCount.mockResolvedValue(0)
      await findProductsWithGaps({ page: 1, limit: 20, q: 'camera' })
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            translations: expect.objectContaining({
              some: expect.objectContaining({
                name: expect.objectContaining({ contains: 'camera' }),
              }),
            }),
          }),
        })
      )
    })

    it('trims q and skips filter when empty', async () => {
      mockFindMany.mockResolvedValue([])
      mockCount.mockResolvedValue(0)
      await findProductsWithGaps({ q: '  ' })
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: null },
        })
      )
    })

    it('uses default page 1 and limit 100 when options empty', async () => {
      mockFindMany.mockResolvedValue([])
      mockCount.mockResolvedValue(0)
      await findProductsWithGaps()
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 100,
        })
      )
    })

    it('identifies products with translation gaps', async () => {
      mockFindMany.mockResolvedValue([
        {
          id: 'p1',
          sku: 'SKU-1',
          featuredImage: null,
          galleryImages: [],
          translations: [{ locale: 'en', name: 'x', shortDescription: null, longDescription: null, seoTitle: null, seoDescription: null, seoKeywords: null, specifications: null }],
        },
      ])
      mockCount.mockResolvedValue(1)
      const result = await findProductsWithGaps({ page: 1, limit: 100 })
      expect(result.byGapType.translations).toBe(1)
      expect(result.products[0].missingFields).toContain('translations')
    })

    it('identifies products with seo gaps', async () => {
      const prodWithArEnZh = {
        id: 'p1',
        sku: 'SKU-1',
        featuredImage: '/img.jpg',
        galleryImages: ['a', 'b', 'c', 'd'],
        translations: [
          { locale: 'ar', name: 'ا', shortDescription: 'x', longDescription: 'x', seoTitle: null, seoDescription: null, seoKeywords: null, specifications: { a: '1' } },
          { locale: 'en', name: 'E', shortDescription: 'x', longDescription: 'x', seoTitle: null, seoDescription: null, seoKeywords: null, specifications: { a: '1' } },
          { locale: 'zh', name: '中', shortDescription: 'x', longDescription: 'x', seoTitle: null, seoDescription: null, seoKeywords: null, specifications: { a: '1' } },
        ],
      }
      mockFindMany.mockResolvedValue([prodWithArEnZh])
      mockCount.mockResolvedValue(1)
      const result = await findProductsWithGaps({ page: 1, limit: 100 })
      expect(result.byGapType.seo).toBe(1)
      expect(result.products[0].missingFields).toContain('seo')
    })

    it('identifies products with description gaps', async () => {
      const prodNoLongDesc = {
        id: 'p1',
        sku: 'SKU-1',
        featuredImage: '/img.jpg',
        galleryImages: ['a', 'b', 'c', 'd'],
        translations: [
          { locale: 'ar', name: 'ا', shortDescription: 'x', longDescription: null, seoTitle: 's', seoDescription: 'd', seoKeywords: 'k', specifications: { a: '1' } },
          { locale: 'en', name: 'E', shortDescription: 'x', longDescription: null, seoTitle: 's', seoDescription: 'd', seoKeywords: 'k', specifications: { a: '1' } },
          { locale: 'zh', name: '中', shortDescription: 'x', longDescription: null, seoTitle: 's', seoDescription: 'd', seoKeywords: 'k', specifications: { a: '1' } },
        ],
      }
      mockFindMany.mockResolvedValue([prodNoLongDesc])
      mockCount.mockResolvedValue(1)
      const result = await findProductsWithGaps({ page: 1, limit: 100 })
      expect(result.byGapType.description).toBe(1)
      expect(result.products[0].missingFields).toContain('description')
    })

    it('identifies products with photo gaps', async () => {
      const prodFewImages = {
        id: 'p1',
        sku: 'SKU-1',
        featuredImage: '/img.jpg',
        galleryImages: ['a'],
        translations: fullProduct.translations,
      }
      mockFindMany.mockResolvedValue([prodFewImages])
      mockCount.mockResolvedValue(1)
      const result = await findProductsWithGaps({ page: 1, limit: 100 })
      expect(result.byGapType.photos).toBe(1)
      expect(result.products[0].missingFields).toContain('photos')
    })

    it('identifies products with specs gaps', async () => {
      const prodLowSpecs = {
        id: 'p1',
        sku: 'SKU-1',
        featuredImage: '/img.jpg',
        galleryImages: ['a', 'b', 'c', 'd'],
        translations: [
          {
            locale: 'ar',
            name: 'ا',
            shortDescription: 'x',
            longDescription: 'x',
            seoTitle: 's',
            seoDescription: 'd',
            seoKeywords: 'k',
            specifications: {
              groups: [{
                specs: [
                  { key: 'a', label: 'A', value: 'valid' },
                  { key: 'b', label: 'B', value: 'unknown' },
                  { key: 'c', label: 'C', value: 'n/a' },
                ],
              }],
            },
          },
          { locale: 'en', name: 'E', shortDescription: 'x', longDescription: 'x', seoTitle: 's', seoDescription: 'd', seoKeywords: 'k', specifications: { groups: [{ specs: [{ key: 'a', label: 'A', value: 'x' }, { key: 'b', label: 'B', value: 'unknown' }, { key: 'c', label: 'C', value: '' }] }] } },
          { locale: 'zh', name: '中', shortDescription: 'x', longDescription: 'x', seoTitle: 's', seoDescription: 'd', seoKeywords: 'k', specifications: { groups: [{ specs: [{ key: 'a', label: 'A', value: 'x' }, { key: 'b', label: 'B', value: 'n/a' }, { key: 'c', label: 'C', value: ' ' }] }] } },
        ],
      }
      mockFindMany.mockResolvedValue([prodLowSpecs])
      mockCount.mockResolvedValue(1)
      const result = await findProductsWithGaps({ page: 1, limit: 100 })
      expect(result.byGapType.specs).toBe(1)
      expect(result.products[0].missingFields).toContain('specs')
    })

    it('uses en name then first translation name then sku then id', async () => {
      mockFindMany.mockResolvedValue([
        {
          id: 'p1',
          sku: 'SKU-X',
          featuredImage: null,
          galleryImages: [],
          translations: [
            { locale: 'ar', name: 'عربي', shortDescription: null, longDescription: null, seoTitle: null, seoDescription: null, seoKeywords: null, specifications: null },
            { locale: 'en', name: 'English Name', shortDescription: null, longDescription: null, seoTitle: null, seoDescription: null, seoKeywords: null, specifications: null },
          ],
        },
      ])
      mockCount.mockResolvedValue(1)
      const result = await findProductsWithGaps({ page: 1, limit: 100 })
      expect(result.products[0].name).toBe('English Name')
    })

    it('falls back to sku when no translations have name', async () => {
      mockFindMany.mockResolvedValue([
        {
          id: 'p1',
          sku: 'SKU-FALLBACK',
          featuredImage: null,
          galleryImages: [],
          translations: [
            { locale: 'en', name: null, shortDescription: null, longDescription: null, seoTitle: null, seoDescription: null, seoKeywords: null, specifications: null },
          ],
        },
      ])
      mockCount.mockResolvedValue(1)
      const result = await findProductsWithGaps({ page: 1, limit: 100 })
      expect(result.products[0].name).toBe('SKU-FALLBACK')
    })

    it('uses first translation name when no en locale', async () => {
      mockFindMany.mockResolvedValue([
        {
          id: 'p1',
          sku: null,
          featuredImage: null,
          galleryImages: [],
          translations: [
            { locale: 'ar', name: 'الاسم العربي', shortDescription: null, longDescription: null, seoTitle: null, seoDescription: null, seoKeywords: null, specifications: null },
          ],
        },
      ])
      mockCount.mockResolvedValue(1)
      const result = await findProductsWithGaps({ page: 1, limit: 100 })
      expect(result.products[0].name).toBe('الاسم العربي')
    })
  })

  describe('getProductIdsWithGaps', () => {
    it('returns array of product ids with gaps', async () => {
      mockFindMany
        .mockResolvedValueOnce([
          {
            id: 'p1',
            featuredImage: null,
            galleryImages: [],
            priceDaily: 100,
            contentScore: 50,
            translations: [
              { locale: 'en', name: 'x', shortDescription: null, longDescription: null, seoTitle: null, seoDescription: null, seoKeywords: null, specifications: null },
            ],
          },
        ])
        .mockResolvedValueOnce([])
      const result = await getProductIdsWithGaps()
      expect(result).toEqual(['p1'])
    })

    it('uses cursor pagination for multiple batches', async () => {
      const batch1 = Array.from({ length: 100 }, (_, i) => ({
        id: `p${i}`,
        featuredImage: null,
        galleryImages: [],
        priceDaily: 100,
        contentScore: 50,
        translations: [{ locale: 'en', name: 'x', shortDescription: null, longDescription: null, seoTitle: null, seoDescription: null, seoKeywords: null, specifications: null }],
      }))
      const batch2 = [{ id: 'p100', featuredImage: null, galleryImages: [], priceDaily: 100, contentScore: 50, translations: [{ locale: 'en', name: 'x', shortDescription: null, longDescription: null, seoTitle: null, seoDescription: null, seoKeywords: null, specifications: null }] }]
      mockFindMany.mockResolvedValueOnce(batch1).mockResolvedValueOnce(batch2).mockResolvedValue([])
      const result = await getProductIdsWithGaps()
      expect(result.length).toBeGreaterThan(0)
      expect(mockFindMany).toHaveBeenCalledTimes(2)
    })

    it('filters by minQualityScore when provided', async () => {
      const gapProduct = {
        id: 'p1',
        featuredImage: null,
        galleryImages: [],
        priceDaily: 100,
        contentScore: 30,
        translations: [{ locale: 'en', name: 'x', shortDescription: null, longDescription: null, seoTitle: null, seoDescription: null, seoKeywords: null, specifications: null }],
      }
      mockFindMany.mockResolvedValueOnce([gapProduct]).mockResolvedValue([])
      const result = await getProductIdsWithGaps({ minQualityScore: 50 })
      expect(result).toContain('p1')
    })

    it('excludes products with contentScore >= minQualityScore', async () => {
      const p1 = { id: 'p1', featuredImage: null, galleryImages: [], priceDaily: 100, contentScore: 30, translations: [{ locale: 'en', name: 'x', shortDescription: null, longDescription: null, seoTitle: null, seoDescription: null, seoKeywords: null, specifications: null }] }
      const p2 = { id: 'p2', featuredImage: null, galleryImages: [], priceDaily: 100, contentScore: 80, translations: [{ locale: 'en', name: 'x', shortDescription: null, longDescription: null, seoTitle: null, seoDescription: null, seoKeywords: null, specifications: null }] }
      mockFindMany.mockResolvedValueOnce([p1, p2]).mockResolvedValue([])
      const result = await getProductIdsWithGaps({ minQualityScore: 50 })
      expect(result).toContain('p1')
      expect(result).not.toContain('p2')
    })

    it('sorts by price when revenueWeighted true', async () => {
      const pLow = { id: 'p-low', featuredImage: null, galleryImages: [], priceDaily: 10, contentScore: 30, translations: [{ locale: 'en', name: 'x', shortDescription: null, longDescription: null, seoTitle: null, seoDescription: null, seoKeywords: null, specifications: null }] }
      const pHigh = { id: 'p-high', featuredImage: null, galleryImages: [], priceDaily: 500, contentScore: 30, translations: [{ locale: 'en', name: 'x', shortDescription: null, longDescription: null, seoTitle: null, seoDescription: null, seoKeywords: null, specifications: null }] }
      mockFindMany.mockResolvedValueOnce([pLow, pHigh]).mockResolvedValue([])
      const result = await getProductIdsWithGaps({ revenueWeighted: true })
      expect(result).toHaveLength(2)
      expect(result[0]).toBe('p-high')
      expect(result[1]).toBe('p-low')
    })

    it('returns empty when no products have gaps', async () => {
      const completeProduct = {
        id: 'p1',
        featuredImage: '/img.jpg',
        galleryImages: ['a', 'b', 'c', 'd'],
        priceDaily: 100,
        contentScore: 100,
        translations: [
          { locale: 'ar', name: 'ا', shortDescription: 'x', longDescription: 'x', seoTitle: 's', seoDescription: 'd', seoKeywords: 'k', specifications: { a: '1', b: '2' } },
          { locale: 'en', name: 'E', shortDescription: 'x', longDescription: 'x', seoTitle: 's', seoDescription: 'd', seoKeywords: 'k', specifications: { a: '1', b: '2' } },
          { locale: 'zh', name: '中', shortDescription: 'x', longDescription: 'x', seoTitle: 's', seoDescription: 'd', seoKeywords: 'k', specifications: { a: '1', b: '2' } },
        ],
      }
      mockFindMany.mockResolvedValueOnce([completeProduct]).mockResolvedValue([])
      const result = await getProductIdsWithGaps()
      expect(result).toEqual([])
    })

    it('uses cursor when fetching second batch', async () => {
      const batch1 = Array.from({ length: 100 }, (_, i) => ({
        id: `p${i}`,
        featuredImage: null,
        galleryImages: [],
        priceDaily: 100,
        contentScore: 50,
        translations: [{ locale: 'en', name: 'x', shortDescription: null, longDescription: null, seoTitle: null, seoDescription: null, seoKeywords: null, specifications: null }],
      }))
      mockFindMany.mockResolvedValueOnce(batch1).mockResolvedValueOnce([{ id: 'p100', featuredImage: null, galleryImages: [], priceDaily: null, contentScore: 50, translations: [{ locale: 'en', name: 'x', shortDescription: null, longDescription: null, seoTitle: null, seoDescription: null, seoKeywords: null, specifications: null }] }]).mockResolvedValue([])
      const result = await getProductIdsWithGaps()
      expect(mockFindMany).toHaveBeenNthCalledWith(2, expect.objectContaining({ skip: 1, cursor: { id: 'p99' } }))
      expect(result).toContain('p100')
    })

    it('skips revenueWeighted sort when withGaps empty', async () => {
      mockFindMany.mockResolvedValueOnce([
        {
          id: 'p1',
          featuredImage: '/img.jpg',
          galleryImages: ['a', 'b', 'c', 'd'],
          priceDaily: 100,
          contentScore: 100,
          translations: [
            { locale: 'ar', name: 'ا', shortDescription: 'x', longDescription: 'x', seoTitle: 's', seoDescription: 'd', seoKeywords: 'k', specifications: { a: '1', b: '2' } },
            { locale: 'en', name: 'E', shortDescription: 'x', longDescription: 'x', seoTitle: 's', seoDescription: 'd', seoKeywords: 'k', specifications: { a: '1', b: '2' } },
            { locale: 'zh', name: '中', shortDescription: 'x', longDescription: 'x', seoTitle: 's', seoDescription: 'd', seoKeywords: 'k', specifications: { a: '1', b: '2' } },
          ],
        },
      ]).mockResolvedValue([])
      const result = await getProductIdsWithGaps({ revenueWeighted: true })
      expect(result).toEqual([])
    })

    it('hasContentGap returns true for product with only seo gap', async () => {
      const prodSeoGap = {
        id: 'p-seo',
        featuredImage: '/img.jpg',
        galleryImages: ['a', 'b', 'c', 'd'],
        priceDaily: 100,
        contentScore: 50,
        translations: [
          { locale: 'ar', name: 'ا', shortDescription: 'x', longDescription: 'x', seoTitle: null, seoDescription: null, seoKeywords: null, specifications: { a: '1', b: '2' } },
          { locale: 'en', name: 'E', shortDescription: 'x', longDescription: 'x', seoTitle: null, seoDescription: null, seoKeywords: null, specifications: { a: '1', b: '2' } },
          { locale: 'zh', name: '中', shortDescription: 'x', longDescription: 'x', seoTitle: null, seoDescription: null, seoKeywords: null, specifications: { a: '1', b: '2' } },
        ],
      }
      mockFindMany.mockResolvedValueOnce([prodSeoGap]).mockResolvedValue([])
      const result = await getProductIdsWithGaps()
      expect(result).toContain('p-seo')
    })

    it('hasContentGap returns true for product with only description gap', async () => {
      const prodDescGap = {
        id: 'p-desc',
        featuredImage: '/img.jpg',
        galleryImages: ['a', 'b', 'c', 'd'],
        priceDaily: 100,
        contentScore: 50,
        translations: [
          { locale: 'ar', name: 'ا', shortDescription: 'short', longDescription: null, seoTitle: 's', seoDescription: 'd', seoKeywords: 'k', specifications: { a: '1', b: '2' } },
          { locale: 'en', name: 'E', shortDescription: 'short', longDescription: null, seoTitle: 's', seoDescription: 'd', seoKeywords: 'k', specifications: { a: '1', b: '2' } },
          { locale: 'zh', name: '中', shortDescription: 'short', longDescription: null, seoTitle: 's', seoDescription: 'd', seoKeywords: 'k', specifications: { a: '1', b: '2' } },
        ],
      }
      mockFindMany.mockResolvedValueOnce([prodDescGap]).mockResolvedValue([])
      const result = await getProductIdsWithGaps()
      expect(result).toContain('p-desc')
    })

    it('hasContentGap returns true for product with only photos gap', async () => {
      const prodPhotosGap = {
        id: 'p-photos',
        featuredImage: null,
        galleryImages: ['a'],
        priceDaily: 100,
        contentScore: 50,
        translations: [
          { locale: 'ar', name: 'ا', shortDescription: 'x', longDescription: 'x', seoTitle: 's', seoDescription: 'd', seoKeywords: 'k', specifications: { a: '1', b: '2' } },
          { locale: 'en', name: 'E', shortDescription: 'x', longDescription: 'x', seoTitle: 's', seoDescription: 'd', seoKeywords: 'k', specifications: { a: '1', b: '2' } },
          { locale: 'zh', name: '中', shortDescription: 'x', longDescription: 'x', seoTitle: 's', seoDescription: 'd', seoKeywords: 'k', specifications: { a: '1', b: '2' } },
        ],
      }
      mockFindMany.mockResolvedValueOnce([prodPhotosGap]).mockResolvedValue([])
      const result = await getProductIdsWithGaps()
      expect(result).toContain('p-photos')
    })

    it('hasContentGap returns true for product with only specs gap', async () => {
      const prodSpecsGap = {
        id: 'p-specs',
        featuredImage: '/img.jpg',
        galleryImages: ['a', 'b', 'c', 'd'],
        priceDaily: 100,
        contentScore: 50,
        translations: [
          { locale: 'ar', name: 'ا', shortDescription: 'x', longDescription: 'x', seoTitle: 's', seoDescription: 'd', seoKeywords: 'k', specifications: { groups: [{ specs: [{ key: 'a', label: 'A', value: 'x' }, { key: 'b', label: 'B', value: 'unknown' }, { key: 'c', label: 'C', value: 'n/a' }] }] } },
          { locale: 'en', name: 'E', shortDescription: 'x', longDescription: 'x', seoTitle: 's', seoDescription: 'd', seoKeywords: 'k', specifications: { groups: [{ specs: [{ key: 'a', label: 'A', value: 'x' }, { key: 'b', label: 'B', value: 'n/a' }] }] } },
          { locale: 'zh', name: '中', shortDescription: 'x', longDescription: 'x', seoTitle: 's', seoDescription: 'd', seoKeywords: 'k', specifications: { groups: [{ specs: [{ key: 'a', label: 'A', value: 'x' }, { key: 'b', label: 'B', value: '' }] }] } },
        ],
      }
      mockFindMany.mockResolvedValueOnce([prodSpecsGap]).mockResolvedValue([])
      const result = await getProductIdsWithGaps()
      expect(result).toContain('p-specs')
    })

    it('uses product id when no en name first name or sku', async () => {
      mockFindMany.mockResolvedValueOnce([
        {
          id: 'fallback-id',
          sku: null,
          featuredImage: null,
          galleryImages: [],
          translations: [{ locale: 'ar', name: null, shortDescription: null, longDescription: null, seoTitle: null, seoDescription: null, seoKeywords: null, specifications: null }],
        },
      ]).mockResolvedValue([])
      mockCount.mockResolvedValue(1)
      const result = await findProductsWithGaps({ page: 1, limit: 100 })
      expect(result.products[0].name).toBe('fallback-id')
    })

    it('uses priceDaily 0 when null for revenueWeighted sort', async () => {
      const p1 = { id: 'p1', featuredImage: null, galleryImages: [], priceDaily: null, contentScore: 30, translations: [{ locale: 'en', name: 'x', shortDescription: null, longDescription: null, seoTitle: null, seoDescription: null, seoKeywords: null, specifications: null }] }
      const p2 = { id: 'p2', featuredImage: null, galleryImages: [], priceDaily: 50, contentScore: 30, translations: [{ locale: 'en', name: 'x', shortDescription: null, longDescription: null, seoTitle: null, seoDescription: null, seoKeywords: null, specifications: null }] }
      mockFindMany.mockResolvedValueOnce([p1, p2]).mockResolvedValue([])
      const result = await getProductIdsWithGaps({ revenueWeighted: true })
      expect(result[0]).toBe('p2')
      expect(result[1]).toBe('p1')
    })

    it('handles both products with null priceDaily in sort', async () => {
      const p1 = { id: 'p1', featuredImage: null, galleryImages: [], priceDaily: null, contentScore: 30, translations: [{ locale: 'en', name: 'x', shortDescription: null, longDescription: null, seoTitle: null, seoDescription: null, seoKeywords: null, specifications: null }] }
      const p2 = { id: 'p2', featuredImage: null, galleryImages: [], priceDaily: null, contentScore: 30, translations: [{ locale: 'en', name: 'x', shortDescription: null, longDescription: null, seoTitle: null, seoDescription: null, seoKeywords: null, specifications: null }] }
      mockFindMany.mockResolvedValueOnce([p1, p2]).mockResolvedValue([])
      const result = await getProductIdsWithGaps({ revenueWeighted: true })
      expect(result).toHaveLength(2)
    })
  })
})
