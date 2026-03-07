/**
 * @file route.ts
 * @description Customer insights API — top customers, repeat rate, acquisition trend
 * @module app/api/analytics/customers
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!(await hasPermission(session.user.id, PERMISSIONS.DASHBOARD_ANALYTICS))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const days = Number(searchParams.get('days') || '90')
    const since = new Date()
    since.setDate(since.getDate() - days)

    // Top customers by total spend
    const topCustomers = await prisma.booking.groupBy({
      by: ['customerId'],
      where: { createdAt: { gte: since }, deletedAt: null },
      _sum: { totalAmount: true },
      _count: { id: true },
      orderBy: { _sum: { totalAmount: 'desc' } },
      take: 15,
    })

    // Fetch user details for top customers
    const customerIds = topCustomers.map((c) => c.customerId)
    const users = await prisma.user.findMany({
      where: { id: { in: customerIds } },
      select: { id: true, name: true, email: true },
    })
    const userMap = Object.fromEntries(users.map((u) => [u.id, u]))

    const topCustomersList = topCustomers.map((c) => ({
      customerId: c.customerId,
      name: userMap[c.customerId]?.name || 'غير معروف',
      email: userMap[c.customerId]?.email || '',
      totalSpend: Math.round(Number(c._sum.totalAmount ?? 0)),
      bookingCount: c._count.id,
    }))

    // Repeat rate: customers with >1 booking in period
    const allCustomerBookings = await prisma.booking.groupBy({
      by: ['customerId'],
      where: { createdAt: { gte: since }, deletedAt: null },
      _count: { id: true },
    })
    const totalCustomers = allCustomerBookings.length
    const repeatCustomers = allCustomerBookings.filter((c) => c._count.id > 1).length
    const repeatRate = totalCustomers > 0 ? Math.round((repeatCustomers / totalCustomers) * 100) : 0

    // Monthly acquisition trend (new users per month, last 6 months)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    const newUsers = await prisma.user.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true },
    })
    const monthlyAcquisition: Record<string, number> = {}
    for (const u of newUsers) {
      const month = u.createdAt.toISOString().slice(0, 7)
      monthlyAcquisition[month] = (monthlyAcquisition[month] || 0) + 1
    }
    const acquisition = Object.entries(monthlyAcquisition)
      .map(([month, count]) => ({ month, count }))
      .sort((a, b) => a.month.localeCompare(b.month))

    // Active vs inactive
    const totalRegistered = await prisma.user.count()
    const activeInPeriod = totalCustomers

    return NextResponse.json({
      days,
      totalRegistered,
      activeInPeriod,
      repeatCustomers,
      repeatRate,
      topCustomers: topCustomersList,
      acquisition,
    })
  } catch (error) {
    console.error('Customer insights error:', error)
    return NextResponse.json({ error: 'Failed to generate customer insights' }, { status: 500 })
  }
}
