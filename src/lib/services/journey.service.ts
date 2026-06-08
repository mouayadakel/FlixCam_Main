import { prisma } from '@/lib/db/prisma'

export interface HeatmapEntry {
  day: number // 0-6
  hour: number // 0-23
  value: number
}

export interface JourneyPath {
  path: string[]
  count: number
  conversionRate: number
}

export class JourneyService {
  /**
   * Get 24/7 Heatmap data based on MarketingEvents.
   */
  static async getActivityHeatmap(): Promise<HeatmapEntry[]> {
    const events = await prisma.marketingEvent.findMany({
      where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      select: { createdAt: true }
    })

    const heatmap: Record<string, number> = {}
    events.forEach(e => {
      const d = e.createdAt
      const key = `${d.getDay()}-${d.getHours()}`
      heatmap[key] = (heatmap[key] || 0) + 1
    })

    const result: HeatmapEntry[] = []
    for (let day = 0; day < 7; day++) {
      for (let hour = 0; hour < 24; hour++) {
        result.push({ day, hour, value: heatmap[`${day}-${hour}`] || 0 })
      }
    }
    return result
  }

  /**
   * Aggregate common customer paths leading to conversion.
   */
  static async getTopConversionPaths(): Promise<JourneyPath[]> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    
    // Get all events in the last 30 days grouped by sessionId
    const events = await prisma.marketingEvent.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      orderBy: { createdAt: 'asc' },
      select: { sessionId: true, eventType: true }
    })

    const sessions: Record<string, string[]> = {}
    events.forEach(e => {
      if (!e.sessionId) return
      if (!sessions[e.sessionId]) sessions[e.sessionId] = []
      // Avoid duplicate consecutive same events
      if (sessions[e.sessionId][sessions[e.sessionId].length - 1] !== e.eventType) {
        sessions[e.sessionId].push(e.eventType)
      }
    })

    const pathCounts: Record<string, number> = {}
    Object.values(sessions).forEach(path => {
      if (path.length < 2) return
      const key = path.join(' → ')
      pathCounts[key] = (pathCounts[key] || 0) + 1
    })

    return Object.entries(pathCounts)
      .map(([path, count]) => ({
        path: path.split(' → '),
        count,
        conversionRate: path.includes('Purchase') ? Math.round((count / Object.keys(sessions).length) * 1000) / 10 : 0
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)
  }

  /**
   * Get funnel drop-off statistics.
   */
  static async getFunnelStats() {
    const stats = await prisma.marketingEvent.groupBy({
      by: ['eventType'],
      _count: { _all: true },
      where: { createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }
    })

    const order = ['ProductView', 'AddToCart', 'CheckoutStarted', 'Purchase']
    return order.map(type => {
      const match = stats.find(s => s.eventType === type)
      return {
        stage: type,
        count: match?._count._all || 0
      }
    })
  }
}
