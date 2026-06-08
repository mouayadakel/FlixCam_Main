import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { VIPService } from '@/lib/services/vip.service'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    
    if (searchParams.get('perks') === 'true') {
      const perks = await VIPService.getVIPPerks()
      return NextResponse.json({ perks })
    }

    const report = await VIPService.getVIPLeaderboard()
    return NextResponse.json(report)
  } catch (error: any) {
    console.error('VIP GET failed:', error)
    return NextResponse.json({ error: 'Failed to fetch VIP report' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    
    if (body.type === 'perks') {
      await VIPService.updateVIPPerks(body.perks)
      return NextResponse.json({ success: true })
    }

    if (!body.userId) {
      return NextResponse.json({ error: 'Missing userId' }, { status: 400 })
    }

    await VIPService.toggleVIP(body.userId, body.isVIP)
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('VIP PATCH failed:', error)
    return NextResponse.json({ error: 'Failed to update VIP status' }, { status: 500 })
  }
}
