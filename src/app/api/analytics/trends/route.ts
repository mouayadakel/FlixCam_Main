/**
 * @file route.ts
 * @description Revenue and booking trends by period (daily/weekly/monthly)
 * @module app/api/analytics/trends
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { handleApiError } from '@/lib/utils/api-helpers'
import { UnauthorizedError } from '@/lib/errors'
import { subDays, startOfDay, format, startOfWeek, startOfMonth } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) throw new UnauthorizedError()

    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'daily' // daily | weekly | monthly
    const days = Math.min(365, Math.max(7, parseInt(searchParams.get('days') || '30', 10)))
    const endDate = new Date()
    const startDate = subDays(endDate, days)

    const bookings = await prisma.booking.findMany({
      where: {
        deletedAt: null,
        status: { not: 'CANCELLED' },
        startDate: { lte: endDate },
        endDate: { gte: startDate },
      },
      select: {
        startDate: true,
        totalAmount: true,
        createdAt: true,
      },
    })

    const revenueByKey = new Map<string, number>()
    const countByKey = new Map<string, number>()

    const getKey = (d: Date) => {
      if (period === 'monthly') return format(startOfMonth(d), 'yyyy-MM')
      if (period === 'weekly') return format(startOfWeek(d, { weekStartsOn: 0 }), 'yyyy-MM-dd')
      return format(startOfDay(d), 'yyyy-MM-dd')
    }

    for (let i = 0; i < days; i++) {
      const d = subDays(endDate, days - 1 - i)
      const key = getKey(d)
      revenueByKey.set(key, 0)
      countByKey.set(key, 0)
    }

    bookings.forEach((b) => {
      const key = getKey(new Date(b.startDate))
      const currentRevenue = revenueByKey.get(key) ?? 0
      const currentCount = countByKey.get(key) ?? 0
      revenueByKey.set(key, currentRevenue + Number(b.totalAmount || 0))
      countByKey.set(key, currentCount + 1)
    })

    const revenueByPeriod = Array.from(revenueByKey.entries())
      .map(([periodLabel, revenue]) => ({
        period: periodLabel,
        revenue,
        bookings: countByKey.get(periodLabel) ?? 0,
      }))
      .sort((a, b) => a.period.localeCompare(b.period))

    return NextResponse.json({
      period,
      days,
      revenueByPeriod,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
