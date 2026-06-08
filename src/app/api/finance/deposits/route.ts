/**
 * @file route.ts
 * @description API for deposit tracking – uses Deposit model lifecycle
 * @module app/api/finance/deposits
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { hasPermission } from '@/lib/auth/permissions'
import { DepositStatus, BookingStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

const DEPOSIT_STATUS_LABELS: Record<DepositStatus, string> = {
  PENDING: 'pending',
  COLLECTED: 'held',
  RETURNED: 'refunded',
  PARTIALLY_RETURNED: 'partially_refunded',
  FORFEITED: 'forfeited',
}

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

    const deposits = await prisma.deposit.findMany({
      include: {
        booking: {
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
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    })

    const data = deposits.map((d) => {
      const b = d.booking
      const deposit = Number(d.amount)
      const depositStatus = DEPOSIT_STATUS_LABELS[d.status] ?? 'pending'

      return {
        id: d.id,
        bookingId: b.id,
        bookingNumber: b.bookingNumber,
        status: b.status,
        depositAmount: deposit,
        totalAmount: Number(b.totalAmount),
        startDate: b.startDate.toISOString(),
        endDate: b.endDate.toISOString(),
        createdAt: b.createdAt.toISOString(),
        paidDate: d.collectedAt?.toISOString() ?? null,
        returnedDate: d.returnedAt?.toISOString() ?? null,
        depositStatus,
        depositLifecycle: d.status,
        deductionAmount: d.deductionAmt != null ? Number(d.deductionAmt) : null,
        customer: b.customer,
      }
    })

    const heldStatuses: DepositStatus[] = [DepositStatus.COLLECTED, DepositStatus.PARTIALLY_RETURNED]
    const activeBookingStatuses: BookingStatus[] = [
      BookingStatus.CONFIRMED,
      BookingStatus.ACTIVE,
      BookingStatus.RETURNED,
      BookingStatus.PAYMENT_PENDING,
    ]

    const totalDepositsHeld = data
      .filter(
        (d) =>
          heldStatuses.includes(d.depositLifecycle as DepositStatus) &&
          activeBookingStatuses.includes(d.status as BookingStatus) &&
          d.status !== BookingStatus.CANCELLED &&
          d.status !== BookingStatus.CLOSED
      )
      .reduce((s, d) => s + d.depositAmount, 0)

    const pendingDeposits = data
      .filter((d) => d.depositLifecycle === DepositStatus.PENDING)
      .reduce((s, d) => s + d.depositAmount, 0)

    const refundedDeposits = data
      .filter((d) => d.depositLifecycle === DepositStatus.RETURNED)
      .reduce((s, d) => s + d.depositAmount, 0)

    return NextResponse.json({
      data,
      total: data.length,
      summary: {
        totalDepositsHeld,
        pendingDeposits,
        refundedDeposits,
      },
    })
  } catch (e) {
    console.error('Deposits list error:', e)
    return NextResponse.json({ error: 'Failed to load deposits' }, { status: 500 })
  }
}
