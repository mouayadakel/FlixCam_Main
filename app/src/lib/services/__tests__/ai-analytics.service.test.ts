/**
 * Unit tests for ai-analytics.service
 * PATHS: getProviderStats (success per provider, catch → zeros); getDailyCostBreakdown (success, catch → []); selectBestProvider (scores, insufficient data, catch → default gemini)
 */

import { getProviderStats, getDailyCostBreakdown, selectBestProvider } from '../ai-analytics.service'
import { prisma } from '@/lib/db/prisma'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    aiFeedback: { count: jest.fn() },
    aIProcessingJob: { findMany: jest.fn() },
  },
}))

const mockAiFeedbackCount = prisma.aiFeedback.count as jest.Mock
const mockJobFindMany = prisma.aIProcessingJob.findMany as jest.Mock

describe('ai-analytics.service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getProviderStats', () => {
    it('returns stats for each provider with correct shape when data exists', async () => {
      mockAiFeedbackCount
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(80)
        .mockResolvedValueOnce(50)
        .mockResolvedValueOnce(40)
      mockJobFindMany
        .mockResolvedValueOnce([
          { cost: 0.1, startedAt: new Date(), completedAt: new Date(), failedItems: 0, totalItems: 10 },
        ])
        .mockResolvedValueOnce([
          { cost: 0.2, startedAt: new Date(), completedAt: new Date(), failedItems: 1, totalItems: 10 },
        ])
      const result = await getProviderStats()
      expect(Array.isArray(result)).toBe(true)
      expect(result.length).toBe(2)
      expect(result[0]).toMatchObject({
        provider: expect.any(String),
        totalJobs: expect.any(Number),
        avgCost: expect.any(Number),
        totalCost: expect.any(Number),
        approvalRate: expect.any(Number),
        avgProcessingTime: expect.any(Number),
        errorRate: expect.any(Number),
      })
    })

    it('pushes zero stats for a provider when prisma throws', async () => {
      mockAiFeedbackCount.mockRejectedValueOnce(new Error('DB'))
      mockJobFindMany.mockResolvedValue([])
      const result = await getProviderStats()
      expect(result.some((s) => s.provider === 'gemini' && s.totalJobs === 0)).toBe(true)
    })
  })

  describe('getDailyCostBreakdown', () => {
    it('returns sorted CostBreakdown array when jobs exist', async () => {
      mockJobFindMany.mockResolvedValue([
        { createdAt: new Date('2026-02-01T12:00:00Z'), provider: 'gemini', cost: 1.5 },
        { createdAt: new Date('2026-02-01T14:00:00Z'), provider: 'gemini', cost: 0.5 },
      ])
      const result = await getDailyCostBreakdown(7)
      expect(Array.isArray(result)).toBe(true)
      if (result.length > 0) {
        expect(result[0]).toMatchObject({ date: expect.any(String), provider: 'gemini', cost: expect.any(Number), jobCount: expect.any(Number) })
      }
    })

    it('returns empty array when prisma throws', async () => {
      mockJobFindMany.mockRejectedValue(new Error('DB'))
      const result = await getDailyCostBreakdown(30)
      expect(result).toEqual([])
    })
  })

  describe('selectBestProvider', () => {
    it('returns provider and reason when enough feedback', async () => {
      mockAiFeedbackCount
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(8)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(5)
      const result = await selectBestProvider('product', 'cat-1')
      expect(result).toMatchObject({ provider: expect.any(String), reason: expect.any(String) })
    })

    it('returns default gemini when prisma throws', async () => {
      mockAiFeedbackCount.mockRejectedValue(new Error('DB'))
      const result = await selectBestProvider('product')
      expect(result).toEqual({ provider: 'gemini', reason: 'Default provider (analytics unavailable)' })
    })

    it('returns insufficient data when both providers have total feedback < 5', async () => {
      mockAiFeedbackCount
        .mockResolvedValueOnce(3)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(1)
      const result = await selectBestProvider('product')
      expect(result).toMatchObject({ provider: expect.any(String), reason: expect.any(String) })
      expect(result.reason).toContain('Insufficient data')
    })
  })
})
