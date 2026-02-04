/**
 * @file route.ts
 * @description Equipment and studio utilization for a date range
 * @module app/api/analytics/utilization
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { handleApiError } from '@/lib/utils/api-helpers'
import { UnauthorizedError } from '@/lib/errors'
import { subDays, differenceInDays } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) throw new UnauthorizedError()

    const { searchParams } = new URL(request.url)
    const days = Math.min(365, Math.max(1, parseInt(searchParams.get('days') || '30', 10)))
    const endDate = new Date()
    const startDate = subDays(endDate, days)
    const totalDays = differenceInDays(endDate, startDate) + 1

    const [equipmentList, bookingsWithEquipment, studios, bookingsWithStudio] = await Promise.all([
      prisma.equipment.findMany({
        where: { deletedAt: null },
        select: { id: true, sku: true, model: true, quantityTotal: true, quantityAvailable: true },
      }),
      prisma.booking.findMany({
        where: {
          deletedAt: null,
          status: { in: ['CONFIRMED', 'ACTIVE', 'RETURNED', 'CLOSED'] },
          startDate: { lte: endDate },
          endDate: { gte: startDate },
        },
        include: {
          equipment: { include: { equipment: { select: { id: true, sku: true, model: true } } } },
        },
      }),
      prisma.studio.findMany({
        where: { deletedAt: null, isActive: true },
        select: { id: true, name: true, slug: true },
      }),
      prisma.booking.findMany({
        where: {
          deletedAt: null,
          studioId: { not: null },
          status: { in: ['CONFIRMED', 'ACTIVE', 'RETURNED', 'CLOSED'] },
          startDate: { lte: endDate },
          endDate: { gte: startDate },
        },
        select: {
          studioId: true,
          studioStartTime: true,
          studioEndTime: true,
          totalAmount: true,
        },
      }),
    ])

    const equipmentRentedDays = new Map<string, number>()
    equipmentList.forEach((e) => equipmentRentedDays.set(e.id, 0))

    bookingsWithEquipment.forEach((b) => {
      const bookingStart = new Date(b.startDate)
      const bookingEnd = new Date(b.endDate)
      const clipStart = bookingStart < startDate ? startDate : bookingStart
      const clipEnd = bookingEnd > endDate ? endDate : bookingEnd
      const bookingDays = Math.max(0, differenceInDays(clipEnd, clipStart) + 1)
      b.equipment.forEach((be) => {
        const current = equipmentRentedDays.get(be.equipmentId) ?? 0
        equipmentRentedDays.set(be.equipmentId, current + bookingDays * be.quantity)
      })
    })

    const totalEquipmentUnits = equipmentList.reduce((sum, e) => sum + (e.quantityTotal || 1), 0)
    const totalRentedDays = Array.from(equipmentRentedDays.values()).reduce((a, b) => a + b, 0)
    const totalAvailableUnitDays = totalEquipmentUnits * totalDays
    const equipmentUtilizationRate = totalAvailableUnitDays > 0
      ? (totalRentedDays / totalAvailableUnitDays) * 100
      : 0

    const equipmentUtilization = equipmentList.map((e) => {
      const rentedDays = equipmentRentedDays.get(e.id) ?? 0
      const unitDays = (e.quantityTotal || 1) * totalDays
      const rate = unitDays > 0 ? (rentedDays / unitDays) * 100 : 0
      return {
        equipmentId: e.id,
        equipmentName: e.sku || e.model || e.id,
        quantityTotal: e.quantityTotal ?? 1,
        rentedDays,
        utilizationRate: Math.round(rate * 10) / 10,
      }
    }).sort((a, b) => b.utilizationRate - a.utilizationRate)

    const studioHoursMap = new Map<string, { hours: number; revenue: number }>()
    studios.forEach((s) => studioHoursMap.set(s.id, { hours: 0, revenue: 0 }))
    const hoursPerDay = 24
    bookingsWithStudio.forEach((b) => {
      if (!b.studioId || !b.studioStartTime || !b.studioEndTime) return
      const start = new Date(b.studioStartTime)
      const end = new Date(b.studioEndTime)
      const hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60)
      const cur = studioHoursMap.get(b.studioId) ?? { hours: 0, revenue: 0 }
      studioHoursMap.set(b.studioId, {
        hours: cur.hours + hours,
        revenue: cur.revenue + Number(b.totalAmount || 0),
      })
    })

    const studioUtilization = studios.map((s) => {
      const { hours, revenue } = studioHoursMap.get(s.id) ?? { hours: 0, revenue: 0 }
      const availableHours = totalDays * hoursPerDay
      const utilizationRate = availableHours > 0 ? (hours / availableHours) * 100 : 0
      return {
        studioId: s.id,
        studioName: s.name,
        slug: s.slug,
        bookedHours: Math.round(hours * 10) / 10,
        availableHours,
        utilizationRate: Math.round(utilizationRate * 10) / 10,
        revenue,
      }
    }).sort((a, b) => b.utilizationRate - a.utilizationRate)

    return NextResponse.json({
      periodDays: totalDays,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      equipment: {
        totalUnits: totalEquipmentUnits,
        utilizationRate: Math.round(equipmentUtilizationRate * 10) / 10,
        byEquipment: equipmentUtilization,
      },
      studio: {
        byStudio: studioUtilization,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
