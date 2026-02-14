/**
 * @file route.ts
 * @description API for deposit tracking – bookings with depositAmount > 0
 * @module app/api/finance/deposits
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { hasPermission } from '@/lib/auth/permissions'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const canRead = await hasPermission(session.user.id, 'payment.read' as never)
    if (!canRead) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const bookings = await prisma.booking.findMany({
      where: {
        deletedAt: null,
        depositAmount: { not: null, gt: 0 },
      },
      select: {
        id: true,
        bookingNumber: true,
        status: true,
        depositAmount: true,
        totalAmount: true,
        startDate: true,
        endDate: true,
        createdAt: true,
        customer: { select: { id: true, name: true, email: true } },
        payments: {
          where: { deletedAt: null },
          select: { id: true, status: true, amount: true, refundAmount: true, createdAt: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const now = new Date()
    const data = bookings.map((b) => {
      const deposit = Number(b.depositAmount ?? 0)
      const successPayment = b.payments.find((p) => p.status === 'SUCCESS')
      const refunded = b.payments.some((p) => p.status === 'REFUNDED' || p.status === 'PARTIALLY_REFUNDED' || (p.refundAmount && Number(p.refundAmount) > 0))
      let depositStatus: 'paid' | 'pending' | 'refunded' = 'pending'
      if (refunded) depositStatus = 'refunded'
      else if (successPayment && Number(successPayment.amount) >= deposit) depositStatus = 'paid'

      return {
        id: b.id,
        bookingNumber: b.bookingNumber,
        status: b.status,
        depositAmount: deposit,
        totalAmount: Number(b.totalAmount),
        startDate: b.startDate.toISOString(),
        endDate: b.endDate.toISOString(),
        createdAt: b.createdAt.toISOString(),
        paidDate: successPayment?.createdAt?.toISOString() ?? null,
        depositStatus,
        customer: b.customer,
      }
    })

    const totalHeld = data.filter((d) => d.depositStatus === 'paid' && !['CANCELLED', 'CLOSED'].includes(d.status)).reduce((s, d) => s + d.depositAmount, 0)
    const pending = data.filter((d) => d.depositStatus === 'pending').reduce((s, d) => s + d.depositAmount, 0)
    const refunded = data.filter((d) => d.depositStatus === 'refunded').reduce((s, d) => s + d.depositAmount, 0)

    return NextResponse.json({
      data,
      total: data.length,
      summary: { totalDepositsHeld: totalHeld, pendingDeposits: pending, refundedDeposits: refunded },
    })
  } catch (e) {
    console.error('Deposits list error:', e)
    return NextResponse.json({ error: 'Failed to load deposits' }, { status: 500 })
  }
}
