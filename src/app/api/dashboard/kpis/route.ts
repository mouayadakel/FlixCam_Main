/**
 * @file route.ts
 * @description Dashboard KPIs for overview widget (Redis-cached 60s)
 * @module app/api/dashboard/kpis
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { getCachedKpis } from '@/lib/services/dashboard.service'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const data = await getCachedKpis()
    return NextResponse.json(data)
  } catch (e) {
    console.error('Dashboard KPIs error:', e)
    return NextResponse.json({ error: 'Failed to load KPIs' }, { status: 500 })
  }
}
