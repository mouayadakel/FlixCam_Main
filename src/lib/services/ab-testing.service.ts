import { prisma } from '@/lib/db/prisma'

export class AbTestingService {
  /**
   * Deterministically assigns a variant (A or B) to a sessionId.
   * If a winner has been adopted in settings, it returns that variant.
   */
  static async getVariant(sessionId: string, experimentName: string): Promise<'A' | 'B'> {
    // 1. Check if there is a winner in the NEW AbExperiment table
    const experiment = await (prisma as any).abExperiment.findUnique({
      where: { name: experimentName, deletedAt: null }
    })
    
    if (experiment?.winningVariant === 'A' || experiment?.winningVariant === 'B') {
      return experiment.winningVariant as 'A' | 'B'
    }

    // Simple hash-based assignment for active experiments
    let hash = 0
    const str = sessionId + experimentName
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i)
      hash |= 0 // Convert to 32bit integer
    }
    return Math.abs(hash) % 2 === 0 ? 'A' : 'B'
  }

  static async getExperimentStats(experimentName: string) {
    const events = await prisma.marketingEvent.findMany({
      where: {
        metadata: {
          path: ['experiment'],
          equals: experimentName
        }
      },
      select: {
        eventType: true,
        metadata: true,
        value: true
      }
    })

    const stats = {
      A: { views: 0, conversions: 0, revenue: 0 },
      B: { views: 0, conversions: 0, revenue: 0 }
    }

    events.forEach(e => {
      const variant = (e.metadata as any).variant as 'A' | 'B'
      if (!variant) return

      stats[variant].views++
      if (['Purchase', 'Lead', 'Contact', 'AddToCart'].includes(e.eventType)) {
        stats[variant].conversions++
        if (e.value) stats[variant].revenue += Number(e.value)
      }
    })

    return stats
  }
}
