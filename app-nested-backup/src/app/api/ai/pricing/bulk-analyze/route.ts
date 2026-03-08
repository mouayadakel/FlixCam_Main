/**
 * @file route.ts
 * @description Bulk AI pricing analysis for all active equipment
 * @module api/ai/pricing/bulk-analyze
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { AIService } from '@/lib/services/ai.service'
import { AIPolicy } from '@/lib/policies/ai.policy'
import { handleApiError } from '@/lib/utils/api-helpers'
import { prisma } from '@/lib/db/prisma'

export const dynamic = 'force-dynamic'

const MAX_CONCURRENT_AI_CALLS = 5

function createLimiter(concurrency: number) {
  let active = 0
  const queue: (() => void)[] = []
  return function limit<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const run = async () => {
        active++
        try {
          resolve(await fn())
        } catch (e) {
          reject(e)
        } finally {
          active--
          if (queue.length > 0) queue.shift()!()
        }
      }
      if (active < concurrency) run()
      else queue.push(run)
    })
  }
}

export async function POST() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const policy = await AIPolicy.canViewPricingSuggestions(session.user.id)
    if (!policy.allowed) {
      return NextResponse.json({ error: policy.reason }, { status: 403 })
    }

    const equipmentList = await prisma.equipment.findMany({
      where: { isActive: true, deletedAt: null },
      select: { id: true, model: true, sku: true, dailyPrice: true },
    })

    const results: {
      equipmentId: string
      equipmentName: string
      sku: string
      currentPrice: number
      utilizationRate: number
      suggestedPrice: number
      variance: number
      rationale?: string
    }[] = []

    const limit = createLimiter(MAX_CONCURRENT_AI_CALLS)

    const settled = await Promise.allSettled(
      equipmentList.map((eq) =>
        limit(async () => {
          const currentPrice =
            typeof eq.dailyPrice === 'object' &&
            eq.dailyPrice != null &&
            'toNumber' in eq.dailyPrice
              ? (eq.dailyPrice as { toNumber: () => number }).toNumber()
              : Number(eq.dailyPrice)
          return AIService.suggestPricing({
            equipmentId: eq.id,
            currentPrice,
          })
        })
      )
    )

    settled.forEach((outcome, i) => {
      const eq = equipmentList[i]
      if (!eq) return
      const currentPrice =
        typeof eq.dailyPrice === 'object' && eq.dailyPrice != null && 'toNumber' in eq.dailyPrice
          ? (eq.dailyPrice as { toNumber: () => number }).toNumber()
          : Number(eq.dailyPrice)
      if (outcome.status === 'fulfilled') {
        const s = outcome.value
        const utilizationRate = (s.factors?.utilizationRate ?? 0) / 100
        results.push({
          equipmentId: eq.id,
          equipmentName: eq.model ?? eq.sku ?? eq.id,
          sku: eq.sku ?? '',
          currentPrice,
          utilizationRate,
          suggestedPrice: s.suggestedPrice,
          variance: Math.round((s.suggestedPrice - currentPrice) * 100) / 100,
          rationale: s.reasoning,
        })
      }
    })

    return NextResponse.json({ results }, { status: 200 })
  } catch (error) {
    return handleApiError(error)
  }
}
