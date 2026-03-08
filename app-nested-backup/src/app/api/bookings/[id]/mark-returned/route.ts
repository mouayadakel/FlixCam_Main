/**
 * POST /api/bookings/[id]/mark-returned
 * Mark booking as returned (ACTIVE → RETURNED). Phase 4.5 late return + 150% fee.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { BookingService } from '@/lib/services/booking.service'
import { z } from 'zod'

const bodySchema = z.object({
  actualReturnDate: z.coerce.date().optional(),
})

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json().catch(() => ({}))
    const parsed = bodySchema.safeParse(body)
    const actualReturnDate = parsed.success ? parsed.data.actualReturnDate : undefined

    const ipAddress =
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    const booking = await BookingService.markReturned(id, session.user.id, actualReturnDate, {
      ipAddress,
      userAgent,
    })

    return NextResponse.json({
      id: booking.id,
      status: booking.status,
      actualReturnDate: booking.actualReturnDate,
      lateFeeAmount: booking.lateFeeAmount?.toNumber(),
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'حدث خطأ'
    const status = message.includes('permission')
      ? 403
      : message.includes('must be ACTIVE')
        ? 400
        : message.includes('Booking')
          ? 404
          : 500
    return NextResponse.json({ error: message }, { status })
  }
}
