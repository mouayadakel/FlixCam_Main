/**
 * Unit tests for policy.service
 */
import { PolicyService } from '../policy.service'
import { prisma } from '@/lib/db/prisma'
import * as cache from '@/lib/cache'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    policyItem: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  },
}))
jest.mock('@/lib/cache', () => ({
  cacheGet: jest.fn(),
  cacheSet: jest.fn(),
  cacheDelete: jest.fn(),
}))

const mockFindMany = prisma.policyItem.findMany as jest.Mock
const mockCacheGet = cache.cacheGet as jest.Mock
const mockCacheSet = cache.cacheSet as jest.Mock

describe('PolicyService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getPublicPolicies', () => {
    it('returns cached result when cache hit', async () => {
      const cached = [
        { id: 'p1', titleAr: 'ع', titleEn: 'Policy', titleZh: null, bodyAr: 'ب', bodyEn: 'Body', bodyZh: null, order: 0 },
      ]
      mockCacheGet.mockResolvedValue(cached)
      const result = await PolicyService.getPublicPolicies()
      expect(result).toEqual(cached)
      expect(mockFindMany).not.toHaveBeenCalled()
    })

    it('fetches from db and caches when cache miss', async () => {
      mockCacheGet.mockResolvedValue(null)
      const dbItems = [
        {
          id: 'p1',
          titleAr: 'ع',
          titleEn: 'Policy',
          titleZh: null,
          bodyAr: 'ب',
          bodyEn: 'Body',
          bodyZh: null,
          order: 0,
        },
      ]
      mockFindMany.mockResolvedValue(dbItems)
      const result = await PolicyService.getPublicPolicies()
      expect(mockFindMany).toHaveBeenCalledWith({
        where: { isActive: true, deletedAt: null },
        orderBy: { order: 'asc' },
        select: expect.any(Object),
      })
      expect(mockCacheSet).toHaveBeenCalled()
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('p1')
    })
  })
})
