/**
 * POST /api/admin/live-ops/actions/whatsapp-reminder – Send ID verification WhatsApp reminder.
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'
import { WhatsAppService } from '@/lib/services/whatsapp.service'
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
    select: {
      bookingNumber: true,
      customer: { select: { phone: true, name: true } },
    },
  })
  if (!booking?.customer?.phone) {
    return NextResponse.json({ error: 'Customer phone not found' }, { status: 400 })
  }

  const name = booking.customer.name ?? 'Customer'
  const message = [
    `مرحباً ${name}،`,
    `نحتاج التحقق من هويتك لإكمال حجز ${booking.bookingNumber}.`,
    `Hello ${name}, please submit your ID verification to complete booking ${booking.bookingNumber}.`,
  ].join('\n')

  await WhatsAppService.sendWhatsAppText(booking.customer.phone, message)

  return NextResponse.json({ success: true })
}
