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

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('content-health.service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('calculateQualityScore', () => {
    it('returns 0 when product not found', async () => {
      ;(mockPrisma.product.findUnique as jest.Mock).mockResolvedValue(null)
      const result = await calculateQualityScore('missing-id')
      expect(result).toBe(0)
    })

    it('returns score 0-100 for product with translations', async () => {
      ;(mockPrisma.product.findUnique as jest.Mock).mockResolvedValue({
        id: 'p1',
        deletedAt: null,
        featuredImage: 'https://example.com/1.jpg',
        galleryImages: ['a', 'b', 'c', 'd'],
        translations: [
          {
            locale: 'ar',
            name: 'اسم',
            shortDescription: 'وصف قصير',
            longDescription: 'وصف طويل جداً جداً',
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
      } as any)
      const result = await calculateQualityScore('p1')
      expect(result).toBeGreaterThanOrEqual(0)
      expect(result).toBeLessThanOrEqual(100)
    })
  })

  describe('findProductsWithGaps', () => {
    it('returns report with total, byGapType, products', async () => {
      ;(mockPrisma.product.findMany as jest.Mock).mockResolvedValue([])
      ;(mockPrisma.product.count as jest.Mock).mockResolvedValue(0)
      const result = await findProductsWithGaps({ page: 1, limit: 20 })
      expect(result).toHaveProperty('total')
      expect(result).toHaveProperty('byGapType')
      expect(result).toHaveProperty('products')
      expect(result.byGapType).toMatchObject({
        translations: expect.any(Number),
        seo: expect.any(Number),
        description: expect.any(Number),
        photos: expect.any(Number),
        specs: expect.any(Number),
      })
    })
  })

  describe('getProductIdsWithGaps', () => {
    it('returns array of product ids in batches', async () => {
      ;(mockPrisma.product.findMany as jest.Mock)
        .mockResolvedValueOnce([
          {
            id: 'p1',
            featuredImage: null,
            galleryImages: [],
            translations: [
              {
                locale: 'en',
                name: 'x',
                shortDescription: null,
                longDescription: null,
                seoTitle: null,
                seoDescription: null,
                seoKeywords: null,
                specifications: null,
              },
            ],
          } as any,
        ])
        .mockResolvedValueOnce([])
      const result = await getProductIdsWithGaps()
      expect(Array.isArray(result)).toBe(true)
    })
  })
})
