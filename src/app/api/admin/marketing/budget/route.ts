import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { BudgetService } from '@/lib/services/budget.service'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const report = await BudgetService.getROISummary()
    const recommendations = await BudgetService.getRecommendations(report.channels)
    const history = await BudgetService.getHistory()

    return NextResponse.json({ ...report, recommendations, history })
  } catch (error: any) {
    console.error('Budget GET failed:', error)
    return NextResponse.json({ error: 'Failed to fetch budget report' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { channel, amount, note } = await req.json()
    if (!channel || !amount) {
      return NextResponse.json({ error: 'Missing channel or amount' }, { status: 400 })
    }

    await BudgetService.addSpend(channel, amount, note)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Budget POST failed:', error)
    return NextResponse.json({ error: 'Failed to add budget entry' }, { status: 500 })
  }
}
