import { ReferralService } from './referral.service'
import { RetentionService } from './retention.service'
import { BudgetService } from './budget.service'
import { VIPService } from './vip.service'
import { JourneyService } from './journey.service'
// Note: SEO and others are mostly database events but these services provide structured data

export class CommandCenterService {
  /**
   * Get an executive overview of the entire Marketing Suite performance.
   */
  static async getGlobalKpis() {
    const [referralData, retentionData, budget, vip, journey] = await Promise.all([
      ReferralService.getReferralStats(),
      RetentionService.getCustomerSegments(),
      BudgetService.getROISummary(),
      VIPService.getVIPLeaderboard(),
      JourneyService.getFunnelStats()
    ])

    // Aggregate Referral Revenue
    const totalReferralRevenue = referralData.reduce((sum, r) => sum + r.revenue, 0)
    const activeReferrers = referralData.length

    // Aggregate Retention Index (simplified: % of Whales + Loyalists)
    const totalCustomers = retentionData.length
    const loyalCount = retentionData.filter(c => c.segment === 'Whale' || c.segment === 'Loyalist').length
    const retentionIndex = totalCustomers > 0 ? Math.round((loyalCount / totalCustomers) * 100) : 0

    // Calculate Marketing Health Score (Weighted average)
    // ROI (40%), Retention (20%), VIP Impact (20%), Funnel (20%)
    const roiFactor = Math.min(100, (budget.summary.overallROI / 500) * 100)
    const retentionFactor = retentionIndex
    const vipFactor = vip.summary.vipRevenuePercentage * 2
    const purchaseFunnel = journey.find((f: any) => f.stage === 'Purchase')?.count || 0
    const viewFunnel = journey.find((f: any) => f.stage === 'ProductView')?.count || 1
    const funnelFactor = (purchaseFunnel / viewFunnel) * 1000 // scale to %

    const healthScore = Math.round(
      (roiFactor * 0.4) + 
      (retentionFactor * 0.2) + 
      (vipFactor * 0.2) + 
      (funnelFactor * 0.2)
    )

    return {
      kpis: [
        { label: 'عائد الاستثمار (Overall ROI)', value: `${budget.summary.overallROI}%`, trend: budget.summary.overallROI > 100 ? 'up' : 'neutral' },
        { label: 'إجمالي الإيرادات المسوقة', value: `${(budget.summary.totalRevenue).toLocaleString()} ر.س`, trend: 'up' },
        { label: 'قوة الإحالات (Referral)', value: totalReferralRevenue.toLocaleString(), trend: 'up' },
        { label: 'نخبة العملاء (VIP)', value: vip.summary.totalVIPs, trend: 'up' },
        { label: 'مؤشر الاستبقاء', value: `${retentionIndex}%`, trend: retentionIndex > 70 ? 'up' : 'down' },
        { label: 'تحويل القمع (CVR)', value: `${(funnelFactor/10).toFixed(1)}%`, trend: funnelFactor > 20 ? 'up' : 'down' }
      ],
      radar: [
        { subject: 'الاستحواذ (ROI)', A: roiFactor, fullMark: 100 },
        { subject: 'الاستبقاء (Retention)', A: retentionFactor, fullMark: 100 },
        { subject: 'الولاء (VIP)', A: vipFactor, fullMark: 100 },
        { subject: 'الكفاءة (Budget)', A: Math.min(100, (roiFactor + (100 - Math.min(100, (budget.summary.totalSpend / 10000) * 100))) / 2), fullMark: 100 },
        { subject: 'القمع (CVR)', A: Math.min(100, funnelFactor * 2), fullMark: 100 }
      ],
      healthScore,
      highlights: [
        { title: 'أفضل قناة أداءً', description: budget.summary.bestROI?.channel || 'N/A', icon: 'zap' },
        { title: 'درجة الدرع (Protection)', description: `${vip.summary.totalVIPs} عميل VIP محمي`, icon: 'shield' },
        { title: 'نمو الإحالات', description: `${activeReferrers} مسوق نشط حالياً`, icon: 'users' }
      ]
    }
  }
}
