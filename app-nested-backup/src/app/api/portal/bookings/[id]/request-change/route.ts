/**
 * @file request-change/route.ts
 * @description Portal: submit request to change a booking (طلب تعديل)
 * @module app/api/portal/bookings
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { requestChangeSchema } from '@/lib/validators/booking.validator'
import { BookingRequestType } from '@prisma/client'

export const dynamic = 'force-dynamic'

/**
 * POST /api/portal/bookings/[id]/request-change
 * Customer submits a change request for their booking.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const { id: bookingId } = await params
    const body = await request.json()
    const validated = requestChangeSchema.parse(body)

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

    // Only CONFIRMED or ACTIVE can request change (per spec: تعديل مع توفر)
    if (!['CONFIRMED', 'ACTIVE'].includes(booking.status)) {
      return NextResponse.json(
        { error: 'طلب التعديل متاح فقط للحجوزات المؤكدة أو النشطة' },
        { status: 400 }
      )
    }

    const bookingRequest = await prisma.bookingRequest.create({
      data: {
        bookingId,
        requestedBy: session.user.id,
        type: BookingRequestType.CHANGE,
        status: 'PENDING',
        reason: validated.reason,
        requestedChanges: validated.requestedChanges ?? undefined,
      },
    })

    return NextResponse.json({
      id: bookingRequest.id,
      status: bookingRequest.status,
      message: 'تم إرسال طلب التعديل. سنتواصل معك قريباً.',
    })
  } catch (error) {
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'بيانات غير صالحة', details: error }, { status: 400 })
    }
    console.error('Portal request-change error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'حدث خطأ أثناء إرسال الطلب' },
      { status: 500 }
    )
  }
}
