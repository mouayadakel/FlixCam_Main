import { prisma } from '@/lib/db/prisma'
import { GoogleGenerativeAI } from '@google/generative-ai'

export interface CompetitorPrice {
  id: string
  competitorName: string
  equipmentName: string
  price: number
  date: string
}

export interface MarketAlert {
  id: string
  equipmentName: string
  flixcamPrice: number
  competitorAvg: number
  gap: number // %
  status: 'better' | 'worse' | 'neutral'
  suggestion: string
}

export class CompetitorService {
  /**
   * Get competitor price tracking data.
   */
  static async getCompetitorPrices(): Promise<CompetitorPrice[]> {
    const events = await prisma.marketingEvent.findMany({
      where: { eventType: 'CompetitorPrice' },
      orderBy: { createdAt: 'desc' },
      take: 50
    })

    return events.map(e => {
      const meta = e.metadata as any
      return {
        id: e.id,
        competitorName: meta.competitorName,
        equipmentName: meta.equipmentName,
        price: Number(meta.price),
        date: e.createdAt.toISOString()
      }
    })
  }

  /**
   * Compare our prices with competitor benchmarks and generate tactical alerts via AI.
   */
  static async getMarketComparison(): Promise<{ alerts: MarketAlert[]; summary: any }> {
    const equipment = await prisma.equipment.findMany({
      where: { isActive: true, deletedAt: null },
      select: { id: true, sku: true, dailyPrice: true, productName: true, product: { select: { name: true } } }
    } as any)

    const competitorPrices = await this.getCompetitorPrices()
    
    const rawAlerts: any[] = []
    let betterCount = 0
    let worseCount = 0

    for (const item of (equipment as any[])) {
      const itemName = item.product?.name || item.productName || item.sku
      const ourPrice = Number(item.dailyPrice)
      
      const itemBenchmarks = competitorPrices.filter(cp => 
        cp.equipmentName.toLowerCase().includes(itemName.toLowerCase()) ||
        itemName.toLowerCase().includes(cp.equipmentName.toLowerCase())
      )

      if (itemBenchmarks.length === 0) continue

      const avgCompPrice = itemBenchmarks.reduce((sum, cp) => sum + cp.price, 0) / itemBenchmarks.length
      const gap = ((ourPrice - avgCompPrice) / avgCompPrice) * 100

      if (gap < -10) betterCount++
      else if (gap > 10) worseCount++

      rawAlerts.push({
        id: item.id,
        equipmentName: itemName,
        flixcamPrice: ourPrice,
        competitorAvg: Math.round(avgCompPrice),
        gap: Math.round(gap),
        status: gap < -10 ? 'better' : gap > 10 ? 'worse' : 'neutral'
      })
    }

    // AI Tactical Suggestion Generation for the Top 10 most critical gaps
    const criticalItems = rawAlerts
      .sort((a,b) => Math.abs(b.gap) - Math.abs(a.gap))
      .slice(0, 8)

    let finalAlerts = rawAlerts
    try {
      const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
      if (apiKey && criticalItems.length > 0) {
        const genAI = new GoogleGenerativeAI(apiKey)
        const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
        
        const prompt = `You are a Pricing Strategist for FlixCam. 
Analyze these price gaps vs competitors and suggest a short tactical Arabic "suggestion" (max 15 words) for each.
GAPS: ${JSON.stringify(criticalItems.map(i => ({ name: i.equipmentName, gap: i.gap })))}

STRICT JSON OUTPUT:
{"suggestions": {"ITEM_NAME": "ARABIC_SUGGESTION"}}`

        const result = await model.generateContent(prompt)
        const aiResponse = JSON.parse(result.response.text().replace(/```json|```/g, '').trim())
        
        finalAlerts = rawAlerts.map(a => ({
          ...a,
          suggestion: aiResponse.suggestions[a.equipmentName] || (a.gap > 0 ? 'سعرك أعلى من السوق، ركز على خدمات القيمة المضافة.' : 'أنت الأوفر في السوق، استغل هذا في حملات "أفضل سعر".')
        }))
      } else {
        throw new Error('No AI')
      }
    } catch (e) {
      // Fallback to simple logic
      finalAlerts = rawAlerts.map(a => ({
        ...a,
        suggestion: a.gap < -10 
          ? `أنت أوفر بـ ${Math.abs(a.gap)}% من السوق. أطلق حملة "أفضل سعر مضمون".`
          : a.gap > 10 
          ? `سعرك أعلى بـ ${a.gap}%. ركّز في التسويق على الجودة العالية.`
          : 'سعرك منافس جداً حالياً.'
      }))
    }

    return {
      alerts: finalAlerts.sort((a,b) => b.gap - a.gap),
      summary: {
        totalTracked: finalAlerts.length,
        betterCount,
        worseCount,
        marketPosition: worseCount > betterCount ? 'Premium' : betterCount > worseCount ? 'Aggressive' : 'Balanced'
      }
    }
  }

  /**
   * Log a competitor price entry.
   */
  static async logCompetitorPrice(data: { competitorName: string; equipmentName: string; price: number }) {
    return await prisma.marketingEvent.create({
      data: {
        sessionId: `comp_${Date.now()}`,
        eventType: 'CompetitorPrice',
        source: 'admin',
        metadata: {
          competitorName: data.competitorName,
          equipmentName: data.equipmentName,
          price: data.price
        }
      }
    })
  }
}
