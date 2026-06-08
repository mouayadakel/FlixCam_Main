import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 1. Gather Data for AI Analysis
    // - SEO Gaps
    const productsMissingSeo = await prisma.productTranslation.count({
      where: { locale: 'ar', OR: [{ seoDescription: '' }] }
    })
    const studiosMissingSeo = await prisma.studio.count({
      where: { OR: [{ metaDescription: '' }, { metaDescription: null }] }
    })

    // - Performance (Last 30 days)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    
    // Total Traffic vs Conversions (Bookings)
    const [trafficEvents, bookingsCount] = await Promise.all([
      prisma.marketingEvent.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.booking.count({ where: { createdAt: { gte: thirtyDaysAgo } } })
    ])
    const convRate = trafficEvents > 0 ? (bookingsCount / trafficEvents) * 100 : 0

    // - High-Value Leads (LTV Potential > 5000)
    // We check metadata->>'score' which is stored as a string in Json but we cast it or use path
    const highValueLeads = await prisma.marketingEvent.count({
      where: { 
        eventType: 'Lead',
        metadata: {
          path: ['score'],
          gte: 80
        }
      }
    })

    // - Abandoned Cart Value
    // A cart is "abandoned" if it's older than 2 hours and has no associated booking
    const twoHoursAgo = new Date()
    twoHoursAgo.setHours(twoHoursAgo.getHours() - 2)
    
    const abandonedCarts = await prisma.cart.findMany({
      where: { 
        updatedAt: { gte: thirtyDaysAgo, lte: twoHoursAgo },
        booking: { is: null }
      },
      select: { total: true }
    })
    const totalAbandonedValue = abandonedCarts.reduce((sum, cart) => sum + Number(cart.total), 0)

    // - Inventory Gaps (Low Utilization)
    const { InventoryMarketingService } = await import('@/lib/services/inventory-marketing.service')
    const utilization = await InventoryMarketingService.getUtilizationReport()
    const idleGear = utilization.filter(u => u.status === 'Idle' || u.status === 'Cold').slice(0, 5)

    // - Competitor Gaps
    const { CompetitorService } = await import('@/lib/services/competitor.service')
    const market = await CompetitorService.getMarketComparison()
    const priceGaps = market.alerts.filter(a => a.status === 'worse').slice(0, 5)

    // 2. prompt Gemini to generate "Actions"
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
    const genAI = new GoogleGenerativeAI(apiKey!)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const prompt = `You are a Senior Strategic AI for FlixCam (Premium Cinema Rental).
Analyze these LIVE metrics and suggest 5 high-impact "Strategic Actions" to maximize ROI.

METRICS:
1. CONVERSION: ${convRate.toFixed(2)}% (${bookingsCount} bookings from ${trafficEvents} visits).
2. RECOVERY: $${totalAbandonedValue} currently trapped in abandoned carts.
3. LEADS: ${highValueLeads} high-intent leads awaiting follow-up.
4. SEO: ${productsMissingSeo} products lack meta descriptions.
5. INVENTORY: These high-value items are IDLE: ${idleGear.map(i => i.name).join(', ')}.
6. COMPETITION: These items are >10% more expensive than market: ${priceGaps.map(g => g.equipmentName).join(', ')}.

STRICT JSON OUTPUT FORMAT:
[
  {
    "id": "unique-slug",
    "title": "Arabic strategic title",
    "description": "Evidence-based Arabic description with projected impact",
    "priority": "critical" | "high" | "medium",
    "type": "conversion" | "recovery" | "seo" | "pricing" | "inventory",
    "actionLabel": "Arabic call to action",
    "actionLink": "/admin/marketing/..."
  }
]

Growth Strategies:
- If Conversion < 2%, suggest A/B testing or trust signals.
- If Abandoned Value > 1000, prioritize "Cart Recovery Automations".
- If High-Value Leads exist, suggest "Personalized VIP Outreach".
- If idle gear exists, suggest "Package Bundling" or "Flash Rent".
- Professional, persuasive, CEO-level Arabic.`

    const result = await model.generateContent(prompt)
    const text = result.response.text()
    const cleanText = text.replace(/```json|```/g, '').trim()
    const tasks = JSON.parse(cleanText)

    return NextResponse.json(tasks)
  } catch (error: any) {
    console.error('AI Strategy Tasks failed:', error)
    return NextResponse.json({ error: 'Failed to generate strategy' }, { status: 500 })
  }
}
