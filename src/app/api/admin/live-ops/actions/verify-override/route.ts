/**
 * POST /api/admin/live-ops/actions/verify-override – Mark customer ID/promissory as verified for a booking.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'

const bodySchema = z.object({
  bookingId: z.string().min(1),
})

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const canUpdate = await hasPermission(session.user.id, 'booking.update')
  if (!canUpdate) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => ({}))
  const parsed = bodySchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const booking = await prisma.booking.findFirst({
    where: { id: parsed.data.bookingId, deletedAt: null },
    select: { id: true, customerId: true },
  })
  if (!booking) {
    return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
  }

  await prisma.user.update({
    where: { id: booking.customerId },
    data: { verificationStatus: 'VERIFIED' },
  })

  return NextResponse.json({ success: true, bookingId: booking.id })
}
