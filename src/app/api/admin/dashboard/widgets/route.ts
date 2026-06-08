/**
 * @file route.ts
 * @description GET endpoint for admin dashboard widget data (all widgets in one response)
 * @module app/api/admin/dashboard/widgets
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { getEarningsSummary } from '@/lib/services/earnings.service'
import {
  startOfDay,
  startOfWeek,
  startOfMonth,
  endOfDay,
  addDays,
} from 'date-fns'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = session.user.role as string | undefined
    if (userRole !== 'ADMIN' && userRole !== 'ACCOUNTANT') {
      const { hasPermission } = await import('@/lib/auth/permissions')
      const canView = await hasPermission(session.user.id, 'reports.read' as never)
      if (!canView) {
        return NextResponse.json({ error: 'Forbidden: Admin role required' }, { status: 403 })
      }
    }

    const now = new Date()
    const todayStart = startOfDay(now)
    const todayEnd = endOfDay(now)
    const weekStart = startOfWeek(now, { weekStartsOn: 0 })
    const monthStart = startOfMonth(now)
    const sevenDaysLater = addDays(now, 7)

    const [
      bookingsToday,
      bookingsThisWeek,
      bookingsThisMonth,
      earningsToday,
      earningsThisWeek,
      earningsThisMonth,
      equipmentOut,
      overdueReturns,
      upcomingBookings,
      pendingIdVerifications,
      unsignedContracts,
      outstandingInvoices,
      pendingDeposits,
    ] = await Promise.all([
      prisma.booking.count({
        where: {
          createdAt: { gte: todayStart },
          deletedAt: null,
        },
      }),
      prisma.booking.count({
        where: {
          createdAt: { gte: weekStart },
          deletedAt: null,
        },
      }),
      prisma.booking.count({
        where: {
          createdAt: { gte: monthStart },
          deletedAt: null,
        },
      }),
      getEarningsSummary({ from: todayStart, to: todayEnd }),
      getEarningsSummary({ from: weekStart }),
      getEarningsSummary({ from: monthStart }),
      prisma.bookingEquipment.count({
        where: {
          booking: { status: 'ACTIVE' },
          deletedAt: null,
        },
      }),
      prisma.booking.findMany({
        where: {
          status: 'ACTIVE',
          endDate: { lt: now },
          deletedAt: null,
        },
        select: {
          id: true,
          bookingNumber: true,
          endDate: true,
          customer: { select: { name: true, email: true } },
        },
        orderBy: { endDate: 'asc' },
      }),
      prisma.booking.findMany({
        where: {
          status: 'CONFIRMED',
          startDate: { gte: now, lte: sevenDaysLater },
          deletedAt: null,
        },
        select: {
          id: true,
          bookingNumber: true,
          startDate: true,
          endDate: true,
          totalAmount: true,
          customer: { select: { name: true, email: true } },
        },
        orderBy: { startDate: 'asc' },
        take: 10,
      }),
      prisma.user.count({
        where: {
          verificationStatus: 'PENDING',
          deletedAt: null,
        },
      }),
      prisma.booking.count({
        where: {
          status: 'CONFIRMED',
          contracts: {
            none: {
              signedAt: { not: null },
              deletedAt: null,
            },
          },
          deletedAt: null,
        },
      }),
      prisma.invoice.aggregate({
        where: {
          status: { not: 'PAID' },
          remainingAmount: { gt: 0 },
          deletedAt: null,
        },
        _sum: { remainingAmount: true },
      }),
      prisma.booking.count({
        where: {
          depositAmount: { gt: 0 },
          deletedAt: null,
        },
      }),
    ])

    return NextResponse.json({
      bookingsToday,
      bookingsThisWeek,
      bookingsThisMonth,
      revenueToday: earningsToday.amount,
      revenueThisWeek: earningsThisWeek.amount,
      revenueThisMonth: earningsThisMonth.amount,
      paidOrdersToday: earningsToday.orderCount,
      paidOrdersThisWeek: earningsThisWeek.orderCount,
      paidOrdersThisMonth: earningsThisMonth.orderCount,
      equipmentOut,
      overdueReturns: {
        count: overdueReturns.length,
        list: overdueReturns.map((b) => ({
          id: b.id,
          bookingNumber: b.bookingNumber,
          endDate: b.endDate.toISOString(),
          customerName: b.customer.name ?? b.customer.email,
        })),
      },
      upcomingBookings: upcomingBookings.map((b) => ({
        id: b.id,
        bookingNumber: b.bookingNumber,
        startDate: b.startDate.toISOString(),
        endDate: b.endDate.toISOString(),
        totalAmount: Number(b.totalAmount),
        customerName: b.customer.name ?? b.customer.email,
      })),
      pendingIdVerifications,
      unsignedContracts,
      outstandingInvoices: Number(outstandingInvoices._sum.remainingAmount ?? 0),
      pendingDeposits,
    })
  } catch (error) {
    logger.error({ error, msg: 'Admin dashboard widgets API error' })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
