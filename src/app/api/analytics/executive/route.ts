/**
 * @file route.ts
 * @description Executive BI summary – KPIs with real growth, revenue, utilization, customers
 * @module app/api/analytics/executive
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ReportsService } from '@/lib/services/reports.service'
import { handleApiError } from '@/lib/utils/api-helpers'
import { UnauthorizedError } from '@/lib/errors'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) throw new UnauthorizedError()

    const stats = await ReportsService.getDashboardStats(session.user.id)

    return NextResponse.json({
      revenue: stats.revenue,
      bookings: stats.bookings,
      equipment: stats.equipment,
      customers: stats.customers,
      recentActivity: stats.recentActivity.map((a) => ({
        ...a,
        timestamp: a.timestamp instanceof Date ? a.timestamp.toISOString() : a.timestamp,
      })),
    })
  } catch (error) {
    return handleApiError(error)
  }
}
