/**
 * @file request-extension/route.ts
 * @description Portal: submit request to extend a booking (طلب تمديد)
 * @module app/api/portal/bookings
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { requestExtensionSchema } from '@/lib/validators/booking.validator'
import { BookingRequestType } from '@prisma/client'

export const dynamic = 'force-dynamic'

/**
 * POST /api/portal/bookings/[id]/request-extension
 * Customer submits an extension request (new end date).
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const { id: bookingId } = await params
    const body = await request.json()
    const validated = requestExtensionSchema.parse(body)

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

    // Extension only for CONFIRMED or ACTIVE
    if (!['CONFIRMED', 'ACTIVE'].includes(booking.status)) {
      return NextResponse.json(
        { error: 'طلب التمديد متاح فقط للحجوزات المؤكدة أو النشطة' },
        { status: 400 }
      )
    }

    if (new Date(validated.requestedEndDate) <= booking.endDate) {
      return NextResponse.json(
        { error: 'تاريخ النهاية الجديد يجب أن يكون بعد تاريخ نهاية الحجز الحالي' },
        { status: 400 }
      )
    }

    const bookingRequest = await prisma.bookingRequest.create({
      data: {
        bookingId,
        requestedBy: session.user.id,
        type: BookingRequestType.EXTENSION,
        status: 'PENDING',
        reason: validated.reason,
        requestedEndDate: new Date(validated.requestedEndDate),
      },
    })

    return NextResponse.json({
      id: bookingRequest.id,
      status: bookingRequest.status,
      message: 'تم إرسال طلب التمديد. سنتواصل معك قريباً.',
    })
  } catch (error) {
    if (error && typeof error === 'object' && 'name' in error && error.name === 'ZodError') {
      return NextResponse.json({ error: 'بيانات غير صالحة', details: error }, { status: 400 })
    }
    console.error('Portal request-extension error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'حدث خطأ أثناء إرسال الطلب' },
      { status: 500 }
    )
  }
}
