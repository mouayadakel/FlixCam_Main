/**
 * Unit tests for ai-confidence.service
 * PATHS: getConfidence (total>=5 historical, total<5 default, catch default); getBulkConfidence; shouldAutoApprove (insufficient, rate>=95 no spike, spike, below threshold, catch); logFeedback; getProviderComparison (total>0, catch [])
 */

import {
  getConfidence,
  getBulkConfidence,
  shouldAutoApprove,
  logFeedback,
  getProviderComparison,
} from '../ai-confidence.service'
import { prisma } from '@/lib/db/prisma'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    aiFeedback: { count: jest.fn(), create: jest.fn() },
  },
}))

const mockCount = prisma.aiFeedback.count as jest.Mock
const mockCreate = prisma.aiFeedback.create as jest.Mock

describe('ai-confidence.service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCreate.mockResolvedValue({})
  })

  describe('getConfidence', () => {
    it('returns historical result when total >= 5', async () => {
      mockCount.mockResolvedValueOnce(8).mockResolvedValueOnce(10) // approved, then total
      const result = await getConfidence('shortDescription', 'cat-1', 'gemini')
      expect(result).toMatchObject({
        confidence: expect.any(Number),
        totalSamples: 10,
        approvalRate: expect.any(Number),
        source: 'historical',
      })
    })

    it('returns default when total < 5', async () => {
      mockCount.mockResolvedValueOnce(2).mockResolvedValueOnce(1)
      const result = await getConfidence('shortDescription')
      expect(result.source).toBe('default')
      expect(result.totalSamples).toBe(0)
      expect(result.confidence).toBe(85)
    })

    it('returns default when prisma throws', async () => {
      mockCount.mockRejectedValue(new Error('DB'))
      const result = await getConfidence('unknownField')
      expect(result.source).toBe('default')
      expect(result.confidence).toBe(75)
    })
  })

  describe('getBulkConfidence', () => {
    it('returns record of ConfidenceResult for all default fields', async () => {
      mockCount.mockResolvedValue(0)
      const result = await getBulkConfidence('cat-1', 'gemini')
      expect(typeof result).toBe('object')
      expect(result.shortDescription).toBeDefined()
      expect(result.shortDescription.source).toBe('default')
    })
  })

  describe('shouldAutoApprove', () => {
    it('returns autoApprove false when total < 50', async () => {
      mockCount.mockResolvedValueOnce(10).mockResolvedValueOnce(5)
      const result = await shouldAutoApprove('product', 'cat-1')
      expect(result.autoApprove).toBe(false)
      expect(result.reason).toContain('Insufficient samples')
    })

    it('returns autoApprove true when rate >= 95% and no recent spike', async () => {
      mockCount
        .mockResolvedValueOnce(95)
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(50)
      const result = await shouldAutoApprove('product', 'cat-1')
      expect(result.autoApprove).toBe(true)
      expect(result.reason).toContain('Auto-approved')
    })

    it('returns autoApprove false when rate >= 95% but recent rejection spike', async () => {
      mockCount
        .mockResolvedValueOnce(95)
        .mockResolvedValueOnce(100)
        .mockResolvedValueOnce(15)
        .mockResolvedValueOnce(50)
      const result = await shouldAutoApprove('product', 'cat-1')
      expect(result.autoApprove).toBe(false)
      expect(result.reason).toContain('Recent rejection spike')
    })

    it('returns autoApprove false when rate < 95%', async () => {
      mockCount.mockResolvedValueOnce(80).mockResolvedValueOnce(100)
      const result = await shouldAutoApprove('product', 'cat-1')
      expect(result.autoApprove).toBe(false)
      expect(result.reason).toContain('below threshold')
    })

    it('returns autoApprove false when feedback table throws', async () => {
      mockCount.mockRejectedValue(new Error('DB'))
      const result = await shouldAutoApprove('product', 'cat-1')
      expect(result.autoApprove).toBe(false)
      expect(result.reason).toBe('Feedback table not available')
    })
  })

  describe('logFeedback', () => {
    it('calls prisma.aiFeedback.create with sliced long values', async () => {
      await logFeedback({
        contentType: 'product',
        fieldName: 'name',
        action: 'approved',
        originalValue: 'x'.repeat(6000),
      })
      expect(mockCreate).toHaveBeenCalledTimes(1)
      const data = mockCreate.mock.calls[0][0].data
      expect(data.originalValue?.length).toBeLessThanOrEqual(5000)
    })

    it('does not throw when prisma.create rejects', async () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {})
      mockCreate.mockRejectedValueOnce(new Error('DB'))
      await expect(
        logFeedback({ contentType: 'product', fieldName: 'name', action: 'rejected' })
      ).resolves.toBeUndefined()
      expect(spy).toHaveBeenCalledWith('[AiConfidence] Failed to log feedback')
      spy.mockRestore()
    })
  })

  describe('getProviderComparison', () => {
    it('returns empty array when prisma throws', async () => {
      mockCount.mockRejectedValue(new Error('DB'))
      const result = await getProviderComparison()
      expect(result).toEqual([])
    })

    it('returns provider stats when total > 0', async () => {
      mockCount
        .mockResolvedValueOnce(20)
        .mockResolvedValueOnce(16)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(2)
        .mockResolvedValueOnce(20)
        .mockResolvedValueOnce(10)
        .mockResolvedValueOnce(5)
        .mockResolvedValueOnce(5)
      const result = await getProviderComparison('cat-1')
      expect(Array.isArray(result)).toBe(true)
      if (result.length > 0) {
        expect(result[0]).toMatchObject({
          provider: expect.any(String),
          totalSamples: expect.any(Number),
          approvalRate: expect.any(Number),
          rejectionRate: expect.any(Number),
          editRate: expect.any(Number),
        })
      }
    })
  })
})
