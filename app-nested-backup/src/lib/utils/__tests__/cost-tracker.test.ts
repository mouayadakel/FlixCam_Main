/**
 * Unit tests for cost-tracker
 */

const mockTransaction = jest.fn()
const mockAiJobUpdate = jest.fn()
const mockAiDailyCostUpsert = jest.fn()
const mockAiSettingsFindFirst = jest.fn()
const mockAiSettingsUpdate = jest.fn()

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    $transaction: (...args: unknown[]) => mockTransaction(...args),
    aiJob: {
      update: (...args: unknown[]) => mockAiJobUpdate(...args),
    },
    aiDailyCost: {
      upsert: (...args: unknown[]) => mockAiDailyCostUpsert(...args),
    },
    aISettings: {
      findFirst: (...args: unknown[]) => mockAiSettingsFindFirst(...args),
      update: (...args: unknown[]) => mockAiSettingsUpdate(...args),
    },
  },
}))

import { trackAICost, recordCost, getSpendSummary, canSpend, resetDaily, resetMonthly } from '../cost-tracker'

describe('cost-tracker', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockTransaction.mockImplementation(async (ops: unknown) => {
      if (Array.isArray(ops)) {
        return Promise.all(ops as Promise<unknown>[])
      }
      return []
    })
    mockAiJobUpdate.mockResolvedValue({})
    mockAiDailyCostUpsert.mockResolvedValue({})
    mockAiSettingsFindFirst.mockResolvedValue(null)
    mockAiSettingsUpdate.mockResolvedValue({})
  })

  describe('trackAICost', () => {
    it('calculates cost for gpt-4o-mini and updates DB', async () => {
      const cost = await trackAICost({
        jobId: 'job_1',
        feature: 'text_backfill',
        model: 'gpt-4o-mini',
        inputTokens: 1000,
        outputTokens: 500,
      })
      expect(cost).toBeCloseTo(0.00015 + 0.0003, 6)
      expect(mockTransaction).toHaveBeenCalled()
    })

    it('calculates cost for dall-e-3 (per image)', async () => {
      const cost = await trackAICost({
        jobId: 'job_1',
        feature: 'photo_generation',
        model: 'dall-e-3',
        inputTokens: 0,
        outputTokens: 0,
      })
      expect(cost).toBe(0.04)
    })

    it('returns 0 cost for unknown model', async () => {
      const cost = await trackAICost({
        jobId: 'job_1',
        feature: 'text_backfill',
        model: 'unknown-model',
        inputTokens: 1000,
        outputTokens: 500,
      })
      expect(cost).toBe(0)
    })

    it('returns cost even when DB transaction fails', async () => {
      mockTransaction.mockRejectedValue(new Error('DB error'))
      const cost = await trackAICost({
        jobId: 'job_1',
        feature: 'text_backfill',
        model: 'gpt-4o-mini',
        inputTokens: 100,
        outputTokens: 50,
      })
      expect(cost).toBeGreaterThan(0)
    })
  })

  describe('recordCost', () => {
    it('skips when costUsd <= 0', async () => {
      await recordCost({
        jobId: 'job_1',
        feature: 'text_backfill',
        costUsd: 0,
      })
      expect(mockTransaction).not.toHaveBeenCalled()
    })

    it('updates DB when costUsd > 0', async () => {
      await recordCost({
        jobId: 'job_1',
        feature: 'text_backfill',
        costUsd: 0.05,
      })
      expect(mockTransaction).toHaveBeenCalled()
    })

    it('updates AISettings when settings found', async () => {
      mockAiSettingsFindFirst.mockResolvedValue({ id: 's1' })
      await recordCost({
        jobId: 'job_1',
        feature: 'text_backfill',
        costUsd: 0.05,
      })
      expect(mockTransaction).toHaveBeenCalled()
      const txCalls = mockTransaction.mock.calls[0][0]
      expect(txCalls.length).toBeGreaterThan(2)
    })
  })

  describe('getSpendSummary', () => {
    it('returns zeros when no settings', async () => {
      mockAiSettingsFindFirst.mockResolvedValue(null)
      const summary = await getSpendSummary()
      expect(summary.daily.spent).toBe(0)
      expect(summary.monthly.spent).toBe(0)
      expect(summary.daily.remaining).toBeNull()
    })

    it('returns spend from settings', async () => {
      mockAiSettingsFindFirst.mockResolvedValue({
        currentDailySpend: 10,
        currentMonthlySpend: 50,
        dailyBudgetUsd: 100,
        monthlyBudgetUsd: 500,
      })
      const summary = await getSpendSummary()
      expect(summary.daily.spent).toBe(10)
      expect(summary.monthly.spent).toBe(50)
      expect(summary.daily.remaining).toBe(90)
      expect(summary.monthly.remaining).toBe(450)
    })
  })

  describe('canSpend', () => {
    it('returns true when no budget set', async () => {
      mockAiSettingsFindFirst.mockResolvedValue(null)
      const result = await canSpend('openai', 1)
      expect(result).toBe(true)
    })

    it('returns true when both daily and monthly budget null', async () => {
      mockAiSettingsFindFirst.mockResolvedValue({ dailyBudgetUsd: null, monthlyBudgetUsd: null })
      const result = await canSpend('openai', 1)
      expect(result).toBe(true)
    })

    it('returns false when daily remaining < estimatedCost', async () => {
      mockAiSettingsFindFirst.mockResolvedValue({
        currentDailySpend: 90,
        dailyBudgetUsd: 100,
        currentMonthlySpend: 0,
        monthlyBudgetUsd: 500,
      })
      const result = await canSpend('openai', 20)
      expect(result).toBe(false)
    })
  })

  describe('resetDaily', () => {
    it('does nothing when no settings', async () => {
      mockAiSettingsFindFirst.mockResolvedValue(null)
      await resetDaily()
      expect(mockAiSettingsUpdate).not.toHaveBeenCalled()
    })

    it('updates settings when found', async () => {
      mockAiSettingsFindFirst.mockResolvedValue({ id: 's1' })
      await resetDaily()
      expect(mockAiSettingsUpdate).toHaveBeenCalled()
    })
  })

  describe('resetMonthly', () => {
    it('does nothing when no settings', async () => {
      mockAiSettingsFindFirst.mockResolvedValue(null)
      await resetMonthly()
      expect(mockAiSettingsUpdate).not.toHaveBeenCalled()
    })

    it('updates settings when found', async () => {
      mockAiSettingsFindFirst.mockResolvedValue({ id: 's1' })
      await resetMonthly()
      expect(mockAiSettingsUpdate).toHaveBeenCalled()
    })
  })
})
