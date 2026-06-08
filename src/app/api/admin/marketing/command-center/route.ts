import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { CommandCenterService } from '@/lib/services/command-center.service'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const report = await CommandCenterService.getGlobalKpis()
    return NextResponse.json(report)
  } catch (error: any) {
    console.error('Command center GET failed:', error)
    return NextResponse.json({ error: 'Failed to fetch command center report' }, { status: 500 })
  }
}
