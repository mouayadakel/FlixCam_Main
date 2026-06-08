import { prisma } from '@/lib/db/prisma'

export interface VIPStatus {
  id: string
  name: string
  email: string
  totalSpend: number
  bookingCount: number
  predictedLTV: number
  isVIP: boolean
  healthScore: number // 0-100
  lastBookingDate: string | null
}

export class VIPService {
  /**
   * Get all customers with LTV predictions and VIP status.
   */
  static async getVIPLeaderboard(): Promise<{ customers: VIPStatus[]; summary: any }> {
    const customers = await prisma.user.findMany({
      where: { role: 'CUSTOMER', deletedAt: null },
      include: {
        bookings: {
          where: { status: { notIn: ['CANCELLED', 'DRAFT'] }, deletedAt: null },
          select: { totalAmount: true, createdAt: true }
        }
      }
    })

    const leaderboard: VIPStatus[] = customers.map(user => {
      const bookings = user.bookings || []
      const totalSpend = bookings.reduce((sum, b) => sum + Number(b.totalAmount), 0)
      const bookingCount = bookings.length
      
      // Basic LTV Prediction logic: 
      // Current Spend + (Avg Spend per Booking * (1 + Frequency bonus))
      const avgSpend = bookingCount > 0 ? totalSpend / bookingCount : 0
      const predictedLTV = totalSpend + (avgSpend * Math.sqrt(bookingCount))
      
      // Simple health score (based on recency)
      const lastBooking = bookings.sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime())[0]
      const daysSinceLast = lastBooking ? (new Date().getTime() - lastBooking.createdAt.getTime()) / (1000 * 60 * 60 * 24) : 999
      const healthScore = Math.max(0, 100 - (daysSinceLast / 3))

      return {
        id: user.id,
        name: user.name || user.email || 'Anonymous',
        email: user.email || '',
        totalSpend: Math.round(totalSpend),
        bookingCount,
        predictedLTV: Math.round(predictedLTV),
        isVIP: totalSpend > 10000 || bookingCount > 10, // Default threshold
        healthScore: Math.round(healthScore),
        lastBookingDate: lastBooking ? lastBooking.createdAt.toISOString() : null
      }
    })

    const vips = leaderboard.filter(c => c.isVIP)
    const totalVIPRevenue = vips.reduce((sum, c) => sum + c.totalSpend, 0)
    const totalRevenue = leaderboard.reduce((sum, c) => sum + c.totalSpend, 0)

    return {
      customers: leaderboard.sort((a,b) => b.predictedLTV - a.predictedLTV),
      summary: {
        totalVIPs: vips.length,
        vipRevenuePercentage: totalRevenue > 0 ? Math.round((totalVIPRevenue / totalRevenue) * 100) : 0,
        avgVIPLTV: vips.length > 0 ? Math.round(vips.reduce((sum, c) => sum + c.predictedLTV, 0) / vips.length) : 0
      }
    }
  }

  /**
   * Manually toggle VIP status for a user.
   * Note: This uses metadata in a MarketingEvent to track manually assigned VIPs.
   */
  static async toggleVIP(userId: string, isVIP: boolean) {
    return await prisma.marketingEvent.create({
      data: {
        sessionId: `vip_manual_${userId}`,
        eventType: 'VIPStatusChange',
        source: 'admin',
        entityType: 'User',
        entityId: userId,
        metadata: { isVIP, updatedAt: new Date().toISOString() }
      }
    })
  }

  /**
   * Get VIP perks/offers (cached or stored in MarketingEvent).
   */
  static async getVIPPerks() {
    const perk = await prisma.marketingEvent.findFirst({
      where: { eventType: 'VIPPerks' },
      orderBy: { createdAt: 'desc' }
    })
    return perk?.metadata || {
      title: 'باقة النخبة (VIP Perks)',
      offers: [
        'خصم 15% ثابت على جميع الحجوزات',
        'أولوية التوصيل والاستلام مجاناً',
        'ترقية المعدات مجانية عند توفرها',
        'مدير حساب خاص لطلباتك'
      ]
    }
  }

  /**
   * Save/Update VIP perks.
   */
  static async updateVIPPerks(perks: any) {
    return await prisma.marketingEvent.create({
      data: {
        sessionId: 'system_vip_perks',
        eventType: 'VIPPerks',
        source: 'admin',
        metadata: perks
      }
    })
  }
}
