import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth'
import { ReferralService } from '@/lib/services/referral.service'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const stats = await ReferralService.getReferralStats()
    return NextResponse.json({ stats })
  } catch (error: any) {
    console.error('Referrals GET failed:', error)
    return NextResponse.json({ error: 'Failed to fetch referrals' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const { code, sessionId, url, name, userId, commissionRate } = await req.json()
    
    // Case 1: Create a NEW influencer code (Admin action)
    if (name) {
      const session = await auth()
      if (!session || session.user.role !== 'ADMIN') {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      const newCode = await ReferralService.createInfluencerCode(name, userId, commissionRate)
      return NextResponse.json({ success: true, code: newCode })
    }

    // Case 2: Track an INCOMING referral click (Public action)
    if (!code || !sessionId) return NextResponse.json({ error: 'Missing data' }, { status: 400 })
    await ReferralService.trackReferral(code, sessionId, url)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: 'Operation failed' }, { status: 500 })
  }
}
