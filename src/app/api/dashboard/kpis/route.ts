/**
 * @file route.ts
 * @description Dashboard KPIs for overview widget (Redis-cached 60s)
 * @module app/api/dashboard/kpis
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getCachedKpis, type DashboardPeriod } from '@/lib/services/dashboard.service'

export const dynamic = 'force-dynamic'

function parsePeriod(value: string | null): DashboardPeriod {
  if (value === 'today' || value === 'week' || value === 'month') return value
  return 'month'
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const period = parsePeriod(request.nextUrl.searchParams.get('period'))
    const data = await getCachedKpis(period)
    return NextResponse.json(data)
  } catch (e) {
    console.error('Dashboard KPIs error:', e)
    return NextResponse.json({ error: 'Failed to load KPIs' }, { status: 500 })
  }
}
