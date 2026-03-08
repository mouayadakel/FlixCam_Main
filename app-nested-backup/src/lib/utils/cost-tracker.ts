/**
 * AI cost tracking: record spend per job and per feature/day, check budget from AISettings.
 */

import { prisma } from '@/lib/db/prisma'

const COST_PER_1K: Record<string, { in: number; out: number }> = {
  'gpt-4o-mini': { in: 0.00015, out: 0.0006 },
  'gpt-4o': { in: 0.005, out: 0.015 },
  'dall-e-3': { in: 0.04, out: 0 },
  'text-embedding-ada-002': { in: 0.0001, out: 0 },
  'gemini-2.0-flash': { in: 0.075 / 1000, out: 0.3 / 1000 },
  'gemini-1.5-pro': { in: 1.25 / 1000, out: 5.0 / 1000 },
}

export type AIFeature =
  | 'text_backfill'
  | 'photo_generation'
  | 'spec_inference'
  | 'chatbot'
  | 'embeddings'

function todayUTC(): Date {
  const d = new Date()
  d.setUTCHours(0, 0, 0, 0)
  return d
}

/**
 * Record cost for an AI call and update AiJob + AiDailyCost.
 */
export async function trackAICost(opts: {
  jobId: string
  feature: AIFeature
  model: string
  inputTokens: number
  outputTokens: number
}): Promise<number> {
  const rate = COST_PER_1K[opts.model] ?? { in: 0, out: 0 }
  let cost: number
  if (opts.model === 'dall-e-3') {
    cost = rate.in // per image
  } else {
    cost = (opts.inputTokens / 1000) * rate.in + (opts.outputTokens / 1000) * rate.out
  }
  const date = todayUTC()
  try {
    await prisma.$transaction([
      prisma.aiJob.update({
        where: { id: opts.jobId },
        data: { costUsd: { increment: cost } },
      }),
      prisma.aiDailyCost.upsert({
        where: {
          date_feature: { date, feature: opts.feature },
        },
        update: { costUsd: { increment: cost }, jobCount: { increment: 1 } },
        create: {
          date,
          feature: opts.feature,
          costUsd: cost,
          jobCount: 1,
        },
      }),
    ])
  } catch (e) {
    console.error('[CostTracker] trackAICost failed:', e)
  }
  return cost
}

/**
 * Record a known cost amount (e.g. when only dollar cost is available from provider).
 */
export async function recordCost(opts: {
  jobId: string
  feature: AIFeature
  costUsd: number
}): Promise<void> {
  if (opts.costUsd <= 0) return
  const date = todayUTC()
  const firstOfMonth = new Date(date)
  firstOfMonth.setUTCDate(1)
  try {
    const settings = await prisma.aISettings.findFirst({ where: { enabled: true } })
    await prisma.$transaction([
      prisma.aiJob.update({
        where: { id: opts.jobId },
        data: { costUsd: { increment: opts.costUsd } },
      }),
      prisma.aiDailyCost.upsert({
        where: { date_feature: { date, feature: opts.feature } },
        update: { costUsd: { increment: opts.costUsd }, jobCount: { increment: 1 } },
        create: { date, feature: opts.feature, costUsd: opts.costUsd, jobCount: 1 },
      }),
      ...(settings
        ? [
            prisma.aISettings.update({
              where: { id: settings.id },
              data: {
                currentDailySpend: { increment: opts.costUsd },
                currentMonthlySpend: { increment: opts.costUsd },
              },
            }),
          ]
        : []),
    ])
  } catch (e) {
    console.error('[CostTracker] recordCost failed:', e)
  }
}

/**
 * Check if budget allows spending estimated cost. Reads AISettings (first row or by provider).
 */
export async function canSpend(_provider: string, estimatedCost: number): Promise<boolean> {
  const settings = await prisma.aISettings.findFirst({
    where: { enabled: true },
  })
  if (!settings?.dailyBudgetUsd && !settings?.monthlyBudgetUsd) return true
  const summary = await getSpendSummary()
  if (summary.daily.remaining != null && summary.daily.remaining < estimatedCost) return false
  if (summary.monthly.remaining != null && summary.monthly.remaining < estimatedCost) return false
  return true
}

export interface SpendSummary {
  daily: { spent: number; budget: number | null; remaining: number | null }
  monthly: { spent: number; budget: number | null; remaining: number | null }
  byProvider: Record<string, number>
}

/**
 * Get current spend from AISettings and optionally AiDailyCost for by-feature.
 */
export async function getSpendSummary(): Promise<SpendSummary> {
  const settings = await prisma.aISettings.findFirst({
    where: { enabled: true },
  })
  const dailySpent = settings?.currentDailySpend ? Number(settings.currentDailySpend) : 0
  const monthlySpent = settings?.currentMonthlySpend ? Number(settings.currentMonthlySpend) : 0
  const dailyBudget = settings?.dailyBudgetUsd ? Number(settings.dailyBudgetUsd) : null
  const monthlyBudget = settings?.monthlyBudgetUsd ? Number(settings.monthlyBudgetUsd) : null
  return {
    daily: {
      spent: dailySpent,
      budget: dailyBudget,
      remaining: dailyBudget != null ? dailyBudget - dailySpent : null,
    },
    monthly: {
      spent: monthlySpent,
      budget: monthlyBudget,
      remaining: monthlyBudget != null ? monthlyBudget - monthlySpent : null,
    },
    byProvider: {},
  }
}

/**
 * Reset daily spend (call at midnight cron). Updates AISettings and spendResetDate.
 */
export async function resetDaily(): Promise<void> {
  const settings = await prisma.aISettings.findFirst()
  if (!settings) return
  await prisma.aISettings.update({
    where: { id: settings.id },
    data: {
      currentDailySpend: 0,
      spendResetDate: new Date(),
    },
  })
}

/**
 * Reset monthly spend (call on 1st of month).
 */
export async function resetMonthly(): Promise<void> {
  const settings = await prisma.aISettings.findFirst()
  if (!settings) return
  await prisma.aISettings.update({
    where: { id: settings.id },
    data: {
      currentMonthlySpend: 0,
      monthlyResetDate: new Date(),
    },
  })
}
