/**
 * @file dashboard/revenue/route.ts
 * @description Dashboard revenue statistics API endpoint
 * @module api/dashboard/revenue
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const period = searchParams.get('period') || 'month'

    // Calculate date ranges based on period
    const now = new Date()
    let startDate: Date
    let previousStartDate: Date
    let previousEndDate: Date

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        previousStartDate = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
        previousEndDate = startDate
        break
      case 'quarter':
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1)
        previousStartDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3 - 3, 1)
        previousEndDate = new Date(startDate.getTime() - 1)
        break
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1)
        previousStartDate = new Date(now.getFullYear() - 1, 0, 1)
        previousEndDate = new Date(now.getFullYear() - 1, 11, 31)
        break
      case 'month':
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        previousEndDate = new Date(now.getFullYear(), now.getMonth(), 0)
        break
    }

    // Parallel queries
    const [
      thisMonthPayments,
      lastMonthPayments,
      pendingPayments,
      successfulPaymentsCount,
      failedPaymentsCount,
      totalBookingsThisPeriod,
    ] = await Promise.all([
      // This period revenue
      prisma.payment.aggregate({
        where: {
          status: 'SUCCESS',
          createdAt: { gte: startDate },
        },
        _sum: { amount: true },
      }),

      // Previous period revenue
      prisma.payment.aggregate({
        where: {
          status: 'SUCCESS',
          createdAt: {
            gte: previousStartDate,
            lte: previousEndDate,
          },
        },
        _sum: { amount: true },
      }),

      // Pending payments
      prisma.payment.aggregate({
        where: { status: 'PENDING' },
        _sum: { amount: true },
      }),

      // Successful payments count
      prisma.payment.count({
        where: {
          status: 'SUCCESS',
          createdAt: { gte: startDate },
        },
      }),

      // Failed payments count
      prisma.payment.count({
        where: {
          status: 'FAILED',
          createdAt: { gte: startDate },
        },
      }),

      // Total bookings this period
      prisma.booking.count({
        where: {
          createdAt: { gte: startDate },
        },
      }),
    ])

    const thisMonthRevenue = Number(thisMonthPayments._sum.amount || 0)
    const lastMonthRevenue = Number(lastMonthPayments._sum.amount || 0)
    const pendingPaymentsAmount = Number(pendingPayments._sum.amount || 0)

    // Calculate growth percentage
    let growthPercentage = 0
    if (lastMonthRevenue > 0) {
      growthPercentage = ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100
    } else if (thisMonthRevenue > 0) {
      growthPercentage = 100
    }

    // Calculate average order value
    const averageOrderValue = totalBookingsThisPeriod > 0 
      ? thisMonthRevenue / totalBookingsThisPeriod 
      : 0

    return NextResponse.json({
      totalRevenue: thisMonthRevenue,
      thisMonthRevenue,
      lastMonthRevenue,
      pendingPayments: pendingPaymentsAmount,
      successfulPayments: successfulPaymentsCount,
      failedPayments: failedPaymentsCount,
      averageOrderValue,
      growthPercentage,
    })
  } catch (error) {
    console.error('Dashboard revenue error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch revenue stats' },
      { status: 500 }
    )
  }
}
