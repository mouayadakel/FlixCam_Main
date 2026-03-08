/**
 * @file api/bookings/[id]/cancel/route.ts
 * @description POST endpoint for booking cancellation
 * @module api/bookings
 */

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { AuditService } from '@/lib/services/audit.service'
import { logger } from '@/lib/logger'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Decimal } from '@prisma/client/runtime/library'
import { BookingStatus, RefundStatus, BookingItemStatus } from '@prisma/client'

const cancelSchema = z.object({
  reason: z.string().min(1, 'Reason is required'),
})

const CANCELLABLE_STATUSES = ['CONFIRMED', 'PAYMENT_PENDING', 'DRAFT'] as const
const FULL_REFUND_WINDOW_HOURS = 48
const PARTIAL_REFUND_WINDOW_HOURS = 24
const PARTIAL_REFUND_PERCENT = 50

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const parsed = cancelSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { reason } = parsed.data
    const userId = session.user.id
    const userRole = session.user.role as string | undefined
    const isAdmin = userRole === 'ADMIN'

    const booking = await prisma.booking.findUnique({
      where: { id, deletedAt: null },
      include: { equipment: true },
    })

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    const isOwner = booking.customerId === userId
    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: 'Forbidden: You can only cancel your own bookings' },
        { status: 403 }
      )
    }

    if (!CANCELLABLE_STATUSES.includes(booking.status as (typeof CANCELLABLE_STATUSES)[number])) {
      return NextResponse.json(
        {
          error:
            'Booking cannot be cancelled. Only DRAFT, PAYMENT_PENDING, or CONFIRMED bookings can be cancelled.',
        },
        { status: 400 }
      )
    }

    const now = new Date()
    const startDate = new Date(booking.startDate)
    const hoursUntilStart =
      (startDate.getTime() - now.getTime()) / (1000 * 60 * 60)

    let refundPercentage: number
    let refundAmount: Decimal

    const totalAmount = Number(booking.totalAmount)

    if (hoursUntilStart >= FULL_REFUND_WINDOW_HOURS) {
      refundPercentage = 100
      refundAmount = new Decimal(totalAmount)
    } else if (hoursUntilStart >= PARTIAL_REFUND_WINDOW_HOURS) {
      refundPercentage = PARTIAL_REFUND_PERCENT
      refundAmount = new Decimal((totalAmount * PARTIAL_REFUND_PERCENT) / 100)
    } else {
      refundPercentage = 0
      refundAmount = new Decimal(0)
    }

    const message =
      refundPercentage === 100
        ? 'Full refund will be processed.'
        : refundPercentage === 50
          ? 'Partial refund (50%) will be processed.'
          : 'No refund applicable for cancellations within 24 hours of start.'

    await prisma.$transaction(async (tx) => {
      await tx.booking.update({
        where: { id },
        data: {
          status: BookingStatus.CANCELLED,
          cancelledAt: now,
          cancellationReason: reason,
          refundAmount,
          refundStatus: RefundStatus.PENDING,
          updatedBy: userId,
        },
      })

      if (booking.equipment.length > 0) {
        await tx.bookingEquipment.updateMany({
          where: { bookingId: id, deletedAt: null },
          data: { itemStatus: BookingItemStatus.PENDING },
        })
      }
    })

    await AuditService.log({
      action: 'booking.cancelled',
      userId,
      resourceType: 'booking',
      resourceId: id,
      metadata: {
        reason,
        refundAmount: Number(refundAmount),
        refundPercentage,
        previousStatus: booking.status,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        refundAmount: Number(refundAmount),
        refundPercentage,
        message,
      },
    })
  } catch (error) {
    logger.error('Booking cancellation failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
