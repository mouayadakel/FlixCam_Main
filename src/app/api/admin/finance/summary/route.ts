/**
 * @file route.ts
 * @description Aggregate finance KPIs for admin dashboard (payments, invoices, refunds).
 * @module app/api/admin/finance/summary
 */

import { NextResponse } from 'next/server'
import { PaymentStatus } from '@prisma/client'
import { endOfMonth, startOfMonth, subMonths } from 'date-fns'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'

export const dynamic = 'force-dynamic'

function num(d: unknown): number {
  if (d == null) return 0
  if (typeof d === 'object' && d !== null && 'toNumber' in d && typeof (d as { toNumber: () => number }).toNumber === 'function') {
    return (d as { toNumber: () => number }).toNumber()
  }
  return Number(d)
}

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = session.user.role as string | undefined
    if (userRole !== 'ADMIN' && userRole !== 'ACCOUNTANT') {
      const canView = await hasPermission(session.user.id, 'reports.read' as never)
      if (!canView) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const now = new Date()
    const monthStart = startOfMonth(now)
    const monthEnd = endOfMonth(now)
    const prevMonthStart = startOfMonth(subMonths(now, 1))
    const prevMonthEnd = endOfMonth(subMonths(now, 1))

    const paymentSuccessWhere = {
      deletedAt: null,
      status: PaymentStatus.SUCCESS,
    } as const

    const [
      allTimeRevenue,
      thisMonthRevenue,
      lastMonthRevenue,
      pendingInvoiceOutstanding,
      overdueInvoiceCount,
      refundsThisMonth,
    ] = await Promise.all([
      prisma.payment.aggregate({
        where: paymentSuccessWhere,
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: {
          ...paymentSuccessWhere,
          OR: [
            { paidAt: { gte: monthStart, lte: monthEnd } },
            {
              paidAt: null,
              createdAt: { gte: monthStart, lte: monthEnd },
            },
          ],
        },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: {
          ...paymentSuccessWhere,
          OR: [
            { paidAt: { gte: prevMonthStart, lte: prevMonthEnd } },
            {
              paidAt: null,
              createdAt: { gte: prevMonthStart, lte: prevMonthEnd },
            },
          ],
        },
        _sum: { amount: true },
      }),
      prisma.invoice.aggregate({
        where: {
          deletedAt: null,
          status: { in: ['SENT', 'PARTIALLY_PAID'] },
        },
        _sum: { remainingAmount: true },
      }),
      prisma.invoice.count({
        where: {
          deletedAt: null,
          OR: [
            { status: 'OVERDUE' },
            {
              status: { in: ['SENT', 'PARTIALLY_PAID'] },
              dueDate: { lt: now },
            },
          ],
        },
      }),
      prisma.refund.aggregate({
        where: {
          status: 'COMPLETED',
          processedAt: { gte: monthStart, lte: monthEnd },
        },
        _sum: { amount: true },
      }),
    ])

    const revThis = num(thisMonthRevenue._sum.amount)
    const revPrev = num(lastMonthRevenue._sum.amount)
    let monthlyGrowthPct: string | null = null
    if (revPrev > 0) {
      monthlyGrowthPct = (((revThis - revPrev) / revPrev) * 100).toFixed(1)
    } else if (revThis > 0) {
      monthlyGrowthPct = '100'
    }

    return NextResponse.json({
      allTime: { revenue: num(allTimeRevenue._sum.amount) },
      thisMonth: {
        revenue: revThis,
        refunds: num(refundsThisMonth._sum.amount),
      },
      lastMonth: { revenue: revPrev },
      monthlyGrowthPct,
      pendingInvoiceOutstanding: num(pendingInvoiceOutstanding._sum.remainingAmount),
      overdueInvoiceCount,
    })
  } catch (error) {
    logger.error('admin finance summary', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: 'Failed to load summary' }, { status: 500 })
  }
}
