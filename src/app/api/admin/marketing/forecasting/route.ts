import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ForecastingService } from '@/lib/services/forecasting.service'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const getAi = searchParams.get('ai') === 'true'

    const forecast = await ForecastingService.getInventoryForecast()
    
    let aiInsights = ""
    if (getAi) {
      aiInsights = await ForecastingService.getAiInsights(forecast)
    }

    return NextResponse.json({ forecast, aiInsights })
  } catch (error: any) {
    console.error('Forecasting GET failed:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
