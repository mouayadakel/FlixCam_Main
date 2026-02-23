/**
 * @file ai-analytics.service.ts
 * @description Provider performance tracking, cost analysis, and auto-selection.
 * Tracks per-provider cost, speed, approval rate, and error rate.
 * @module lib/services
 */

import { prisma } from '@/lib/db/prisma'

export interface ProviderStats {
  provider: string
  totalJobs: number
  avgCost: number
  totalCost: number
  approvalRate: number
  avgProcessingTime: number
  errorRate: number
}

export interface CostBreakdown {
  date: string
  provider: string
  cost: number
  jobCount: number
}

/**
 * Get comprehensive provider statistics for the analytics dashboard.
 */
export async function getProviderStats(): Promise<ProviderStats[]> {
  const providers = ['gemini', 'openai']
  const stats: ProviderStats[] = []

  for (const provider of providers) {
    try {
      const [feedbackTotal, feedbackApproved] = await Promise.all([
        prisma.aiFeedback.count({ where: { provider } }),
        prisma.aiFeedback.count({ where: { provider, action: 'approved' } }),
      ])

      const jobs = await prisma.aIProcessingJob.findMany({
        where: { provider },
        select: {
          cost: true,
          startedAt: true,
          completedAt: true,
          failedItems: true,
          totalItems: true,
        },
      })

      const totalCost = jobs.reduce((sum, j) => sum + (j.cost ? Number(j.cost) : 0), 0)
      const avgCost = jobs.length > 0 ? totalCost / jobs.length : 0
      const errorRate =
        jobs.length > 0
          ? (jobs.reduce((sum, j) => sum + (j.failedItems || 0), 0) /
              Math.max(
                1,
                jobs.reduce((sum, j) => sum + (j.totalItems || 0), 0)
              )) *
            100
          : 0

      const processingTimes = jobs
        .filter((j) => j.startedAt && j.completedAt)
        .map((j) => (j.completedAt!.getTime() - j.startedAt!.getTime()) / 1000)
      const avgProcessingTime =
        processingTimes.length > 0
          ? processingTimes.reduce((a, b) => a + b, 0) / processingTimes.length
          : 0

      stats.push({
        provider,
        totalJobs: jobs.length,
        avgCost: Math.round(avgCost * 10000) / 10000,
        totalCost: Math.round(totalCost * 100) / 100,
        approvalRate: feedbackTotal > 0 ? Math.round((feedbackApproved / feedbackTotal) * 100) : 0,
        avgProcessingTime: Math.round(avgProcessingTime),
        errorRate: Math.round(errorRate * 10) / 10,
      })
    } catch {
      stats.push({
        provider,
        totalJobs: 0,
        avgCost: 0,
        totalCost: 0,
        approvalRate: 0,
        avgProcessingTime: 0,
        errorRate: 0,
      })
    }
  }

  return stats
}

/**
 * Get daily cost breakdown for charting
 */
export async function getDailyCostBreakdown(days: number = 30): Promise<CostBreakdown[]> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)

  try {
    const jobs = await prisma.aIProcessingJob.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true, provider: true, cost: true },
      orderBy: { createdAt: 'asc' },
    })

    const dailyMap = new Map<string, CostBreakdown>()
    for (const job of jobs) {
      const date = job.createdAt.toISOString().split('T')[0]
      const key = `${date}:${job.provider}`
      const existing = dailyMap.get(key)
      if (existing) {
        existing.cost += job.cost ? Number(job.cost) : 0
        existing.jobCount++
      } else {
        dailyMap.set(key, {
          date,
          provider: job.provider,
          cost: job.cost ? Number(job.cost) : 0,
          jobCount: 1,
        })
      }
    }

    return Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date))
  } catch {
    return []
  }
}

/**
 * Auto-select the best provider for a given task and category.
 * Considers: approval rate (50%), cost (30%), speed (20%)
 */
export async function selectBestProvider(
  contentType: string,
  categoryId?: string
): Promise<{ provider: string; reason: string }> {
  try {
    const where: Record<string, unknown> = { contentType }
    if (categoryId) where.categoryId = categoryId

    const providers = ['gemini', 'openai']
    const scores: Array<{ provider: string; score: number; reason: string }> = []

    for (const provider of providers) {
      const provWhere = { ...where, provider }
      const [total, approved] = await Promise.all([
        prisma.aiFeedback.count({ where: provWhere }),
        prisma.aiFeedback.count({ where: { ...provWhere, action: 'approved' } }),
      ])

      if (total < 5) {
        scores.push({ provider, score: 50, reason: 'Insufficient data for scoring' })
        continue
      }

      const approvalRate = (approved / total) * 100
      const approvalScore = approvalRate * 0.5
      const costScore = provider === 'gemini' ? 30 : 15
      const score = approvalScore + costScore

      scores.push({
        provider,
        score: Math.round(score),
        reason: `Approval: ${Math.round(approvalRate)}%, Cost efficiency: ${provider === 'gemini' ? 'high' : 'moderate'}`,
      })
    }

    scores.sort((a, b) => b.score - a.score)
    return { provider: scores[0].provider, reason: scores[0].reason }
  } catch {
    return { provider: 'gemini', reason: 'Default provider (analytics unavailable)' }
  }
}
