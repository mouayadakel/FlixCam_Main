import { prisma } from '@/lib/db/prisma'
import { GoogleGenerativeAI } from '@google/generative-ai'

export interface ForecastResult {
  equipmentId: string
  name: string
  category: string
  totalQuantity: number
  predictedDemand: number
  utilizationRate: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
  recommendation: string
}

export class ForecastingService {
  /**
   * Analyzes historical demand and predicts future stock requirements.
   */
  static async getInventoryForecast() {
    // 1. Fetch active inventory
    const inventory = await prisma.equipment.findMany({
      where: { deletedAt: null },
      include: { 
        category: true,
        bookings: {
          where: { 
            booking: { 
              status: { notIn: ['CANCELLED'] },
              startDate: { gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) } // Past 6 months
            } 
          },
          select: { quantity: true, booking: { select: { startDate: true } } }
        }
      }
    })

    const results: ForecastResult[] = []

    for (const item of inventory as any) {
      const historicalTotal = (item.bookings as any[]).reduce((sum, b) => sum + b.quantity, 0)
      const avgMonthlyDemand = historicalTotal / 6
      const predictedDemand = Math.ceil(avgMonthlyDemand * 1.2) // 20% growth buffer
      
      const utilizationRate = item.quantityTotal > 0 ? (avgMonthlyDemand / item.quantityTotal) : 0
      
      let riskLevel: ForecastResult['riskLevel'] = 'LOW'
      if (utilizationRate > 0.8 || predictedDemand >= item.quantityTotal) riskLevel = 'HIGH'
      else if (utilizationRate > 0.5) riskLevel = 'MEDIUM'

      results.push({
        equipmentId: item.id,
        name: item.model || 'Unknown',
        category: item.category?.name || 'Uncategorized',
        totalQuantity: item.quantityTotal,
        predictedDemand,
        utilizationRate,
        riskLevel,
        recommendation: this.getBasicRecommendation(riskLevel, item.quantityTotal, predictedDemand)
      })
    }

    return results
  }

  private static getBasicRecommendation(risk: string, total: number, predicted: number): string {
    if (risk === 'HIGH') return `Risk of stockout. Consider adding at least ${Math.max(1, predicted - total + 2)} more units.`
    if (risk === 'MEDIUM') return `Healthy utilization. Monitor for peak season surges.`
    return `Underutilized. Consider marketing campaigns or bundling to increase demand.`
  }

  /**
   * Enhances the forecast with AI-driven strategic insights.
   */
  static async getAiInsights(forecasts: ForecastResult[]) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!apiKey) return "AI Insights unavailable (API Key not set)."

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const highRiskItems = forecasts.filter(f => f.riskLevel === 'HIGH').slice(0, 5)
    if (highRiskItems.length === 0) return "Global stock levels are healthy. No critical procurement needs identified."

    const prompt = `As a Senior Inventory Strategist for FlixCam (Premium Cinema Rental), analyze these high-risk items:
    ${highRiskItems.map(i => `- ${i.name} (${i.category}): Quantity ${i.totalQuantity}, Predicted Demand ${i.predictedDemand}`).join('\n')}
    
    Provide a concise strategic procurement and marketing plan in Arabic to optimize inventory for the next quarter. Highlight which items are priority 1.`

    try {
      const result = await model.generateContent(prompt)
      return result.response.text().trim()
    } catch (error) {
      console.error('Forecasting AI failed:', error)
      return "Failed to generate AI insights."
    }
  }
}
