/**
 * POST /api/bookings/[id]/deposit/release – Release a collected deposit (admin).
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/auth/permissions'
import { DepositService } from '@/lib/services/deposit.service'
import { AppError } from '@/lib/errors'
import { z } from 'zod'

const bodySchema = z.object({
  returnedRef: z.string().max(200).optional(),
})

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const canUpdate = await hasPermission(session.user.id, 'booking.update')
    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id: bookingId } = await params
    const body = await request.json().catch(() => ({}))
    const parsed = bodySchema.safeParse(body)
    const returnedRef = parsed.success ? parsed.data.returnedRef : undefined

    const ipAddress =
      request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    const userAgent = request.headers.get('user-agent') || 'unknown'

    await DepositService.releaseDeposit(bookingId, session.user.id, returnedRef, {
      ipAddress,
      userAgent,
    })

    return NextResponse.json({ success: true, bookingId })
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json({ error: error.message }, { status: error.statusCode })
    }
    const message = error instanceof Error ? error.message : 'Failed to release deposit'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
