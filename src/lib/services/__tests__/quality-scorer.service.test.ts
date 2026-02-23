/**
 * Unit tests for quality-scorer.service
 */

import { scoreProduct, getCachedScan } from '../quality-scorer.service'
import { prisma } from '@/lib/db/prisma'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    product: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  },
}))

jest.mock('@/lib/queue/redis.client', () => ({
  getRedisClient: jest.fn(() => null),
}))

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('quality-scorer.service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
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
  })

  describe('getCachedScan', () => {
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
      ])
      const result = await getCachedScan()
      expect(result).toHaveProperty('products')
      expect(result).toHaveProperty('totalProducts')
      expect(result).toHaveProperty('catalogQualityScore')
      expect(result).toHaveProperty('byGapType')
      expect(result).toHaveProperty('cached')
      expect(Array.isArray(result.products)).toBe(true)
    })
  })
})
