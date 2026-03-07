/**
 * GET /api/warehouse/scan?barcode=CAM-00042-7&mode=dispatch|return
 * Lookup equipment by barcode and find matching active booking.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'

const ALLOWED_ROLES = ['ADMIN', 'WAREHOUSE_MANAGER']

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = (session.user as { role?: string }).role
    if (!userRole || !ALLOWED_ROLES.includes(userRole)) {
      return NextResponse.json({ error: 'Forbidden: warehouse access required' }, { status: 403 })
    }

    const barcode = request.nextUrl.searchParams.get('barcode')?.trim()
    const mode = request.nextUrl.searchParams.get('mode') as 'dispatch' | 'return' | null

    if (!barcode) {
      return NextResponse.json(
        { error: 'Barcode is required', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    if (!mode || !['dispatch', 'return'].includes(mode)) {
      return NextResponse.json(
        { error: 'Mode must be "dispatch" or "return"', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    const equipment = await prisma.equipment.findFirst({
      where: { barcode, deletedAt: null },
      select: {
        id: true,
        barcode: true,
        model: true,
        sku: true,
        condition: true,
        media: { take: 1, orderBy: { sortOrder: 'asc' }, select: { url: true } },
      },
    })

    if (!equipment) {
      return NextResponse.json(
        { error: 'Equipment not found', code: 'BARCODE_NOT_FOUND' },
        { status: 404 }
      )
    }

    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    let bookingWhere: Record<string, unknown>

    if (mode === 'dispatch') {
      bookingWhere = {
        status: 'CONFIRMED',
        startDate: { lte: tomorrow },
        endDate: { gte: yesterday },
        deletedAt: null,
        equipment: { some: { equipmentId: equipment.id, deletedAt: null, itemStatus: 'PENDING' } },
      }
    } else {
      bookingWhere = {
        status: { in: ['ACTIVE', 'CONFIRMED'] },
        deletedAt: null,
        equipment: { some: { equipmentId: equipment.id, deletedAt: null, itemStatus: 'DISPATCHED' } },
      }
    }

    const booking = await prisma.booking.findFirst({
      where: bookingWhere,
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        equipment: {
          where: { equipmentId: equipment.id, deletedAt: null },
          select: { id: true, quantity: true, itemStatus: true },
        },
      },
      orderBy: { startDate: 'asc' },
    })

    if (!booking) {
      return NextResponse.json({
        success: false,
        equipment: {
          id: equipment.id,
          name: equipment.model || equipment.sku,
          sku: equipment.sku,
          imageUrl: equipment.media?.[0]?.url ?? null,
          condition: equipment.condition,
        },
        booking: null,
        warning: mode === 'dispatch'
          ? 'No confirmed booking found for dispatch today.'
          : 'No active booking found for return.',
        action: 'none',
      })
    }

    return NextResponse.json({
      success: true,
      equipment: {
        id: equipment.id,
        name: equipment.model || equipment.sku,
        sku: equipment.sku,
        imageUrl: equipment.media?.[0]?.url ?? null,
        condition: equipment.condition,
      },
      booking: {
        id: booking.id,
        bookingNumber: booking.bookingNumber,
        customerName: booking.customer.name,
        customerPhone: booking.customer.phone,
        startDate: booking.startDate,
        endDate: booking.endDate,
        status: booking.status,
        bookingEquipmentId: booking.equipment[0]?.id,
        quantity: booking.equipment[0]?.quantity ?? 1,
      },
      action: mode,
      label: mode === 'dispatch' ? 'Confirm Dispatch' : 'Confirm Return',
    })
  } catch (error) {
    logger.error('Warehouse scan lookup error', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      { error: 'Internal server error', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
