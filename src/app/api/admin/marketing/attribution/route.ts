import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { AttributionService } from '@/lib/services/attribution.service'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const startDate = searchParams.get('startDate') ? new Date(searchParams.get('startDate')!) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : new Date()
    const model = (searchParams.get('model') || 'LINEAR') as any

    const roas = await AttributionService.getGlobalROAS(startDate, endDate, model)
    
    return NextResponse.json({ roas })
  } catch (error: any) {
    console.error('Attribution GET failed:', error)
    return NextResponse.json({ error: 'Failed' }, { status: 500 })
  }
}
