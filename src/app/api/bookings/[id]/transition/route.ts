/**
 * @file route.ts
 * @description Booking state transition API route
 * @module app/api/bookings/[id]/transition
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { BookingService } from '@/lib/services/booking.service'
import { stateTransitionSchema } from '@/lib/validators/booking.validator'

/**
 * POST /api/bookings/[id]/transition - Transition booking state
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
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
  } catch (error) {
    console.error('Error transitioning booking:', error)

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'بيانات غير صالحة', details: error }, { status: 400 })
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'حدث خطأ أثناء تغيير حالة الحجز',
      },
      { status: 500 }
    )
  }
}
