import { prisma } from '@/lib/db/prisma'

export type AdChannel = 'Google' | 'Meta' | 'TikTok' | 'Snapchat' | 'Referral' | 'Organic'

export interface ChannelROI {
  channel: AdChannel
  spend: number
  revenue: number
  roi: number // %
  conversionCount: number
  cac: number // Cost Per Acquisition
}

export interface BudgetRecommendation {
  channel: AdChannel
  currentAllocation: number
  suggestedAllocation: number
  reason: string
  action: 'increase' | 'decrease' | 'maintain'
}

export class BudgetService {
  /**
   * Get ROI summary per channel for the last 30 days.
   */
  static async getROISummary(): Promise<{ channels: ChannelROI[]; summary: any }> {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // 1. Get spend entries from MarketingEvent (metadata: { channel, amount, date })
    const spendEntries = await prisma.marketingEvent.findMany({
      where: {
        eventType: 'BudgetEntry',
        createdAt: { gte: thirtyDaysAgo }
      }
    })

    // 2. Get revenue events (Purchase) with utm_source/referral attribution
    const sales = await prisma.marketingEvent.findMany({
      where: {
        eventType: 'Purchase',
        createdAt: { gte: thirtyDaysAgo }
      }
    })

    const channels: AdChannel[] = ['Google', 'Meta', 'TikTok', 'Snapchat', 'Referral', 'Organic']
    const report: ChannelROI[] = channels.map(channel => {
      // Sum spend
      const channelSpend = spendEntries
        .filter(e => (e.metadata as any).channel === channel)
        .reduce((sum, e) => sum + Number((e.metadata as any).amount), 0)

      // Sum revenue (attributing via metadata.utm_source or Referral link)
      const channelSales = sales.filter(s => {
        const meta = s.metadata as any
        if (channel === 'Referral') return !!meta.referralCode
        if (channel === 'Organic') return !meta.utm_source && !meta.referralCode
        return meta.utm_source?.toLowerCase() === channel.toLowerCase()
      })

      const revenue = channelSales.reduce((sum, s) => sum + Number((s.metadata as any).value || 0), 0)
      const count = channelSales.length
      
      const roi = channelSpend > 0 ? ((revenue - channelSpend) / channelSpend) * 100 : 0
      const cac = count > 0 ? channelSpend / count : 0

      return {
        channel,
        spend: channelSpend,
        revenue,
        roi: Math.round(roi),
        conversionCount: count,
        cac: Math.round(cac)
      }
    })

    const totalSpend = report.reduce((sum, c) => sum + c.spend, 0)
    const totalRevenue = report.reduce((sum, c) => sum + c.revenue, 0)
    
    return {
      channels: report,
      summary: {
        totalSpend,
        totalRevenue,
        overallROI: totalSpend > 0 ? Math.round(((totalRevenue - totalSpend) / totalSpend) * 100) : 0,
        bestROI: [...report].sort((a,b) => b.roi - a.roi)[0],
      }
    }
  }

  /**
   * Log a new spend entry.
   */
  static async addSpend(channel: AdChannel, amount: number, note?: string) {
    return await prisma.marketingEvent.create({
      data: {
        sessionId: `budget_${channel}_${Date.now()}`,
        eventType: 'BudgetEntry',
        source: 'admin',
        metadata: {
          channel,
          amount,
          note,
          date: new Date().toISOString()
        }
      }
    })
  }

  /**
   * Generate AI-powered budget reallocation suggestions.
   */
  static async getRecommendations(channels: ChannelROI[]): Promise<BudgetRecommendation[]> {
    const totalSpend = channels.reduce((sum, c) => sum + c.spend, 0)
    if (totalSpend === 0) return []

    return channels.map(c => {
      const currentAllocation = Math.round((c.spend / totalSpend) * 100)
      let suggestedAllocation = currentAllocation
      let reason = 'الأداء ضمن النطاق المتوقع.'
      let action: BudgetRecommendation['action'] = 'maintain'

      if (c.roi > 300) {
        suggestedAllocation += 10
        reason = `أداء ممتاز (ROI: ${c.roi}%). ننصح بزيادة الميزانية لاستغلال الزخم.`
        action = 'increase'
      } else if (c.roi < 50 && c.spend > 0) {
        suggestedAllocation -= 10
        reason = `عائد منخفض (ROI: ${c.roi}%). اعتبر تقليل الإنفاق أو تحسين المحتوى الإعلاني.`
        action = 'decrease'
      } else if (c.cac > 200) {
        suggestedAllocation -= 5
        reason = 'تكلفة الاستحواذ (CAC) مرتفعة جداً مقارنة بالمتوسط.'
        action = 'decrease'
      }

      return {
        channel: c.channel,
        currentAllocation,
        suggestedAllocation: Math.max(5, Math.min(60, suggestedAllocation)),
        reason,
        action
      }
    }).filter(r => r.action !== 'maintain' || r.currentAllocation > 20)
  }

  /**
   * Get recent spend history.
   */
  static async getHistory(limit = 15) {
    const entries = await prisma.marketingEvent.findMany({
      where: { eventType: 'BudgetEntry' },
      orderBy: { createdAt: 'desc' },
      take: limit
    })
    return entries.map(e => ({
      id: e.id,
      channel: (e.metadata as any).channel,
      amount: (e.metadata as any).amount,
      note: (e.metadata as any).note,
      date: e.createdAt
    }))
  }
}
