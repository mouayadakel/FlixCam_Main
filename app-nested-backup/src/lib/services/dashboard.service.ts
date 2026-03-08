/**
 * @file dashboard.service.ts
 * @description Dashboard KPIs computation and optional Redis caching
 * @module lib/services
 */

import { prisma } from '@/lib/db/prisma'
import { getRedisClient } from '@/lib/queue/redis.client'
import { startOfMonth, subDays } from 'date-fns'

const CACHE_KEY = 'dashboard:kpis'
const CACHE_TTL_SEC = 60

export interface DashboardKpis {
  revenue: number
  bookingCount: number
  utilization: number
  clientCount: number
  revenueByDay: { date: string; revenue: number }[]
}

/**
 * Compute dashboard KPIs (month revenue, bookings, utilization, clients, last 7 days revenue).
 */
export async function getKpis(): Promise<DashboardKpis> {
  const now = new Date()
  const startOfCurrentMonth = startOfMonth(now)

  const [revenueData, bookingCount, totalEquipment, activeBookingEquipment, newClientBookings] =
    await Promise.all([
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

  const revenueByDay: { date: string; revenue: number }[] = []
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

  return {
    revenue,
    bookingCount,
    utilization,
    clientCount: newClientBookings.length,
    revenueByDay,
  }
}

/**
 * Return dashboard KPIs, using Redis cache when available (TTL 60s).
 */
export async function getCachedKpis(): Promise<DashboardKpis> {
  try {
    const redis = getRedisClient()
    const cached = await redis.get(CACHE_KEY)
    if (cached) {
      return JSON.parse(cached) as DashboardKpis
    }
  } catch {
    // Redis unavailable
  }

  const data = await getKpis()

  try {
    const redis = getRedisClient()
    await redis.setex(CACHE_KEY, CACHE_TTL_SEC, JSON.stringify(data))
  } catch {
    // ignore
  }

  return data
}
