import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { InventoryMarketingService } from '@/lib/services/inventory-marketing.service'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const report = await InventoryMarketingService.getUtilizationReport()
    
    const summary = {
      total: report.length,
      hot: report.filter(r => r.status === 'Hot').length,
      warm: report.filter(r => r.status === 'Warm').length,
      cold: report.filter(r => r.status === 'Cold').length,
      idle: report.filter(r => r.status === 'Idle').length,
      totalRevenue30d: report.reduce((sum, r) => sum + r.revenue30d, 0),
      avgUtilization: report.length > 0 
        ? Math.round(report.reduce((sum, r) => sum + r.utilizationRate, 0) / report.length) 
        : 0
    }

    return NextResponse.json({ report, summary })
  } catch (error: any) {
    console.error('Inventory Marketing GET failed:', error)
    return NextResponse.json({ error: 'Failed to fetch inventory report' }, { status: 500 })
  }
}
