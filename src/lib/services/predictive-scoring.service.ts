import { prisma } from '@/lib/db/prisma'

export class PredictiveScoringService {
  /**
   * Calculates a conversion probability score (0-100) for a session/lead.
   */
  static async calculateScore(sessionId: string): Promise<number> {
    const events = await prisma.marketingEvent.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' }
    })

    if (events.length === 0) return 0

    let score = 0
    const eventTypes = events.map(e => e.eventType)
    
    // 1. Interaction Depth (Max 30 points)
    // More pages viewed = higher intent
    const uniquePages = new Set(events.map(e => e.pageUrl)).size
    score += Math.min(uniquePages * 5, 30)

    // 2. High-Intent Actions (Max 40 points)
    if (eventTypes.includes('AddToCart')) score += 20
    if (eventTypes.includes('ViewContent')) score += 10
    if (eventTypes.includes('Search')) score += 5
    if (eventTypes.includes('InitiateCheckout')) score += 15

    // 3. Time Spent / Recency (Max 20 points)
    const firstEvent = events[0].createdAt.getTime()
    const lastEvent = events[events.length - 1].createdAt.getTime()
    const durationMinutes = (lastEvent - firstEvent) / (1000 * 60)
    
    if (durationMinutes > 10) score += 20
    else if (durationMinutes > 5) score += 10
    else if (durationMinutes > 1) score += 5

    // 4. Source Quality (Max 10 points)
    const firstSource = events[0].source?.toLowerCase() || ''
    if (['google', 'search', 'organic'].some(s => firstSource.includes(s))) score += 10
    if (['snapchat', 'facebook', 'instagram'].some(s => firstSource.includes(s))) score += 5

    // Cap at 100
    return Math.min(score, 100)
  }

  static async updateAllLeadScores() {
    // This could run as a background task
    const leads = await prisma.marketingEvent.findMany({
      where: { eventType: 'Lead' },
      distinct: ['sessionId'],
      select: { sessionId: true }
    })

    for (const lead of leads) {
      if (!lead.sessionId) continue
      const score = await this.calculateScore(lead.sessionId)
      // We could store this in a 'Lead' table or use it dynamically in the UI
      console.log(`Lead ${lead.sessionId} score: ${score}`)
    }
  }
}
