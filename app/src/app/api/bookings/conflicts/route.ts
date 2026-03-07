/**
 * @file route.ts
 * @description API route for booking conflicts – overlapping date ranges on same equipment
 * @module app/api/bookings/conflicts
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { hasPermission } from '@/lib/auth/permissions'

export interface ConflictPair {
  equipmentId: string
  equipmentSku: string
  bookingA: {
    id: string
    bookingNumber: string
    status: string
    startDate: string
    endDate: string
  }
  bookingB: {
    id: string
    bookingNumber: string
    status: string
    startDate: string
    endDate: string
  }
  overlapStart: string
  overlapEnd: string
  severity: 'hard' | 'soft'
}

const CONFIRMED_ACTIVE = ['CONFIRMED', 'ACTIVE']

export const dynamic = 'force-dynamic'

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

    const bookings = await prisma.booking.findMany({
      where: {
        deletedAt: null,
        status: { not: 'CANCELLED' },
      },
      select: {
        id: true,
        bookingNumber: true,
        status: true,
        startDate: true,
        endDate: true,
        equipment: {
          where: { deletedAt: null },
          select: { equipmentId: true, equipment: { select: { id: true, sku: true } } },
        },
      },
      orderBy: { startDate: 'asc' },
    })

    const byEquipment = new Map<
      string,
      Array<{ id: string; bookingNumber: string; status: string; start: Date; end: Date }>
    >()

    for (const b of bookings) {
      for (const be of b.equipment) {
        const eid = be.equipmentId
        if (!byEquipment.has(eid)) byEquipment.set(eid, [])
        byEquipment.get(eid)!.push({
          id: b.id,
          bookingNumber: b.bookingNumber,
          status: b.status,
          start: b.startDate,
          end: b.endDate,
        })
      }
    }

    const conflicts: ConflictPair[] = []
    const equipmentSkus = new Map<string, string>()
    for (const b of bookings) {
      for (const be of b.equipment) {
        equipmentSkus.set(be.equipmentId, (be.equipment as { sku: string }).sku)
      }
    }

    for (const [equipmentId, list] of byEquipment) {
      const sku = equipmentSkus.get(equipmentId) ?? equipmentId
      for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const a = list[i]
          const b = list[j]
          if (a.end <= b.start || b.end <= a.start) continue
          const overlapStart = new Date(Math.max(a.start.getTime(), b.start.getTime()))
          const overlapEnd = new Date(Math.min(a.end.getTime(), b.end.getTime()))
          const aHard = CONFIRMED_ACTIVE.includes(a.status)
          const bHard = CONFIRMED_ACTIVE.includes(b.status)
          const severity: 'hard' | 'soft' = aHard && bHard ? 'hard' : 'soft'

          conflicts.push({
            equipmentId,
            equipmentSku: sku,
            bookingA: {
              id: a.id,
              bookingNumber: a.bookingNumber,
              status: a.status,
              startDate: a.start.toISOString(),
              endDate: a.end.toISOString(),
            },
            bookingB: {
              id: b.id,
              bookingNumber: b.bookingNumber,
              status: b.status,
              startDate: b.start.toISOString(),
              endDate: b.end.toISOString(),
            },
            overlapStart: overlapStart.toISOString(),
            overlapEnd: overlapEnd.toISOString(),
            severity,
          })
        }
      }
    }

    return NextResponse.json({ conflicts })
  } catch (e) {
    console.error('Bookings conflicts error:', e)
    return NextResponse.json({ error: 'Failed to load conflicts' }, { status: 500 })
  }
}
