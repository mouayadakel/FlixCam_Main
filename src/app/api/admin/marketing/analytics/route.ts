import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { JourneyService } from '@/lib/services/journey.service'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const heatmap = await JourneyService.getActivityHeatmap()
    const paths = await JourneyService.getTopConversionPaths()
    const funnel = await JourneyService.getFunnelStats()

    return NextResponse.json({ heatmap, paths, funnel })
  } catch (error: any) {
    console.error('Journey GET failed:', error)
    return NextResponse.json({ error: 'Failed to fetch journey report' }, { status: 500 })
  }
}
