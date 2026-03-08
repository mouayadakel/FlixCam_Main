/**
 * @file route.ts
 * @description Booking API routes - list and create
 * @module app/api/bookings
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { BookingService } from '@/lib/services/booking.service'
import { createBookingSchema } from '@/lib/validators/booking.validator'
import { BookingStatus } from '@prisma/client'

/**
 * GET /api/bookings - List bookings
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const customerId = searchParams.get('customerId') || undefined
    const status = searchParams.get('status') as BookingStatus | null
    const startDate = searchParams.get('startDate')
      ? new Date(searchParams.get('startDate')!)
      : undefined
    const endDate = searchParams.get('endDate') ? new Date(searchParams.get('endDate')!) : undefined
    const search = searchParams.get('search') || undefined
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 50
    const offset = searchParams.get('offset') ? parseInt(searchParams.get('offset')!) : 0

    const result = await BookingService.list(session.user.id, {
      customerId,
      status: status || undefined,
      startDate,
      endDate,
      search,
      limit,
      offset,
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching bookings:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'حدث خطأ أثناء جلب الحجوزات',
      },
      { status: 500 }
    )
  }
}

/**
 * POST /api/bookings - Create booking
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const body = await request.json()

    // Validate input
    const validated = createBookingSchema.parse(body)

    // Get IP and user agent for audit
    const ipAddress =
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    // Create booking
    const booking = await BookingService.create(
      {
        customerId: validated.customerId,
        startDate: validated.startDate,
        endDate: validated.endDate,
        equipment: validated.equipmentIds.map((id) => ({
          equipmentId: id,
          quantity: 1, // Default quantity, can be enhanced later
        })),
        studioId: validated.studioId,
        studioStartTime: validated.studioStartTime,
        studioEndTime: validated.studioEndTime,
        notes: validated.notes,
      },
      session.user.id,
      { ipAddress, userAgent }
    )

    return NextResponse.json(booking, { status: 201 })
  } catch (error) {
    console.error('Error creating booking:', error)

    if (error instanceof Error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'بيانات غير صالحة', details: error }, { status: 400 })
    }

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'حدث خطأ أثناء إنشاء الحجز',
      },
      { status: 500 }
    )
  }
}
