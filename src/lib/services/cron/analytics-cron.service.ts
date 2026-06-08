/**
 * Analytics & reporting cron jobs.
 */

import { prisma } from '@/lib/db/prisma'
import type { Prisma } from '@prisma/client'
import { subDays, startOfDay, endOfDay } from 'date-fns'
import { sendGa4PurchaseEvents } from '@/lib/integrations/ga4/measurement-protocol'
import { wrapCronJob } from './cron-utils'

async function storeReport(name: string, data: Record<string, unknown>) {
  await prisma.auditLog.create({
    data: {
      action: `cron.report.${name}`,
      resourceType: 'CronReport',
      resourceId: name,
      metadata: data as Prisma.InputJsonValue,
    },
  })
}

export const runDailyRevenueReport = wrapCronJob('daily-revenue-report', async () => {
  const yesterday = subDays(new Date(), 1)
  const from = startOfDay(yesterday)
  const to = endOfDay(yesterday)

  const [bookings, payments, newCustomers] = await Promise.all([
    prisma.booking.findMany({
      where: { createdAt: { gte: from, lte: to }, deletedAt: null },
      select: { totalAmount: true, status: true },
    }),
    prisma.payment.groupBy({
      by: ['status'],
      where: { createdAt: { gte: from, lte: to }, deletedAt: null },
      _count: { id: true },
      _sum: { amount: true },
    }),
    prisma.user.count({
      where: {
        role: { in: ['CUSTOMER', 'DATA_ENTRY'] },
        createdAt: { gte: from, lte: to },
        deletedAt: null,
      },
    }),
  ])

  const revenue = bookings
    .filter((b) => b.status !== 'CANCELLED')
    .reduce((s, b) => s + Number(b.totalAmount), 0)

  const report = {
    date: from.toISOString().slice(0, 10),
    revenue,
    bookingCount: bookings.length,
    newCustomers,
    paymentsByStatus: payments.map((p) => ({
      status: p.status,
      count: p._count.id,
      amount: Number(p._sum.amount ?? 0),
    })),
  }

  await storeReport('daily_revenue', report)
  return report
})

export const runEquipmentUtilizationReport = wrapCronJob('equipment-utilization', async () => {
  const equipment = await prisma.equipment.findMany({
    where: { deletedAt: null, isActive: true },
    select: {
      id: true,
      sku: true,
      model: true,
      quantityTotal: true,
      quantityAvailable: true,
      category: { select: { name: true } },
    },
    take: 500,
  })

  const byCategory: Record<string, { total: number; rented: number }> = {}

  for (const eq of equipment) {
    const cat = eq.category?.name ?? 'Uncategorized'
    if (!byCategory[cat]) byCategory[cat] = { total: 0, rented: 0 }
    byCategory[cat].total += eq.quantityTotal
    byCategory[cat].rented += eq.quantityTotal - eq.quantityAvailable
  }

  const utilizationByCategory = Object.entries(byCategory).map(([category, v]) => ({
    category,
    utilizationRate: v.total > 0 ? Math.round((v.rented / v.total) * 100) : 0,
    totalUnits: v.total,
    rentedUnits: v.rented,
  }))

  const report = {
    date: new Date().toISOString().slice(0, 10),
    equipmentScanned: equipment.length,
    utilizationByCategory,
  }

  await storeReport('equipment_utilization', report)
  return report
})

export const runUserActivitySummary = wrapCronJob('user-activity-summary', async () => {
  const thirtyDaysAgo = subDays(new Date(), 30)
  const sixtyDaysAgo = subDays(new Date(), 60)

  const [totalCustomers, newLast30, activeLast30, repeatRow] = await Promise.all([
    prisma.user.count({
      where: { role: { in: ['CUSTOMER', 'DATA_ENTRY'] }, deletedAt: null },
    }),
    prisma.user.count({
      where: {
        role: { in: ['CUSTOMER', 'DATA_ENTRY'] },
        createdAt: { gte: thirtyDaysAgo },
        deletedAt: null,
      },
    }),
    prisma.booking.groupBy({
      by: ['customerId'],
      where: { createdAt: { gte: thirtyDaysAgo }, deletedAt: null },
    }),
    prisma.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint AS count FROM (
        SELECT "customerId" FROM "Booking" WHERE "deletedAt" IS NULL GROUP BY "customerId" HAVING COUNT(*) > 1
      ) AS repeat_customers
    `,
  ])

  const repeatCustomers = Number(repeatRow[0]?.count ?? 0)

  const churnedEstimate = await prisma.user.count({
    where: {
      role: { in: ['CUSTOMER', 'DATA_ENTRY'] },
      deletedAt: null,
      bookings: { none: { createdAt: { gte: sixtyDaysAgo }, deletedAt: null } },
      createdAt: { lt: sixtyDaysAgo },
    },
  })

  const report = {
    date: new Date().toISOString().slice(0, 10),
    totalCustomers,
    newCustomersLast30Days: newLast30,
    activeCustomersLast30Days: activeLast30.length,
    repeatCustomers,
    estimatedChurned: churnedEstimate,
  }

  await storeReport('user_activity', report)
  return report
})

export const runGa4Sync = wrapCronJob('ga4-sync', async () => {
  const yesterday = subDays(new Date(), 1)
  const bookings = await prisma.booking.findMany({
    where: {
      createdAt: { gte: startOfDay(yesterday), lte: endOfDay(yesterday) },
      deletedAt: null,
      status: { in: ['CONFIRMED', 'ACTIVE', 'CLOSED', 'RETURNED'] },
    },
    select: { id: true, bookingNumber: true, totalAmount: true },
    take: 100,
  })

  const events = bookings.map((b) => ({
    transactionId: b.bookingNumber,
    value: Number(b.totalAmount),
    currency: 'SAR',
    items: [{ item_id: b.id, item_name: b.bookingNumber, price: Number(b.totalAmount), quantity: 1 }],
  }))

  const result = await sendGa4PurchaseEvents(events)

  await storeReport('ga4_sync', {
    bookings: bookings.length,
    ...result,
  })

  return { bookingsScanned: bookings.length, ...result }
})
