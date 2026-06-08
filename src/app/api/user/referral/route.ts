import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ReferralService } from '@/lib/services/referral.service'

export async function GET() {
  try {
    const session = await auth()
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const code = await ReferralService.getOrCreateUserReferralCode(session.user.id)
    return NextResponse.json({ code })
  } catch (error) {
    console.error('[REFERRAL_GET]', error)
    return NextResponse.json({ error: 'Internal Error' }, { status: 500 })
  }
}
