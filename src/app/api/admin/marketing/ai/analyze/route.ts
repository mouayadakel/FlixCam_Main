import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth'
import { GoogleGenerativeAI } from '@google/generative-ai'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 1. Collect Marketing Data for Analysis
    // 1. Collect Marketing Data for Analysis
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    
    const [eventsByDay, campaignData, seoGaps, trafficCount, bookingCount, abandonedCarts] = await Promise.all([
      // Daily trends (last 30 days)
      prisma.$queryRaw`
        SELECT 
          date_trunc('day', "createdAt") as date,
          "eventType",
          COUNT(*) as count
        FROM "MarketingEvent"
        WHERE "createdAt" > now() - interval '30 days'
        GROUP BY 1, 2
        ORDER BY 1 ASC
      `,
      // Campaign ROI/Metadata
      prisma.marketingEvent.findMany({
        where: {
          createdAt: { gte: thirtyDaysAgo },
          metadata: { path: ['utm_source'], not: null as any }
        },
        select: { eventType: true, value: true, metadata: true }
      }),
      // SEO Gaps (Corrected schema: ProductTranslation)
      prisma.productTranslation.count({
        where: { locale: 'ar', seoDescription: '' }
      }),
      // Total Traffic vs Bookings for Conv Rate
      prisma.marketingEvent.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.booking.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      // Abandoned Value
      prisma.cart.findMany({
        where: { updatedAt: { gte: thirtyDaysAgo, lte: new Date(Date.now() - 2 * 3600 * 1000) }, booking: { is: null } },
        select: { total: true }
      })
    ])

    const convRate = trafficCount > 0 ? (bookingCount / trafficCount) * 100 : 0
    const abandonedValue = abandonedCarts.reduce((sum, cart) => sum + Number(cart.total), 0)

    // Aggregate campaign stats for the prompt
    const campaigns: Record<string, any> = {}
    ;(campaignData as any[]).forEach(ev => {
      const source = (ev.metadata as any)?.utm_source || 'unknown'
      if (!campaigns[source]) campaigns[source] = { views: 0, conversions: 0, value: 0 }
      
      const type = ev.eventType.toLowerCase()
      if (type.includes('view')) campaigns[source].views++
      if (type.includes('purchase') || type.includes('lead') || type.includes('booking')) {
        campaigns[source].conversions++
        campaigns[source].value += Number(ev.value || 0)
      }
    })

    // 2. Prepare AI Prompt
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'AI API Key not configured' }, { status: 500 })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })

    const prompt = `You are a Chief Marketing Officer for FlixCam (Premium Cinema Gear).
Analyze the last 30 days of data and provide a high-level strategic summary.

METRICS:
- Conversion Rate: ${convRate.toFixed(2)}% (${bookingCount} bookings / ${trafficCount} visits)
- Abandoned Recovery Potential: $${abandonedValue}
- SEO Debt: ${seoGaps} items missing descriptions.
- Campaign Performance: ${JSON.stringify(campaigns)}
- Event Trends: ${JSON.stringify(eventsByDay)}

OUTPUT FORMAT (JSON):
{
  "summaryAr": "A visionary 2-3 sentence summary in Arabic focusing on growth.",
  "topWins": ["Achievement 1 in Arabic", "Achievement 2 in Arabic"],
  "opportunities": ["Growth Lever 1 in Arabic", "Growth Lever 2 in Arabic"],
  "score": 0-100 (Overall health)
}

Be critical but encouraging. Use professional high-end Arabic terminology.`

    const result = await model.generateContent(prompt)
    const responseText = result.response.text().trim()
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    const analysis = jsonMatch ? JSON.parse(jsonMatch[0]) : JSON.parse(responseText)

    return NextResponse.json(analysis)
  } catch (error: any) {
    console.error('AI Marketing Analysis failed:', error)
    return NextResponse.json({ error: 'Failed to analyze data' }, { status: 500 })
  }
}
