/**
 * @file route.ts
 * @description API for active holds (bookings with softLockExpiresAt > now)
 * @module app/api/holds
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { hasPermission } from '@/lib/auth/permissions'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const canRead = await hasPermission(session.user.id, 'booking.read' as never)
    if (!canRead) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const now = new Date()
    const holds = await prisma.booking.findMany({
      where: {
        deletedAt: null,
        softLockExpiresAt: { not: null, gt: now },
      },
      select: {
        id: true,
        bookingNumber: true,
        status: true,
        startDate: true,
        endDate: true,
        softLockExpiresAt: true,
        customerId: true,
        customer: { select: { id: true, name: true, email: true } },
        equipment: {
          where: { deletedAt: null },
          select: { equipmentId: true, quantity: true, equipment: { select: { id: true, sku: true, model: true } } },
        },
      },
      orderBy: { softLockExpiresAt: 'asc' },
    })

    const fiveMinFromNow = new Date(now.getTime() + 5 * 60 * 1000)
    const expiringSoon = holds.filter((h) => h.softLockExpiresAt && h.softLockExpiresAt <= fiveMinFromNow)
    const equipmentIds = new Set<string>()
    holds.forEach((h) => h.equipment.forEach((e) => equipmentIds.add(e.equipmentId)))

    const data = holds.map((h) => ({
      id: h.id,
      bookingNumber: h.bookingNumber,
      status: h.status,
      startDate: h.startDate.toISOString(),
      endDate: h.endDate.toISOString(),
      softLockExpiresAt: h.softLockExpiresAt?.toISOString() ?? null,
      customer: h.customer,
      equipment: h.equipment.map((e) => ({ equipmentId: e.equipmentId, quantity: e.quantity, sku: (e.equipment as { sku: string }).sku, model: (e.equipment as { model: string | null }).model })),
    }))

    return NextResponse.json({
      data,
      total: data.length,
      summary: {
        activeHoldsCount: data.length,
        expiringSoonCount: expiringSoon.length,
        totalLockedEquipment: equipmentIds.size,
      },
    })
  } catch (e) {
    console.error('Holds list error:', e)
    return NextResponse.json({ error: 'Failed to load holds' }, { status: 500 })
  }
}
