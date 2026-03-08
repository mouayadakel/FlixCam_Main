/**
 * @file route.ts
 * @description GET endpoint for admin reports data (revenue, bookings, equipment, customers, financial)
 * @module app/api/admin/reports
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import {
  startOfDay,
  endOfDay,
  subDays,
  differenceInDays,
  eachDayOfInterval,
  startOfWeek,
  startOfMonth,
} from 'date-fns'

const REPORT_TYPES = ['revenue', 'bookings', 'equipment', 'customers', 'financial'] as const
type ReportType = (typeof REPORT_TYPES)[number]

function parseDate(dateStr: string | null): Date | null {
  if (!dateStr) return null
  const d = new Date(dateStr)
  return isNaN(d.getTime()) ? null : d
}

function getDefaultRange(): { start: Date; end: Date } {
  const end = new Date()
  const start = subDays(end, 30)
  return { start, end }
}

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') as ReportType | null
    const startDateStr = searchParams.get('startDate')
    const endDateStr = searchParams.get('endDate')

    if (!type || !REPORT_TYPES.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid type. Use: revenue|bookings|equipment|customers|financial' },
        { status: 400 }
      )
    }

    const { start, end } = (() => {
      const s = parseDate(startDateStr)
      const e = parseDate(endDateStr)
      if (s && e && s <= e) return { start: s, end: e }
      return getDefaultRange()
    })()

    const rangeStart = startOfDay(start)
    const rangeEnd = endOfDay(end)
    const totalDays = differenceInDays(rangeEnd, rangeStart) + 1

    let data: Record<string, unknown> = {}

    switch (type) {
      case 'revenue': {
        const [paidInvoices, invoicesWithBooking] = await Promise.all([
          prisma.invoice.aggregate({
            where: {
              status: 'PAID',
              paidDate: { gte: rangeStart, lte: rangeEnd },
              deletedAt: null,
            },
            _sum: { totalAmount: true },
          }),
          prisma.invoice.findMany({
            where: {
              status: 'PAID',
              paidDate: { gte: rangeStart, lte: rangeEnd },
              deletedAt: null,
              bookingId: { not: null },
            },
            include: {
              booking: {
                include: {
                  equipment: {
                    include: {
                      equipment: {
                        include: { category: { select: { id: true, name: true } } },
                      },
                    },
                  },
                },
              },
            },
          }),
        ])

        const totalRevenue = Number(paidInvoices._sum.totalAmount ?? 0)

        const revenueByCategoryMap = new Map<string, number>()
        const itemRevenueMap = new Map<string, { name: string; revenue: number }>()
        invoicesWithBooking.forEach((inv) => {
          const amt = Number(inv.totalAmount ?? 0)
          const booking = inv.booking
          if (!booking?.equipment?.length) return
          const perItem = amt / booking.equipment.length
          booking.equipment.forEach((be) => {
            const cat = be.equipment.category
            const catName = cat?.name ?? 'Uncategorized'
            revenueByCategoryMap.set(catName, (revenueByCategoryMap.get(catName) ?? 0) + perItem)
            const eqName = be.equipment.model ?? be.equipment.sku ?? be.equipmentId
            const existing = itemRevenueMap.get(be.equipmentId)
            if (existing) {
              existing.revenue += perItem
            } else {
              itemRevenueMap.set(be.equipmentId, { name: eqName, revenue: perItem })
            }
          })
        })

        const revenueByCategory = Array.from(revenueByCategoryMap.entries()).map(([category, amount]) => ({
          category,
          amount,
        }))

        const topItemsByRevenue = Array.from(itemRevenueMap.values())
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 10)

        const dailyRevenue = await Promise.all(
          eachDayOfInterval({ start: rangeStart, end: rangeEnd }).map(async (day) => {
            const dayStart = startOfDay(day)
            const dayEnd = endOfDay(day)
            const agg = await prisma.invoice.aggregate({
              where: {
                status: 'PAID',
                paidDate: { gte: dayStart, lte: dayEnd },
                deletedAt: null,
              },
              _sum: { totalAmount: true },
            })
            return { date: day.toISOString().split('T')[0], amount: Number(agg._sum.totalAmount ?? 0) }
          })
        )

        data = {
          totalRevenue,
          revenueByCategory,
          topItemsByRevenue,
          dailyRevenue,
        }
        break
      }

      case 'bookings': {
        const [counts, bookings, byStatus] = await Promise.all([
          prisma.booking.groupBy({
            by: ['status'],
            where: {
              createdAt: { gte: rangeStart, lte: rangeEnd },
              deletedAt: null,
            },
            _count: { id: true },
            _sum: { totalAmount: true },
          }),
          prisma.booking.findMany({
            where: {
              createdAt: { gte: rangeStart, lte: rangeEnd },
              deletedAt: null,
            },
            include: {
              equipment: {
                include: { equipment: { select: { id: true, model: true, sku: true } } },
              },
            },
          }),
          prisma.booking.groupBy({
            by: ['status'],
            where: {
              createdAt: { gte: rangeStart, lte: rangeEnd },
              deletedAt: null,
            },
            _count: { id: true },
          }),
        ])

        const totalBookings = counts.reduce((s, c) => s + c._count.id, 0)
        const confirmed = counts.find((c) => c.status === 'CONFIRMED')?._count.id ?? 0
        const completed = counts.find((c) => c.status === 'CLOSED' || c.status === 'RETURNED')?._count.id ?? 0
        const cancelled = counts.find((c) => c.status === 'CANCELLED')?._count.id ?? 0
        const totalRevenue = counts.reduce((s, c) => s + Number(c._sum.totalAmount ?? 0), 0)
        const cancellationRate = totalBookings > 0 ? (cancelled / totalBookings) * 100 : 0
        const averageBookingValue = totalBookings > 0 ? totalRevenue / totalBookings : 0

        const itemCountMap = new Map<string, { name: string; count: number }>()
        bookings.forEach((b) => {
          b.equipment.forEach((be) => {
            const eqName = be.equipment.model ?? be.equipment.sku ?? be.equipmentId
            const existing = itemCountMap.get(be.equipmentId)
            if (existing) {
              existing.count += be.quantity
            } else {
              itemCountMap.set(be.equipmentId, { name: eqName, count: be.quantity })
            }
          })
        })

        const mostBookedItems = Array.from(itemCountMap.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 10)

        const bookingsByStatus = byStatus.map((s) => ({ status: s.status, count: s._count.id }))

        data = {
          totalBookings,
          confirmed,
          completed,
          cancelled,
          cancellationRate,
          averageBookingValue,
          mostBookedItems,
          bookingsByStatus,
        }
        break
      }

      case 'equipment': {
        const thirtyDaysAgo = subDays(new Date(), 30)
        const [bookingsWithEquipment, allEquipment, bookedEquipmentIds] = await Promise.all([
          prisma.booking.findMany({
            where: {
              createdAt: { gte: thirtyDaysAgo },
              deletedAt: null,
              status: { not: 'CANCELLED' },
            },
            include: {
              equipment: {
                include: {
                  equipment: {
                    include: {
                      category: { select: { name: true } },
                    },
                  },
                },
              },
            },
          }),
          prisma.equipment.findMany({
            where: { isActive: true, deletedAt: null },
            select: { id: true, model: true, sku: true, quantityTotal: true },
          }),
          prisma.bookingEquipment.findMany({
            where: {
              booking: {
                startDate: { gte: thirtyDaysAgo },
                deletedAt: null,
                status: { not: 'CANCELLED' },
              },
              deletedAt: null,
            },
            select: { equipmentId: true },
            distinct: ['equipmentId'],
          }),
        ])

        const equipmentStatsMap = new Map<
          string,
          { name: string; totalRentalDays: number; revenue: number; quantityTotal: number }
        >()
        const availableDays = 30

        bookingsWithEquipment.forEach((b) => {
          const days = differenceInDays(b.endDate, b.startDate) + 1
          const bRevenue = Number(b.totalAmount ?? 0)
          const perItem = b.equipment.length ? bRevenue / b.equipment.length : 0
          b.equipment.forEach((be) => {
            const eq = be.equipment
            const existing = equipmentStatsMap.get(be.equipmentId)
            const rentalDays = (existing?.totalRentalDays ?? 0) + days * be.quantity
            const revenue = (existing?.revenue ?? 0) + perItem * be.quantity
            equipmentStatsMap.set(be.equipmentId, {
              name: eq.model ?? eq.sku ?? be.equipmentId,
              totalRentalDays: rentalDays,
              revenue,
              quantityTotal: eq.quantityTotal ?? 1,
            })
          })
        })

        const bookedIds = new Set(bookedEquipmentIds.map((x) => x.equipmentId))
        const equipmentList = allEquipment.map((eq) => {
          const stats = equipmentStatsMap.get(eq.id)
          const totalRentalDays = stats?.totalRentalDays ?? 0
          const revenue = stats?.revenue ?? 0
          const qty = eq.quantityTotal ?? 1
          const availableDaysTotal = availableDays * qty
          const utilizationRate = availableDaysTotal > 0 ? (totalRentalDays / availableDaysTotal) * 100 : 0
          return {
            id: eq.id,
            name: eq.model ?? eq.sku ?? eq.id,
            totalRentalDays,
            utilizationRate: Math.round(utilizationRate * 100) / 100,
            revenue,
          }
        })

        const idleEquipment = allEquipment.filter((eq) => !bookedIds.has(eq.id)).map((eq) => ({
          id: eq.id,
          name: eq.model ?? eq.sku ?? eq.id,
        }))

        data = {
          equipment: equipmentList,
          idleEquipment,
        }
        break
      }

      case 'customers': {
        const [newCustomers, allBookings, topSpend, overdueInvoices] = await Promise.all([
          prisma.user.count({
            where: {
              createdAt: { gte: rangeStart, lte: rangeEnd },
              deletedAt: null,
              bookings: { some: {} },
            },
          }),
          prisma.booking.findMany({
            where: {
              createdAt: { gte: rangeStart, lte: rangeEnd },
              deletedAt: null,
              status: { not: 'CANCELLED' },
            },
            select: { customerId: true, totalAmount: true },
          }),
          prisma.invoice.groupBy({
            by: ['customerId'],
            where: {
              status: 'PAID',
              paidDate: { gte: rangeStart, lte: rangeEnd },
              deletedAt: null,
            },
            _sum: { totalAmount: true },
          }),
          prisma.invoice.findMany({
            where: {
              status: { in: ['OVERDUE', 'PARTIALLY_PAID', 'SENT'] },
              remainingAmount: { gt: 0 },
              deletedAt: null,
            },
            select: { customerId: true, remainingAmount: true },
            distinct: ['customerId'],
          }),
        ])

        const beforeRange = await prisma.booking.findMany({
          where: {
            createdAt: { lt: rangeStart },
            deletedAt: null,
            status: { not: 'CANCELLED' },
          },
          select: { customerId: true },
          distinct: ['customerId'],
        })
        const hadBefore = new Set(beforeRange.map((b) => b.customerId))
        const customersInRange = new Set(allBookings.map((b) => b.customerId))
        let firstTime = 0
        let repeat = 0
        customersInRange.forEach((cid) => {
          if (hadBefore.has(cid)) repeat++
          else firstTime++
        })

        const topBySpend = await Promise.all(
          topSpend
            .sort((a, b) => Number(b._sum.totalAmount ?? 0) - Number(a._sum.totalAmount ?? 0))
            .slice(0, 10)
            .map(async (t) => {
              const user = await prisma.user.findUnique({
                where: { id: t.customerId },
                select: { id: true, name: true, email: true },
              })
              return {
                customerId: t.customerId,
                name: user?.name ?? user?.email ?? t.customerId,
                email: user?.email,
                totalSpend: Number(t._sum.totalAmount ?? 0),
              }
            })
        )

        const customersWithOverduePayments = overdueInvoices.length

        data = {
          newCustomers,
          repeatVsFirstTime: {
            firstTime,
            repeat,
          },
          topBySpend,
          customersWithOverduePayments,
        }
        break
      }

      case 'financial': {
        const [invoiced, collected, outstanding, deposits, refunds, tax] = await Promise.all([
          prisma.invoice.aggregate({
            where: {
              createdAt: { gte: rangeStart, lte: rangeEnd },
              deletedAt: null,
              status: { not: 'CANCELLED' },
            },
            _sum: { totalAmount: true },
          }),
          prisma.invoice.aggregate({
            where: {
              status: 'PAID',
              paidDate: { gte: rangeStart, lte: rangeEnd },
              deletedAt: null,
            },
            _sum: { paidAmount: true },
          }),
          prisma.invoice.aggregate({
            where: {
              status: { not: 'PAID' },
              remainingAmount: { gt: 0 },
              deletedAt: null,
            },
            _sum: { remainingAmount: true },
          }),
          prisma.booking.aggregate({
            where: {
              depositStatus: 'HELD',
              deletedAt: null,
            },
            _sum: { depositAmount: true },
          }),
          prisma.booking.aggregate({
            where: {
              refundAmount: { not: null },
              cancelledAt: { gte: rangeStart, lte: rangeEnd },
              deletedAt: null,
            },
            _sum: { refundAmount: true },
          }),
          prisma.invoice.aggregate({
            where: {
              status: 'PAID',
              paidDate: { gte: rangeStart, lte: rangeEnd },
              deletedAt: null,
            },
            _sum: { vatAmount: true },
          }),
        ])

        data = {
          totalInvoiced: Number(invoiced._sum.totalAmount ?? 0),
          totalCollected: Number(collected._sum.paidAmount ?? 0),
          outstandingBalance: Number(outstanding._sum.remainingAmount ?? 0),
          depositsHeld: Number(deposits._sum.depositAmount ?? 0),
          refundsIssued: Number(refunds._sum.refundAmount ?? 0),
          taxCollected: Number(tax._sum.vatAmount ?? 0),
        }
        break
      }
    }

    return NextResponse.json({ data })
  } catch (error) {
    logger.error({ error, msg: 'Admin reports API error' })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
