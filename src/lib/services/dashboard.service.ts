/**
 * @file dashboard.service.ts
 * @description Dashboard KPIs computation and optional Redis caching
 * @module lib/services
 */

import { prisma } from '@/lib/db/prisma'
import { getRedisClient } from '@/lib/queue/redis.client'
import { startOfDay, startOfMonth, startOfWeek } from 'date-fns'
import { getDailyEarningsSeries, getEarningsSummary } from '@/lib/services/earnings.service'

const CACHE_KEY_PREFIX = 'dashboard:kpis'
const CACHE_TTL_SEC = 60
const LOW_STOCK_THRESHOLD = 1

export type DashboardPeriod = 'today' | 'week' | 'month'

export interface DashboardKpis {
  period: DashboardPeriod
  revenue: number
  revenueToday: number
  bookingCount: number
  paidOrderCount: number
  utilization: number
  clientCount: number
  equipmentOut: number
  overdueReturns: number
  lowStockCount: number
  revenueByDay: { date: string; revenue: number }[]
}

function periodStart(period: DashboardPeriod, now: Date): Date {
  if (period === 'today') return startOfDay(now)
  if (period === 'week') return startOfWeek(now, { weekStartsOn: 0 })
  return startOfMonth(now)
}

/**
 * Compute dashboard KPIs for the selected period.
 */
export async function getKpis(period: DashboardPeriod = 'month'): Promise<DashboardKpis> {
  const now = new Date()
  const rangeStart = periodStart(period, now)
  const startOfToday = startOfDay(now)

  const [
    periodEarnings,
    todayEarnings,
    bookingCount,
    totalEquipment,
    activeBookingEquipment,
    newClientBookings,
    revenueByDay,
    equipmentOut,
    overdueReturns,
    lowStockCount,
  ] = await Promise.all([
    getEarningsSummary({ from: rangeStart }),
    getEarningsSummary({ from: startOfToday }),
    prisma.booking.count({
      where: {
        createdAt: { gte: rangeStart },
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
        createdAt: { gte: rangeStart },
        deletedAt: null,
      },
      select: { customerId: true },
      distinct: ['customerId'],
    }),
    getDailyEarningsSeries(period === 'today' ? 1 : period === 'week' ? 7 : 30),
    prisma.bookingEquipment.aggregate({
      where: {
        deletedAt: null,
        booking: { status: 'ACTIVE', deletedAt: null },
      },
      _sum: { quantity: true },
    }),
    prisma.booking.count({
      where: {
        status: 'ACTIVE',
        endDate: { lt: startOfToday },
        deletedAt: null,
      },
    }),
    prisma.equipment.count({
      where: {
        isActive: true,
        deletedAt: null,
        quantityAvailable: { lte: LOW_STOCK_THRESHOLD },
      },
    }),
  ])

  const rentedEquipmentCount = activeBookingEquipment.reduce((s, be) => s + be.quantity, 0)
  const utilization = totalEquipment > 0 ? (rentedEquipmentCount / totalEquipment) * 100 : 0

  return {
    period,
    revenue: periodEarnings.amount,
    revenueToday: todayEarnings.amount,
    bookingCount,
    paidOrderCount: periodEarnings.orderCount,
    utilization,
    clientCount: newClientBookings.length,
    equipmentOut: equipmentOut._sum.quantity ?? 0,
    overdueReturns,
    lowStockCount,
    revenueByDay,
  }
}

function cacheKey(period: DashboardPeriod): string {
  return `${CACHE_KEY_PREFIX}:${period}`
}

/**
 * Return dashboard KPIs, using Redis cache when available (TTL 60s).
 */
export async function getCachedKpis(period: DashboardPeriod = 'month'): Promise<DashboardKpis> {
  const key = cacheKey(period)

  try {
    const redis = getRedisClient()
    const cached = await redis.get(key)
    if (cached) {
      return JSON.parse(cached) as DashboardKpis
    }
  } catch {
    // Redis unavailable
  }

  const data = await getKpis(period)

  try {
    const redis = getRedisClient()
    await redis.setex(key, CACHE_TTL_SEC, JSON.stringify(data))
  } catch {
    // ignore
  }

  return data
}

export async function invalidateDashboardKpisCache(): Promise<void> {
  try {
    const redis = getRedisClient()
    const keys = await redis.keys(`${CACHE_KEY_PREFIX}:*`)
    if (keys.length > 0) {
      await redis.del(...keys)
    }
  } catch {
    // Redis unavailable
  }
}
