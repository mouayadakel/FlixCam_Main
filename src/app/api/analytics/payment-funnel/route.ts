import { NextResponse } from 'next/server'
import { PaymentStatus } from '@prisma/client'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const hours = Number(searchParams.get('hours') || 24)
    const clampedHours = Number.isFinite(hours) ? Math.max(1, Math.min(168, Math.floor(hours))) : 24
    const fromDate = new Date(Date.now() - clampedHours * 60 * 60 * 1000)

    const [total, success, failed, processing, pending, refunded, queuePending, queueFailed] =
      await Promise.all([
        prisma.payment.count({
          where: {
            createdAt: { gte: fromDate },
            deletedAt: null,
          },
        }),
        prisma.payment.count({
          where: { createdAt: { gte: fromDate }, status: PaymentStatus.SUCCESS, deletedAt: null },
        }),
        prisma.payment.count({
          where: { createdAt: { gte: fromDate }, status: PaymentStatus.FAILED, deletedAt: null },
        }),
        prisma.payment.count({
          where: { createdAt: { gte: fromDate }, status: PaymentStatus.PROCESSING, deletedAt: null },
        }),
        prisma.payment.count({
          where: { createdAt: { gte: fromDate }, status: PaymentStatus.PENDING, deletedAt: null },
        }),
        prisma.payment.count({
          where: { createdAt: { gte: fromDate }, status: PaymentStatus.REFUNDED, deletedAt: null },
        }),
        prisma.event.count({
          where: { eventName: 'webhook.moyasar', status: 'PENDING' },
        }),
        prisma.event.count({
          where: { eventName: 'webhook.moyasar', status: 'FAILED' },
        }),
      ])

    return NextResponse.json({
      hours: clampedHours,
      total,
      success,
      failed,
      processing,
      pending,
      refunded,
      successRate: total > 0 ? Number(((success / total) * 100).toFixed(2)) : 0,
      queue: {
        pending: queuePending,
        failed: queueFailed,
      },
    })
  } catch (error: unknown) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
