/**
 * @file cancel/route.ts
 * @description Portal: customer cancels own booking (إلغاء) with policy check
 * @module app/api/portal/bookings
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { BookingService } from '@/lib/services/booking.service'
import { cancelBookingSchema } from '@/lib/validators/booking.validator'
import { BookingStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

/** Cancellation allowed only if start is at least this many hours away (policy: 48h) */
const CANCELLATION_HOURS_BEFORE_START = 48

/**
 * POST /api/portal/bookings/[id]/cancel
 * Customer cancels their own booking. Allowed only when:
 * - Status is DRAFT, RISK_CHECK, PAYMENT_PENDING, or CONFIRMED
 * - If CONFIRMED: start date must be more than 48h in the future
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const { id: bookingId } = await params
    const body = await request.json().catch(() => ({}))
    const validated = cancelBookingSchema.parse(body)

    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
        customerId: session.user.id,
        deletedAt: null,
      },
    })

    if (!booking) {
      return NextResponse.json({ error: 'الحجز غير موجود أو غير مخصص لك' }, { status: 404 })
    }

    if (booking.status === BookingStatus.CLOSED) {
      return NextResponse.json({ error: 'لا يمكن إلغاء حجز مغلق' }, { status: 400 })
    }

    if (booking.status === BookingStatus.CANCELLED) {
      return NextResponse.json({ error: 'الحجز ملغي بالفعل' }, { status: 400 })
    }

    if (booking.status === BookingStatus.ACTIVE || booking.status === BookingStatus.RETURNED) {
      return NextResponse.json(
        { error: 'لا يمكن إلغاء حجز نشط أو بعد البدء. تواصل مع الدعم لطلب استثناء.' },
        { status: 400 }
      )
    }

    if (booking.status === BookingStatus.CONFIRMED) {
      const now = new Date()
      const start = new Date(booking.startDate)
      const hoursUntilStart = (start.getTime() - now.getTime()) / (1000 * 60 * 60)
      if (hoursUntilStart < CANCELLATION_HOURS_BEFORE_START) {
        return NextResponse.json(
          {
            error: `الإلغاء مسموح قبل ${CANCELLATION_HOURS_BEFORE_START} ساعة على الأقل من تاريخ البداية. تواصل مع الدعم.`,
          },
          { status: 400 }
        )
      }
    }

    const ipAddress =
      request.headers.get('x-forwarded-for') ||
      request.headers.get('x-real-ip') ||
      'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    await BookingService.transitionState(
      bookingId,
      BookingStatus.CANCELLED,
      session.user.id,
      { ipAddress, userAgent },
      validated.reason
    )

    return NextResponse.json({
      message: 'تم إلغاء الحجز بنجاح.',
    })
  } catch (error) {
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'بيانات غير صالحة', details: error },
        { status: 400 }
      )
    }
    console.error('Portal cancel error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'حدث خطأ أثناء الإلغاء' },
      { status: 500 }
    )
  }
}
