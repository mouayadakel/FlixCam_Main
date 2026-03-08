/**
 * @file route.ts
 * @description Booking detail, update, and delete API routes
 * @module app/api/bookings/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { BookingService } from '@/lib/services/booking.service'
import { updateBookingSchema, stateTransitionSchema } from '@/lib/validators/booking.validator'
import { BookingStatus } from '@prisma/client'

/**
 * GET /api/bookings/[id] - Get booking by ID
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const { id } = await params
    const booking = await BookingService.getById(id, session.user.id)
    return NextResponse.json(booking)
  } catch (error) {
    console.error('Error fetching booking:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'حدث خطأ أثناء جلب الحجز',
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/bookings/[id] - Update booking
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Check if this is a state transition request
    if (body.toState) {
      const validated = stateTransitionSchema.parse(body)
      const ipAddress =
        request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
      const userAgent = request.headers.get('user-agent') || 'unknown'

      const booking = await BookingService.transitionState(
        id,
        validated.toState,
        session.user.id,
        { ipAddress, userAgent },
        validated.reason
      )

      return NextResponse.json(booking)
    }

    // Regular update (only for draft bookings)
    const validated = updateBookingSchema.parse(body)
    const booking = await BookingService.update(id, session.user.id, validated)
    return NextResponse.json(booking)
  } catch (error) {
    console.error('Error updating booking:', error)

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'بيانات غير صالحة', details: error }, { status: 400 })
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'حدث خطأ أثناء تحديث الحجز',
      },
      { status: 500 }
    )
  }
}

/**
 * DELETE /api/bookings/[id] - Cancel booking
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const { id } = await params
    const searchParams = request.nextUrl.searchParams
    const reason = searchParams.get('reason') || undefined

    const ipAddress =
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    const booking = await BookingService.cancel(id, session.user.id, reason, {
      ipAddress,
      userAgent,
    })

    return NextResponse.json(booking)
  } catch (error) {
    console.error('Error cancelling booking:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'حدث خطأ أثناء إلغاء الحجز',
      },
      { status: 500 }
    )
  }
}
