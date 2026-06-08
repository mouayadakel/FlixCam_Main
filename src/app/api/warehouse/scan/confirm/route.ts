/**
 * POST /api/warehouse/scan/confirm
 * Confirm dispatch or return of a scanned equipment item.
 */

import { NextRequest, NextResponse } from 'next/server'
import { WarehouseScanType } from '@prisma/client'
import { z } from 'zod'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'

const ALLOWED_ROLES = ['ADMIN', 'WAREHOUSE_MANAGER']

const confirmSchema = z.object({
  bookingEquipmentId: z.string().min(1),
  bookingId: z.string().min(1),
  equipmentId: z.string().min(1),
  action: z.enum(['dispatch', 'return']),
  conditionNotes: z.string().max(1000).optional(),
  conditionPhotos: z.array(z.string().url()).max(5).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = (session.user as { role?: string }).role
    if (!userRole || !ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden: warehouse access required' }, { status: 403 })
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
    }

    const parsed = confirmSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { bookingEquipmentId, bookingId, equipmentId, action, conditionNotes, conditionPhotos } = parsed.data
    const userId = session.user.id
    const now = new Date()

    const result = await prisma.$transaction(async (tx) => {
      const bookingItem = await tx.bookingEquipment.findFirst({
        where: { id: bookingEquipmentId, bookingId, equipmentId, deletedAt: null },
      })

      if (!bookingItem) {
        throw new Error('Booking equipment item not found')
      }

      const eqRow = await tx.equipment.findFirst({
        where: { id: equipmentId, deletedAt: null },
        select: { sku: true, barcode: true },
      })
      const barcode = (eqRow?.barcode && eqRow.barcode.trim()) || eqRow?.sku || equipmentId

      if (action === 'dispatch') {
        const existingOut = await tx.warehouseScan.findFirst({
          where: { bookingId, equipmentId, type: WarehouseScanType.CHECKOUT },
        })
        if (existingOut) {
          throw new Error('Item already dispatched')
        }
      } else {
        const existingOut = await tx.warehouseScan.findFirst({
          where: { bookingId, equipmentId, type: WarehouseScanType.CHECKOUT },
        })
        if (!existingOut) {
          throw new Error('Item not dispatched yet')
        }
        const existingIn = await tx.warehouseScan.findFirst({
          where: { bookingId, equipmentId, type: WarehouseScanType.CHECKIN },
        })
        if (existingIn) {
          throw new Error('Item already returned')
        }
      }

      await tx.warehouseScan.create({
        data: {
          bookingId,
          equipmentId,
          type: action === 'dispatch' ? WarehouseScanType.CHECKOUT : WarehouseScanType.CHECKIN,
          barcode,
          scannedBy: userId,
        },
      })

      if (action === 'dispatch') {
        const lines = await tx.bookingEquipment.findMany({
          where: { bookingId, deletedAt: null },
          select: { equipmentId: true },
        })
        const expectedIds = [...new Set(lines.map((l) => l.equipmentId))]
        const checkoutRows = await tx.warehouseScan.groupBy({
          by: ['equipmentId'],
          where: { bookingId, type: WarehouseScanType.CHECKOUT },
        })
        if (
          expectedIds.length > 0 &&
          checkoutRows.length >= expectedIds.length
        ) {
          const checkedOut = new Set(checkoutRows.map((r) => r.equipmentId))
          if (expectedIds.every((idVal) => checkedOut.has(idVal))) {
            await tx.booking.update({
              where: { id: bookingId },
              data: { status: 'ACTIVE' },
            })
          }
        }
      } else {
        const lines = await tx.bookingEquipment.findMany({
          where: { bookingId, deletedAt: null },
          select: { equipmentId: true },
        })
        const expectedIds = [...new Set(lines.map((l) => l.equipmentId))]
        const checkinRows = await tx.warehouseScan.groupBy({
          by: ['equipmentId'],
          where: { bookingId, type: WarehouseScanType.CHECKIN },
        })
        if (
          expectedIds.length > 0 &&
          checkinRows.length >= expectedIds.length
        ) {
          const checkedIn = new Set(checkinRows.map((r) => r.equipmentId))
          if (expectedIds.every((idVal) => checkedIn.has(idVal))) {
            await tx.booking.update({
              where: { id: bookingId },
              data: { status: 'RETURNED', actualReturnDate: now },
            })
          }
        }
      }

      return { action }
    })

    const message = result.action === 'dispatch'
      ? 'Equipment dispatched successfully'
      : 'Equipment returned successfully'

    return NextResponse.json({ success: true, message })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)

    if (['not found', 'already dispatched', 'not dispatched'].some((m) => msg.toLowerCase().includes(m))) {
      return NextResponse.json({ error: msg, code: 'VALIDATION_ERROR' }, { status: 400 })
    }

    logger.error('Warehouse scan confirm error', { error: msg })
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
