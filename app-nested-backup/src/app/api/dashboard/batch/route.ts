/**
 * @file route.ts
 * @description Batch dashboard API: KPIs + recent bookings in one request (Redis-cached KPIs)
 * @module app/api/dashboard/batch
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { BookingService } from '@/lib/services/booking.service'
import { getCachedKpis } from '@/lib/services/dashboard.service'

export const dynamic = 'force-dynamic'

const RECENT_BOOKINGS_LIMIT = 10

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const [kpis, bookingResult] = await Promise.all([
      getCachedKpis(),
      BookingService.list(session.user.id, { limit: RECENT_BOOKINGS_LIMIT, offset: 0 }),
    ])

    return NextResponse.json({
      kpis,
      recentBookings: bookingResult.data ?? [],
      recentBookingsTotal: bookingResult.total ?? 0,
    })
  } catch (e) {
    console.error('Dashboard batch error:', e)
    return NextResponse.json({ error: 'Failed to load dashboard' }, { status: 500 })
  }
}
