/**
 * @file route.ts
 * @description Release or extend a hold (booking soft lock)
 * @module app/api/holds/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { hasPermission } from '@/lib/auth/permissions'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const canUpdate = await hasPermission(session.user.id, 'booking.update' as never)
    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const action = body.action as string
    const extendMinutes = typeof body.extendMinutes === 'number' ? body.extendMinutes : 15

    const booking = await prisma.booking.findFirst({
      where: { id, deletedAt: null },
      select: { id: true, softLockExpiresAt: true },
    })

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    if (action === 'release') {
      await prisma.booking.update({
        where: { id },
        data: { softLockExpiresAt: null },
      })
      return NextResponse.json({ success: true, message: 'Hold released' })
    }

    if (action === 'extend') {
      const newExpiry = new Date()
      newExpiry.setMinutes(newExpiry.getMinutes() + extendMinutes)
      await prisma.booking.update({
        where: { id },
        data: { softLockExpiresAt: newExpiry },
      })
      return NextResponse.json({ success: true, softLockExpiresAt: newExpiry.toISOString() })
    }

    return NextResponse.json({ error: 'Invalid action: use release or extend' }, { status: 400 })
  } catch (e) {
    console.error('Hold update error:', e)
    return NextResponse.json({ error: 'Failed to update hold' }, { status: 500 })
  }
}
