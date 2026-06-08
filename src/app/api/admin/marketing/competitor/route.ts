import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { CompetitorService } from '@/lib/services/competitor.service'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const report = await CompetitorService.getMarketComparison()
    const history = await CompetitorService.getCompetitorPrices()

    return NextResponse.json({ ...report, history })
  } catch (error: any) {
    console.error('Competitor GET failed:', error)
    return NextResponse.json({ error: 'Failed to fetch competitor report' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    if (!body.competitorName || !body.equipmentName || !body.price) {
      return NextResponse.json({ error: 'Missing data' }, { status: 400 })
    }

    await CompetitorService.logCompetitorPrice(body)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Competitor POST failed:', error)
    return NextResponse.json({ error: 'Failed to log competitor data' }, { status: 500 })
  }
}
