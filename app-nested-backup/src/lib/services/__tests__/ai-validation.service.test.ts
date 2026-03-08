/**
 * Unit tests for ai-validation.service
 * PATHS: validateAiFill (not found → score 0; found → checks, score); schedulePartialRefill; validateAndRetry; validateAllProducts
 */

import {
  validateAiFill,
  schedulePartialRefill,
  validateAndRetry,
  validateAllProducts,
} from '../ai-validation.service'
import { prisma } from '@/lib/db/prisma'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    product: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    importJob: {
      findFirst: jest.fn(),
    },
  },
}))

jest.mock('@/lib/queue/ai-processing.queue', () => ({
  addAIProcessingJob: jest.fn().mockResolvedValue(undefined),
}))

const mockFindUnique = prisma.product.findUnique as jest.Mock
const mockFindMany = prisma.product.findMany as jest.Mock
const mockUpdate = prisma.product.update as jest.Mock
const mockImportJobFindFirst = prisma.importJob.findFirst as jest.Mock

function makeProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: 'p1',
    sku: 'SKU1',
    tags: 'tag1,tag2,tag3,tag4,tag5,tag6,tag7,tag8,tag9,tag10',
    featuredImage: '/images/real.jpg',
    brandId: 'brand1',
    translations: [
      {
        locale: 'en',
        name: 'Camera',
        shortDescription: 'x'.repeat(25),
        longDescription: 'x'.repeat(160),
        seoTitle: 'x'.repeat(50),
        seoDescription: 'x'.repeat(150),
        seoKeywords: 'key1, key2, key3, key4',
        specifications: { a: 1, b: 2, c: 3 },
      },
      {
        locale: 'ar',
        name: 'كاميرا',
        shortDescription: 'x'.repeat(15),
        longDescription: 'x'.repeat(110),
        seoTitle: 'x'.repeat(15),
      },
      {
        locale: 'zh',
        name: '相机',
        shortDescription: 'xxxxx',
        longDescription: 'x'.repeat(100),
      },
    ],
    brand: {},
    category: {},
    ...overrides,
  }
}

describe('ai-validation.service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('validateAiFill', () => {
    it('returns not found report when product is null', async () => {
      mockFindUnique.mockResolvedValue(null)
      const result = await validateAiFill('missing-id')
      expect(result).toMatchObject({
        productId: 'missing-id',
        productName: 'Not found',
        score: 0,
        issues: ['Product not found'],
        passCount: 0,
        totalChecks: 0,
      })
    })

    it('returns report with checks and score when product exists', async () => {
      mockFindUnique.mockResolvedValue(makeProduct())
      const result = await validateAiFill('p1')
      expect(result.productId).toBe('p1')
      expect(result.checks.length).toBeGreaterThan(0)
      expect(typeof result.score).toBe('number')
      expect(result.passCount).toBeGreaterThanOrEqual(0)
      expect(result.totalChecks).toBeGreaterThan(0)
    })

    it('flags missing and too_short for checkString', async () => {
      mockFindUnique.mockResolvedValue(
        makeProduct({
          translations: [
            {
              locale: 'en',
              name: 'Cam',
              shortDescription: '',
              longDescription: 'short',
              seoTitle: null,
              seoDescription: null,
              seoKeywords: null,
              specifications: {},
            },
            { locale: 'ar', name: '', shortDescription: '', longDescription: '', seoTitle: '' },
            { locale: 'zh', name: 'x', shortDescription: '', longDescription: '' },
          ],
          tags: null,
          featuredImage: null,
          brandId: null,
        })
      )
      const result = await validateAiFill('p1')
      expect(result.checks.some((c) => c.status === 'missing')).toBe(true)
      expect(result.checks.some((c) => c.status === 'too_short')).toBe(true)
    })

    it('flags too_long for checkString', async () => {
      mockFindUnique.mockResolvedValue(
        makeProduct({
          translations: [
            {
              locale: 'en',
              name: 'Camera',
              shortDescription: 'x'.repeat(25),
              longDescription: 'x'.repeat(160),
              seoTitle: 'x'.repeat(100),
              seoDescription: 'x'.repeat(200),
              seoKeywords: 'x'.repeat(20),
              specifications: { a: 1, b: 2, c: 3 },
            },
            { locale: 'ar', name: 'كاميرا', shortDescription: 'x'.repeat(15), longDescription: 'x'.repeat(110), seoTitle: 'x'.repeat(15) },
            { locale: 'zh', name: '相机', shortDescription: 'xxxxx', longDescription: 'x'.repeat(100) },
          ],
        })
      )
      const result = await validateAiFill('p1')
      expect(result.checks.some((c) => c.status === 'too_long')).toBe(true)
    })

    it('flags placeholder for featured_image', async () => {
      mockFindUnique.mockResolvedValue(
        makeProduct({ featuredImage: '/images/placeholder.jpg' })
      )
      const result = await validateAiFill('p1')
      expect(result.checks.some((c) => c.field === 'featured_image' && c.status === 'placeholder')).toBe(true)
    })

    it('flags specifications too_few and missing', async () => {
      mockFindUnique.mockResolvedValue(
        makeProduct({
          translations: [
            { locale: 'en', name: 'Cam', shortDescription: 'x'.repeat(25), longDescription: 'x'.repeat(160), seoTitle: 'x'.repeat(50), seoDescription: 'x'.repeat(150), seoKeywords: 'k1,k2,k3,k4,k5', specifications: {} },
            { locale: 'ar', name: 'كاميرا', shortDescription: 'x'.repeat(15), longDescription: 'x'.repeat(110), seoTitle: 'x'.repeat(15) },
            { locale: 'zh', name: '相机', shortDescription: 'xxxxx', longDescription: 'x'.repeat(100) },
          ],
        })
      )
      const result = await validateAiFill('p1')
      const specCheck = result.checks.find((c) => c.field === 'specifications')
      expect(specCheck?.status).toBe('missing')
    })

    it('flags tags too_few and missing', async () => {
      mockFindUnique.mockResolvedValue(
        makeProduct({ tags: 'a,b' })
      )
      const result = await validateAiFill('p1')
      const tagCheck = result.checks.find((c) => c.field === 'tags')
      expect(['too_few', 'missing']).toContain(tagCheck?.status)
    })

    it('uses product.sku when en name is missing', async () => {
      mockFindUnique.mockResolvedValue(
        makeProduct({
          translations: [
            { locale: 'en', name: null, shortDescription: 'x'.repeat(25), longDescription: 'x'.repeat(160), seoTitle: 'x'.repeat(50), seoDescription: 'x'.repeat(150), seoKeywords: 'k1,k2,k3,k4,k5', specifications: { a: 1, b: 2, c: 3 } },
            { locale: 'ar', name: 'كاميرا', shortDescription: 'x'.repeat(15), longDescription: 'x'.repeat(110), seoTitle: 'x'.repeat(15) },
            { locale: 'zh', name: '相机', shortDescription: 'xxxxx', longDescription: 'x'.repeat(100) },
          ],
        })
      )
      const result = await validateAiFill('p1')
      expect(result.productName).toBe('SKU1')
    })

    it('computes score 0 when totalChecks is 0', async () => {
      mockFindUnique.mockResolvedValue(null)
      const result = await validateAiFill('x')
      expect(result.score).toBe(0)
      expect(result.totalChecks).toBe(0)
    })
  })

  describe('schedulePartialRefill', () => {
    it('returns false when product not found', async () => {
      mockFindUnique.mockResolvedValue(null)
      const result = await schedulePartialRefill('missing', ['issue1'])
      expect(result).toBe(false)
      expect(mockUpdate).not.toHaveBeenCalled()
    })

    it('updates product and queues job when importJob exists', async () => {
      mockFindUnique.mockResolvedValue({ id: 'p1' })
      mockImportJobFindFirst.mockResolvedValue({ id: 'job1' })
      mockUpdate.mockResolvedValue({})
      const { addAIProcessingJob } = await import('@/lib/queue/ai-processing.queue')
      const result = await schedulePartialRefill('p1', ['issue1', 'issue2'])
      expect(result).toBe(true)
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: expect.objectContaining({
          needsAiReview: true,
          aiReviewReason: expect.stringContaining('Validation failed'),
        }),
      })
      expect(addAIProcessingJob).toHaveBeenCalledWith('job1', ['p1'])
    })

    it('returns false when no importJob found', async () => {
      mockFindUnique.mockResolvedValue({ id: 'p1' })
      mockImportJobFindFirst.mockResolvedValue(null)
      mockUpdate.mockResolvedValue({})
      const result = await schedulePartialRefill('p1', ['issue1'])
      expect(result).toBe(false)
    })

    it('returns false and logs when addAIProcessingJob throws', async () => {
      mockFindUnique.mockResolvedValue({ id: 'p1' })
      mockImportJobFindFirst.mockResolvedValue({ id: 'job1' })
      mockUpdate.mockResolvedValue({})
      const { addAIProcessingJob } = await import('@/lib/queue/ai-processing.queue')
      ;(addAIProcessingJob as jest.Mock).mockRejectedValueOnce(new Error('Queue error'))
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation()
      const result = await schedulePartialRefill('p1', ['issue1'])
      expect(result).toBe(false)
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Could not queue partial refill'),
        expect.any(String)
      )
      warnSpy.mockRestore()
    })
  })

  describe('validateAndRetry', () => {
    it('schedules refill when score below threshold and aiRunCount < 3', async () => {
      mockFindUnique
        .mockResolvedValueOnce(
          makeProduct({
            translations: [
              { locale: 'en', name: 'Cam', shortDescription: 'x', longDescription: 'x', seoTitle: '', seoDescription: '', seoKeywords: '', specifications: {} },
              { locale: 'ar', name: '', shortDescription: '', longDescription: '', seoTitle: '' },
              { locale: 'zh', name: '', shortDescription: '', longDescription: '' },
            ],
            tags: '',
            featuredImage: null,
            brandId: null,
          })
        )
        .mockResolvedValueOnce({ aiRunCount: 1 })
      mockImportJobFindFirst.mockResolvedValue({ id: 'job1' })
      mockUpdate.mockResolvedValue({})
      const result = await validateAndRetry('p1', 80)
      expect(result.score).toBeLessThan(80)
      expect(mockUpdate).toHaveBeenCalled()
    })

    it('does not schedule refill when aiRunCount >= 3', async () => {
      mockFindUnique
        .mockResolvedValueOnce(
          makeProduct({
            translations: [
              { locale: 'en', name: 'Cam', shortDescription: 'x', longDescription: 'x', seoTitle: '', seoDescription: '', seoKeywords: '', specifications: {} },
              { locale: 'ar', name: '', shortDescription: '', longDescription: '', seoTitle: '' },
              { locale: 'zh', name: '', shortDescription: '', longDescription: '' },
            ],
            tags: '',
            featuredImage: null,
            brandId: null,
          })
        )
        .mockResolvedValueOnce({ aiRunCount: 3 })
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation()
      const result = await validateAndRetry('p1', 80)
      expect(result.score).toBeLessThan(80)
      expect(mockUpdate).not.toHaveBeenCalled()
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('max retries reached')
      )
      warnSpy.mockRestore()
    })

    it('returns report without scheduling when score above threshold', async () => {
      mockFindUnique.mockResolvedValue(makeProduct())
      const result = await validateAndRetry('p1', 50)
      expect(result.score).toBeGreaterThanOrEqual(50)
      expect(mockUpdate).not.toHaveBeenCalled()
    })
  })

  describe('validateAllProducts', () => {
    it('returns aggregate stats for products', async () => {
      mockFindMany.mockResolvedValue([{ id: 'p1' }, { id: 'p2' }])
      mockFindUnique
        .mockResolvedValueOnce(makeProduct())
        .mockResolvedValueOnce(
          makeProduct({
            translations: [
              { locale: 'en', name: 'Cam', shortDescription: 'x', longDescription: 'x', seoTitle: '', seoDescription: '', seoKeywords: '', specifications: {} },
              { locale: 'ar', name: '', shortDescription: '', longDescription: '', seoTitle: '' },
              { locale: 'zh', name: '', shortDescription: '', longDescription: '' },
            ],
            tags: '',
            featuredImage: null,
            brandId: null,
          })
        )
      const result = await validateAllProducts({ limit: 10, offset: 0 })
      expect(result.total).toBe(2)
      expect(result.reports).toHaveLength(2)
      expect(result.averageScore).toBeGreaterThanOrEqual(0)
      expect(result.complete + result.partial + result.failed).toBe(2)
    })

    it('returns empty stats when no products', async () => {
      mockFindMany.mockResolvedValue([])
      const result = await validateAllProducts()
      expect(result.total).toBe(0)
      expect(result.reports).toHaveLength(0)
      expect(result.averageScore).toBe(0)
    })
  })
})
