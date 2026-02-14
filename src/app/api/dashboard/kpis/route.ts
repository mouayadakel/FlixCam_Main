/**
 * @file route.ts
 * @description Dashboard KPIs for overview widget
 * @module app/api/dashboard/kpis
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { startOfMonth, subDays } from 'date-fns'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const now = new Date()
    const startOfCurrentMonth = startOfMonth(now)

    const [revenueData, bookingCount, totalEquipment, activeBookingEquipment, newClientBookings] = await Promise.all([
      prisma.payment.findMany({
        where: {
          status: 'SUCCESS',
          createdAt: { gte: startOfCurrentMonth },
          deletedAt: null,
        },
        select: { amount: true },
      }),
      prisma.booking.count({
        where: {
          createdAt: { gte: startOfCurrentMonth },
          deletedAt: null,
        },
      }),
      prisma.equipment.count({
        where: { isActive: true, deletedAt: null },
      }),
      prisma.bookingEquipment.findMany({
        where: {
          booking: { status: { in: ['CONFIRMED', 'ACTIVE'] }, deletedAt: null },
          deletedAt: null,
        },
        select: { quantity: true },
      }),
      prisma.booking.findMany({
        where: {
          createdAt: { gte: startOfCurrentMonth },
          deletedAt: null,
        },
        select: { customerId: true },
        distinct: ['customerId'],
      }),
    ])

    const revenue = revenueData.reduce((s, p) => s + Number(p.amount || 0), 0)
    const rentedEquipmentCount = activeBookingEquipment.reduce((s, be) => s + be.quantity, 0)
    const utilization = totalEquipment > 0 ? (rentedEquipmentCount / totalEquipment) * 100 : 0

    const revenueByDay = []
    for (let i = 6; i >= 0; i--) {
      const date = subDays(now, i)
      const dayStart = new Date(date)
      dayStart.setHours(0, 0, 0, 0)
      const dayEnd = new Date(date)
      dayEnd.setHours(23, 59, 59, 999)
      const dayPayments = await prisma.payment.findMany({
        where: {
          status: 'SUCCESS',
          createdAt: { gte: dayStart, lte: dayEnd },
          deletedAt: null,
        },
        select: { amount: true },
      })
      revenueByDay.push({
        date: dayStart.toISOString(),
        revenue: dayPayments.reduce((s, p) => s + Number(p.amount || 0), 0),
      })
    }

    return NextResponse.json({
      revenue,
      bookingCount,
      utilization,
      clientCount: newClientBookings.length,
      revenueByDay,
    })
  } catch (e) {
    console.error('Dashboard KPIs error:', e)
    return NextResponse.json({ error: 'Failed to load KPIs' }, { status: 500 })
  }
}
