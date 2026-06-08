/**
 * @file route.ts
 * @description Live operations telemetry — real active/confirmed bookings with
 * derived progress, overdue, and risk indicators. Replaces previous mock data.
 * @module app/api/admin/live-ops
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'

export const dynamic = 'force-dynamic'

const DAY_MS = 24 * 60 * 60 * 1000

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  if (!(await hasPermission(session.user.id, PERMISSIONS.BOOKING_READ))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const now = Date.now()
  const startOfDay = new Date()
  startOfDay.setHours(0, 0, 0, 0)
  const endOfDay = new Date(startOfDay.getTime() + DAY_MS)

  const [bookings, totalEquipment, pickupsToday, returnsToday] = await Promise.all([
    prisma.booking.findMany({
      where: { deletedAt: null, status: { in: ['CONFIRMED', 'ACTIVE'] } },
      select: {
        id: true,
        bookingNumber: true,
        status: true,
        totalAmount: true,
        startDate: true,
        endDate: true,
        customer: { select: { id: true, name: true, email: true, phone: true, verificationStatus: true } },
        promissoryNotes: { select: { signedAt: true } },
        _count: { select: { equipment: true } },
      },
      orderBy: { startDate: 'asc' },
      take: 200,
    }),
    prisma.equipment.count({ where: { deletedAt: null } }),
    prisma.booking.count({
      where: { deletedAt: null, status: 'CONFIRMED', startDate: { gte: startOfDay, lt: endOfDay } },
    }),
    prisma.booking.count({
      where: { deletedAt: null, status: 'ACTIVE', endDate: { gte: startOfDay, lt: endOfDay } },
    }),
  ])

  const activeBookings = bookings.map((b) => {
    const start = b.startDate.getTime()
    const end = b.endDate.getTime()
    const span = Math.max(1, end - start)
    const progress = Math.min(100, Math.max(0, Math.round(((now - start) / span) * 100)))
    const isOverdue = b.status === 'ACTIVE' && end < now
    const daysRemaining = Math.max(0, Math.ceil((end - now) / DAY_MS))

    const isIdVerified = b.customer?.verificationStatus === 'VERIFIED'
    const hasSignedPromissory = b.promissoryNotes.some((n) => n.signedAt != null)

    let riskScore: 'LOW' | 'MEDIUM' | 'HIGH' = 'LOW'
    let riskReason: string | undefined
    if (isOverdue) {
      riskScore = 'HIGH'
      riskReason = 'فترة الإيجار منتهية ولم يتم تسجيل الإرجاع.'
    } else if (!isIdVerified) {
      riskScore = 'HIGH'
      riskReason = 'لم يتم توثيق هوية العميل بعد.'
    } else if (!hasSignedPromissory) {
      riskScore = 'MEDIUM'
      riskReason = 'لم يتم توقيع سند لأمر الرقمي للعهدة.'
    }

    return {
      id: b.id,
      bookingNumber: b.bookingNumber,
      status: isOverdue ? 'OVERDUE' : b.status,
      customer: {
        id: b.customer?.id ?? '',
        name: b.customer?.name ?? b.customer?.email ?? 'عميل',
        phone: b.customer?.phone ?? undefined,
        isIdVerified,
        hasSignedPromissory,
      },
      startDate: b.startDate.toISOString(),
      endDate: b.endDate.toISOString(),
      equipmentCount: b._count.equipment,
      totalAmount: Number(b.totalAmount),
      progress,
      daysRemaining,
      isOverdue,
      riskScore,
      riskReason,
    }
  })

  const equipmentOut = activeBookings
    .filter((b) => b.status === 'ACTIVE' || b.status === 'OVERDUE')
    .reduce((sum, b) => sum + b.equipmentCount, 0)

  const stats = {
    activeBookings: activeBookings.filter((b) => b.status === 'ACTIVE' || b.status === 'OVERDUE').length,
    pickupsToday,
    returnsToday,
    overdueReturns: activeBookings.filter((b) => b.isOverdue).length,
    equipmentOut,
    totalEquipment,
  }

  return NextResponse.json({ activeBookings, stats })
}
