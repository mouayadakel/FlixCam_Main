import { prisma } from '@/lib/db/prisma'

export interface AttributionWeight {
  eventId: string
  eventType: string
  source: string | null
  weight: number
  attributedValue: number
}

export class AttributionService {
  /**
   * Calculates the attribution weights for a specific booking.
   * Supports: LAST_TOUCH, FIRST_TOUCH, LINEAR, TIME_DECAY
   */
  static async getBookingAttribution(bookingId: string, model: 'LAST_TOUCH' | 'FIRST_TOUCH' | 'LINEAR' | 'TIME_DECAY' = 'LINEAR') {
    const booking = await (prisma as any).booking.findUnique({
      where: { id: bookingId },
      select: { sessionId: true, totalAmount: true, createdAt: true }
    })

    if (!booking || !booking.sessionId) return []

    const events = await prisma.marketingEvent.findMany({
      where: { 
        sessionId: booking.sessionId,
        createdAt: { lte: booking.createdAt }
      },
      orderBy: { createdAt: 'asc' }
    })

    if (events.length === 0) return []

    const totalRevenue = Number(booking.totalAmount)
    const weights: AttributionWeight[] = []

    switch (model) {
      case 'FIRST_TOUCH':
        weights.push({
          eventId: events[0].id,
          eventType: events[0].eventType,
          source: events[0].source,
          weight: 1,
          attributedValue: totalRevenue
        })
        break

      case 'LAST_TOUCH':
        const last = events[events.length - 1]
        weights.push({
          eventId: last.id,
          eventType: last.eventType,
          source: last.source,
          weight: 1,
          attributedValue: totalRevenue
        })
        break

      case 'LINEAR':
        const linearWeight = 1 / events.length
        events.forEach(e => {
          weights.push({
            eventId: e.id,
            eventType: e.eventType,
            source: e.source,
            weight: linearWeight,
            attributedValue: totalRevenue * linearWeight
          })
        })
        break

      case 'TIME_DECAY':
        // Simplified Time Decay: Half-life of 7 days
        const halfLifeMs = 7 * 24 * 60 * 60 * 1000
        let totalRawWeight = 0
        const rawWeights = events.map(e => {
          const hoursToConversion = (booking.createdAt.getTime() - e.createdAt.getTime())
          const w = Math.pow(2, -hoursToConversion / halfLifeMs)
          totalRawWeight += w
          return w
        })

        events.forEach((e, i) => {
          const normalizedWeight = rawWeights[i] / totalRawWeight
          weights.push({
            eventId: e.id,
            eventType: e.eventType,
            source: e.source,
            weight: normalizedWeight,
            attributedValue: totalRevenue * normalizedWeight
          })
        })
        break
    }

    return weights
  }

  /**
   * Aggregates ROI per source (Influencer, Organic, Paid, etc.)
   */
  static async getGlobalROAS(startDate: Date, endDate: Date, model: any = 'LINEAR') {
    const bookings = await (prisma as any).booking.findMany({
      where: { 
        status: { notIn: ['CANCELLED', 'DRAFT'] },
        createdAt: { gte: startDate, lte: endDate },
        sessionId: { not: null }
      },
      select: { id: true }
    })

    const sourceMap = new Map<string, number>()

    for (const b of bookings) {
      const attribution = await this.getBookingAttribution(b.id, model)
      attribution.forEach(a => {
        const source = a.source || 'Direct / Unknown'
        sourceMap.set(source, (sourceMap.get(source) || 0) + a.attributedValue)
      })
    }

    return Array.from(sourceMap.entries()).map(([source, revenue]) => ({
      source,
      revenue
    })).sort((a,b) => b.revenue - a.revenue)
  }
}
