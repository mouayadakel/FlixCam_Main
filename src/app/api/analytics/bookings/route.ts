/**
 * @file route.ts
 * @description Booking analytics API — status breakdown, category breakdown, daily trend
 * @module app/api/analytics/bookings
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
    const days = Number(searchParams.get('days') || '30')
    const since = new Date()
    since.setDate(since.getDate() - days)

    // All bookings in period
    const bookings = await prisma.booking.findMany({
      where: { createdAt: { gte: since }, deletedAt: null },
      select: {
        id: true,
        status: true,
        totalAmount: true,
        createdAt: true,
        equipment: {
          select: {
            equipment: {
              select: { category: { select: { name: true } } },
            },
          },
        },
      },
    })

    // Status breakdown
    const statusCounts: Record<string, number> = {}
    for (const b of bookings) {
      statusCounts[b.status] = (statusCounts[b.status] || 0) + 1
    }
    const byStatus = Object.entries(statusCounts).map(([status, count]) => ({ status, count }))

    // Category breakdown
    const categoryCounts: Record<string, { count: number; revenue: number }> = {}
    for (const b of bookings) {
      for (const eq of b.equipment) {
        const cat = eq.equipment?.category?.name || 'أخرى'
        if (!categoryCounts[cat]) categoryCounts[cat] = { count: 0, revenue: 0 }
        categoryCounts[cat].count += 1
        categoryCounts[cat].revenue += Number(b.totalAmount ?? 0) / (b.equipment.length || 1)
      }
    }
    const byCategory = Object.entries(categoryCounts)
      .map(([category, { count, revenue }]) => ({ category, count, revenue: Math.round(revenue) }))
      .sort((a, b) => b.count - a.count)

    // Daily trend
    const dailyMap: Record<string, { count: number; revenue: number }> = {}
    for (const b of bookings) {
      const day = b.createdAt.toISOString().slice(0, 10)
      if (!dailyMap[day]) dailyMap[day] = { count: 0, revenue: 0 }
      dailyMap[day].count += 1
      dailyMap[day].revenue += Number(b.totalAmount ?? 0)
    }
    const daily = Object.entries(dailyMap)
      .map(([date, { count, revenue }]) => ({ date, count, revenue: Math.round(revenue) }))
      .sort((a, b) => a.date.localeCompare(b.date))

    // Summary
    const totalBookings = bookings.length
    const totalRevenue = bookings.reduce((s, b) => s + Number(b.totalAmount ?? 0), 0)
    const avgValue = totalBookings > 0 ? Math.round(totalRevenue / totalBookings) : 0

    return NextResponse.json({
      days,
      totalBookings,
      totalRevenue: Math.round(totalRevenue),
      avgBookingValue: avgValue,
      byStatus,
      byCategory,
      daily,
    })
  } catch (error) {
    console.error('Booking analytics error:', error)
    return NextResponse.json({ error: 'Failed to generate booking analytics' }, { status: 500 })
  }
}
