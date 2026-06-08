import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId || !(await hasPermission(userId, PERMISSIONS.MARKETING_READ))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const days = Math.min(90, Math.max(1, parseInt(request.nextUrl.searchParams.get('days') || '30', 10)))
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
    const [byTypeRaw, recent, total, allForTrends] = await Promise.all([
      prisma.marketingEvent.groupBy({
        by: ['eventType'],
        where: { createdAt: { gte: since } },
        _count: { _all: true },
      }),
      prisma.marketingEvent.findMany({
        where: { createdAt: { gte: since } },
        orderBy: { createdAt: 'desc' },
        take: 100,
        select: {
          id: true,
          eventType: true,
          pageUrl: true,
          entityType: true,
          entityId: true,
          value: true,
          createdAt: true,
        },
      }),
      prisma.marketingEvent.count({ where: { createdAt: { gte: since } } }),
      prisma.marketingEvent.findMany({
        where: { createdAt: { gte: since } },
        select: { createdAt: true, eventType: true, value: true },
      }),
    ])

    const byType = byTypeRaw.map((r: { eventType: string; _count: { _all: number } }) => ({
      eventType: r.eventType,
      _count: r._count._all,
    }))

    // In-memory grouping for trends (safe for typical 30-day volumes)
    const trendsMap: Record<string, { date: string; views: number; adds: number; purchases: number; leads: number }> = {}
    
    // Initialize map with all dates in range
    for (let i = 0; i < days; i++) {
       const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
       const dateStr = d.toISOString().slice(0, 10)
       trendsMap[dateStr] = { date: dateStr, views: 0, adds: 0, purchases: 0, leads: 0 }
    }

    let estimatedRoi = 0

    allForTrends.forEach((e: { createdAt: Date; eventType: string; value: number | null }) => {
       const dateStr = e.createdAt.toISOString().slice(0, 10)
       if (!trendsMap[dateStr]) {
          trendsMap[dateStr] = { date: dateStr, views: 0, adds: 0, purchases: 0, leads: 0 }
       }
       if (e.eventType === 'ViewContent' || e.eventType === 'PageView' || e.eventType === 'equipment_view') trendsMap[dateStr].views++
       else if (e.eventType === 'AddToCart' || e.eventType === 'add_to_cart') trendsMap[dateStr].adds++
       else if (e.eventType === 'Purchase') {
          trendsMap[dateStr].purchases++
          estimatedRoi += Number(e.value || 0)
       }
       else if (e.eventType === 'Lead') trendsMap[dateStr].leads++
    })

    const trends = Object.values(trendsMap).sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json({ byType, recent, total, days, trends, estimatedRoi })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ byType: [], recent: [], total: 0, days: 30, trends: [], estimatedRoi: 0 })
  }
}
