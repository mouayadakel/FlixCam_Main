import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { bundleRecommendationsService } from '@/lib/services/bundle-recommendations.service'

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const excludeIdsStr = searchParams.get('exclude')
    const excludeIds = excludeIdsStr ? excludeIdsStr.split(',').filter(Boolean) : []

    let recommendedMap = new Map<string, { item: any; score: number }>()

    if (excludeIds.length > 0) {
      // 1. Fetch co-occurrence recommendations for all items currently in the cart
      const recommendationPromises = excludeIds.map((id) =>
        bundleRecommendationsService.getFrequentlyRentedTogether(id, 4)
      )
      const recommendationResults = await Promise.all(recommendationPromises)

      // 2. Aggregate co-occurring items with score weight
      recommendationResults.forEach((res) => {
        const weight = res.source === 'co-occurrence' ? 3 : 1
        res.items.forEach((item, index) => {
          if (excludeIds.includes(item.id)) return // Skip items already in the cart

          // Score is determined by co-occurrence ranking (higher position = higher score) and source weight
          const positionScore = (4 - index) * weight
          const existing = recommendedMap.get(item.id)
          if (existing) {
            existing.score += positionScore
          } else {
            recommendedMap.set(item.id, { item, score: positionScore })
          }
        })
      })
    }

    // Sort by highest co-occurrence score
    let candidates = [...recommendedMap.values()]
      .sort((a, b) => b.score - a.score)
      .map((entry) => ({
        id: entry.item.id,
        model: entry.item.model,
        sku: entry.item.sku,
        dailyPrice: Number(entry.item.dailyPrice),
        imageUrl: entry.item.media?.[0]?.url || null,
      }))

    // 3. Fallback: If we have fewer than 2 candidates, top up with cheap accessories
    if (candidates.length < 2) {
      const fallbackItems = await prisma.equipment.findMany({
        where: {
          deletedAt: null,
          isActive: true,
          id: { notIn: [...excludeIds, ...candidates.map((c) => c.id)] },
          dailyPrice: { lt: 150 }, // Heuristic: cheap items are excellent cross-sells
          quantityAvailable: { gt: 0 },
        },
        take: 4,
        orderBy: {
          createdAt: 'desc',
        },
        select: {
          id: true,
          model: true,
          sku: true,
          dailyPrice: true,
          media: {
            where: { type: 'image', deletedAt: null },
            take: 1,
            select: { url: true },
          },
        },
      })

      const formattedFallback = fallbackItems.map((item) => ({
        id: item.id,
        model: item.model,
        sku: item.sku,
        dailyPrice: Number(item.dailyPrice),
        imageUrl: item.media[0]?.url || null,
      }))

      candidates = [...candidates, ...formattedFallback]
    }

    // Slice to top 2 recommendations
    const finalRecommendations = candidates.slice(0, 2)

    return NextResponse.json({ recommendations: finalRecommendations })
  } catch (error) {
    console.error('Cart recommendations error:', error)
    return NextResponse.json({ error: 'Failed to fetch recommendations' }, { status: 500 })
  }
}
