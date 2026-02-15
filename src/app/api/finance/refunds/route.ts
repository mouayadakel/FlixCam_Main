/**
 * @file route.ts
 * @description API for refund tracking – payments with refund
 * @module app/api/finance/refunds
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { hasPermission } from '@/lib/auth/permissions'

export const dynamic = 'force-dynamic'

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

    const payments = await prisma.payment.findMany({
      where: {
        deletedAt: null,
        OR: [
          { status: 'REFUNDED' },
          { status: 'PARTIALLY_REFUNDED' },
          { refundAmount: { not: null, gt: 0 } },
        ],
      },
      select: {
        id: true,
        bookingId: true,
        amount: true,
        status: true,
        refundAmount: true,
        refundReason: true,
        createdAt: true,
        updatedAt: true,
        booking: {
          select: {
            bookingNumber: true,
            customerId: true,
            customer: { select: { id: true, name: true, email: true } },
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    })

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    const data = payments.map((p) => ({
      id: p.id,
      bookingId: p.bookingId,
      bookingNumber: p.booking?.bookingNumber ?? null,
      customer: p.booking?.customer ?? null,
      amount: Number(p.amount),
      status: p.status,
      refundAmount: p.refundAmount ? Number(p.refundAmount) : null,
      refundReason: p.refundReason ?? null,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    }))

    const totalRefunded = data.reduce((s, p) => s + (p.refundAmount ?? 0), 0)
    const thisMonthRefunded = data
      .filter((p) => new Date(p.updatedAt) >= startOfMonth)
      .reduce((s, p) => s + (p.refundAmount ?? 0), 0)
    const pendingCount = 0

    return NextResponse.json({
      data,
      total: data.length,
      summary: { totalRefunded, pendingRefundRequests: pendingCount, thisMonthRefunded },
    })
  } catch (e) {
    console.error('Refunds list error:', e)
    return NextResponse.json({ error: 'Failed to load refunds' }, { status: 500 })
  }
}
