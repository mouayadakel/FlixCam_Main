import { prisma } from '@/lib/db/prisma'
import { createHash } from 'crypto'

export class ReferralService {
  /**
   * Generates and saves a unique referral code.
   */
  static async createInfluencerCode(name: string, userId?: string, commissionRate?: number): Promise<string> {
    const code = createHash('md5')
      .update(name + 'flixcam_salt_2026')
      .digest('hex')
      .slice(0, 8)
      .toUpperCase()

    await (prisma as any).referral.upsert({
      where: { code },
      update: { name, influencerId: userId, deletedAt: null, commissionRate },
      create: { code, name, influencerId: userId, commissionRate }
    })

    return code
  }

  /**
   * Tracks a referral event by linking a code to a session.
   */
  static async trackReferral(code: string, sessionId: string, pageUrl: string) {
    if (!code || !sessionId) return

    await prisma.marketingEvent.create({
      data: {
        sessionId,
        eventType: 'Referral',
        source: 'ReferralProgram',
        pageUrl,
        metadata: {
          referralCode: code,
          trackedAt: new Date().toISOString()
        }
      }
    })
  }

  /**
   * Get referral stats for admin dashboard.
   * Fix 6: Eliminated N+1 query by pre-fetching conversions.
   * Fix 7: Added revenue attribution per referral code.
   */
  static async getReferralStats() {
    // 1. Fetch all referral events
    const referralEvents = await prisma.marketingEvent.findMany({
      where: { eventType: 'Referral' },
      select: { metadata: true, sessionId: true }
    })

    if (referralEvents.length === 0) return []

    // 2. Collect all unique session IDs from referral events
    const sessionIds = [...new Set(referralEvents.map(e => e.sessionId).filter(Boolean) as string[])]

    // 3. Batch-fetch ALL conversion events for those sessions in ONE query (Fix 6)
    const conversionEvents = await prisma.marketingEvent.findMany({
      where: {
        sessionId: { in: sessionIds },
        eventType: { in: ['Purchase', 'Lead', 'Contact'] }
      },
      select: { sessionId: true, value: true }
    })

    // 4. Build lookup: sessionId → { hasConversion, revenue }
    const conversionMap = new Map<string, { count: number; revenue: number }>()
    for (const ev of conversionEvents) {
      if (!ev.sessionId) continue
      const existing = conversionMap.get(ev.sessionId) || { count: 0, revenue: 0 }
      existing.count++
      existing.revenue += Number(ev.value) || 0
      conversionMap.set(ev.sessionId, existing)
    }

    // 5. Aggregate per referral code
    const referralMap = new Map<string, { code: string; name?: string; clicks: number; conversions: number; revenue: number }>()

    // 6. Pre-fetch influencer metadata
    const influencers = await (prisma as any).referral.findMany({
      where: { code: { in: Array.from(new Set(referralEvents.map(e => (e.metadata as any)?.referralCode).filter(Boolean))) } }
    })
    const influencerMap = new Map(influencers.map((i: any) => [i.code, i.name]))

    for (const event of referralEvents) {
      const code = (event.metadata as any)?.referralCode
      if (!code) continue

      if (!referralMap.has(code)) {
        referralMap.set(code, { 
          code, 
          name: (influencerMap.get(code) as any) || 'General',
          clicks: 0, 
          conversions: 0, 
          revenue: 0 
        })
      }
      
      const stats = referralMap.get(code)!
      stats.clicks++

      const sessionConversion = event.sessionId ? conversionMap.get(event.sessionId) : null
      if (sessionConversion && sessionConversion.count > 0) {
        stats.conversions++
        stats.revenue += sessionConversion.revenue
      }
    }

    return Array.from(referralMap.values())
  }
  /**
   * List all influencer codes
   */
  static async getInfluencerCodes() {
    return (prisma as any).referral.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' }
    })
  }

  /**
   * Get or create a personal referral code for a regular customer.
   */
  static async getOrCreateUserReferralCode(userId: string): Promise<string> {
    const existing = await (prisma as any).referral.findFirst({
      where: { influencerId: userId, deletedAt: null },
      select: { code: true }
    })

    if (existing) return existing.code

    // Generate a fresh code
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } })
    const base = user?.name || userId
    const code = createHash('md5')
      .update(base + userId + 'flixcam_v2_2026')
      .digest('hex')
      .slice(0, 8)
      .toUpperCase()

    await (prisma as any).referral.create({
      data: {
        code,
        influencerId: userId,
        name: user?.name ? `${user.name} (Auto)` : 'Customer',
        commissionRate: 0.03 // Default low rate for general users
      }
    })

    return code
  }
}
