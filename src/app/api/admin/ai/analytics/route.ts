/**
 * @file route.ts
 * @description API endpoint for AI analytics
 * @module app/api/admin/ai/analytics
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { rateLimitAPI } from '@/lib/utils/rate-limit'
import { prisma } from '@/lib/db/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/ai/analytics
 * Return AI usage statistics
 */
export async function GET(request: NextRequest) {
  const rateLimit = rateLimitAPI(request)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // Get date range from query params (default: last 30 days)
    const searchParams = request.nextUrl.searchParams
    const days = parseInt(searchParams.get('days') || '30')
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - days)

    // Get all AI processing jobs
    const jobs = await prisma.aIProcessingJob.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    // Calculate statistics
    const totalJobs = jobs.length
    const completedJobs = jobs.filter((j) => j.status === 'completed').length
    const failedJobs = jobs.filter((j) => j.status === 'failed').length
    const totalItems = jobs.reduce((sum, j) => sum + j.totalItems, 0)
    const processedItems = jobs.reduce((sum, j) => sum + j.processedItems, 0)
    const failedItems = jobs.reduce((sum, j) => sum + j.failedItems, 0)
    const totalCost = jobs.reduce(
      (sum, j) => sum + (j.cost ? Number(j.cost) : 0),
      0
    )

    // Provider breakdown
    const byProvider = jobs.reduce(
      (acc, job) => {
        if (!acc[job.provider]) {
          acc[job.provider] = {
            jobs: 0,
            items: 0,
            cost: 0,
          }
        }
        acc[job.provider].jobs++
        acc[job.provider].items += job.processedItems
        acc[job.provider].cost += job.cost ? Number(job.cost) : 0
        return acc
      },
      {} as Record<string, { jobs: number; items: number; cost: number }>
    )

    // Daily breakdown
    const dailyStats = jobs.reduce((acc, job) => {
      const date = job.createdAt.toISOString().split('T')[0]
      if (!acc[date]) {
        acc[date] = { jobs: 0, items: 0, cost: 0 }
      }
      acc[date].jobs++
      acc[date].items += job.processedItems
      acc[date].cost += job.cost ? Number(job.cost) : 0
      return acc
    }, {} as Record<string, { jobs: number; items: number; cost: number }>)

    return NextResponse.json({
      period: {
        startDate,
        endDate: new Date(),
        days,
      },
      summary: {
        totalJobs,
        completedJobs,
        failedJobs,
        successRate: totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0,
        totalItems,
        processedItems,
        failedItems,
        totalCost: Math.round(totalCost * 100) / 100,
        averageCostPerItem:
          processedItems > 0 ? Math.round((totalCost / processedItems) * 10000) / 10000 : 0,
      },
      byProvider,
      dailyStats: Object.entries(dailyStats)
        .map(([date, stats]) => ({ date, ...stats }))
        .sort((a, b) => a.date.localeCompare(b.date)),
    })
  } catch (error: any) {
    console.error('Failed to get AI analytics:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to get AI analytics' },
      { status: 500 }
    )
  }
}
