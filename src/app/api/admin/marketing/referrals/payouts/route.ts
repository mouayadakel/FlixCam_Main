import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ReferralPayoutService } from '@/lib/services/referral-payout.service'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const payouts = await ReferralPayoutService.listPayouts()
    return NextResponse.json({ payouts })
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { startDate, endDate } = await req.json()
    if (!startDate || !endDate) return NextResponse.json({ error: 'Missing period' }, { status: 400 })

    const payouts = await ReferralPayoutService.generatePayouts(new Date(startDate), new Date(endDate))
    return NextResponse.json({ success: true, count: payouts.length })
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { payoutId, transactionId } = await req.json()
    if (!payoutId || !transactionId) return NextResponse.json({ error: 'Missing data' }, { status: 400 })

    await ReferralPayoutService.markAsPaid(payoutId, transactionId)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
