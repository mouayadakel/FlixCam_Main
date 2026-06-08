/**
 * @file api/bookings/[id]/cancel/route.ts
 * @description POST endpoint for booking cancellation
 * @module api/bookings
 */

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { calculateCancellationRefund } from '@/lib/booking/cancellation-refund'
import { logger } from '@/lib/logger'
import { BookingService } from '@/lib/services/booking.service'
import { PaymentService } from '@/lib/services/payment.service'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { BookingStatus } from '@prisma/client'

const cancelSchema = z.object({
  reason: z.string().min(1, 'Reason is required'),
})

const CANCELLABLE_STATUSES = ['CONFIRMED', 'PAYMENT_PENDING', 'DRAFT'] as const

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

    if (booking.status === BookingStatus.CANCELLED) {
      return NextResponse.json({ error: 'Booking is already cancelled' }, { status: 400 })
    }

    const { refundPercentage, refundAmountSar, message } = calculateCancellationRefund(booking)

    const ipAddress =
      req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown'
    const userAgent = req.headers.get('user-agent') || 'unknown'

    await BookingService.cancel(id, userId, reason, { ipAddress, userAgent })

    const refundResult = await PaymentService.refundBookingCancellationPayments({
      bookingId: id,
      userId,
      refundAmountSar,
      reason: `Booking cancellation: ${reason}`,
    })

    if (refundResult.errors.length > 0) {
      logger.warn('Booking cancellation: partial refund failures', {
        bookingId: id,
        errors: refundResult.errors,
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        refundAmount: refundResult.refundedSar || refundAmountSar,
        refundPercentage,
        message,
        refundErrors: refundResult.errors.length > 0 ? refundResult.errors : undefined,
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
