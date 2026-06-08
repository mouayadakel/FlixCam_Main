import { BookingStatus, type Prisma } from '@prisma/client'
import { endOfDay, startOfDay, subDays } from 'date-fns'
import { prisma } from '@/lib/db/prisma'

export const EARNINGS_ELIGIBLE_BOOKING_STATUSES: BookingStatus[] = [
  BookingStatus.CONFIRMED,
  BookingStatus.ACTIVE,
  BookingStatus.RETURNED,
  BookingStatus.CLOSED,
]

interface EarningsWindow {
  from?: Date
  to?: Date
}

interface EarningsSummary {
  amount: number
  orderCount: number
}

function buildSuccessfulPaymentWhere(window?: EarningsWindow): Prisma.PaymentWhereInput {
  const createdAt: Prisma.DateTimeFilter = {}

  if (window?.from) {
    createdAt.gte = window.from
  }

  if (window?.to) {
    createdAt.lte = window.to
  }

  return {
    status: 'SUCCESS',
    deletedAt: null,
    ...(window?.from || window?.to ? { createdAt } : {}),
    booking: {
      deletedAt: null,
      status: {
        in: EARNINGS_ELIGIBLE_BOOKING_STATUSES,
      },
    },
  }
}

export async function getEarningsSummary(window?: EarningsWindow): Promise<EarningsSummary> {
  const where = buildSuccessfulPaymentWhere(window)

  const [aggregate, orders] = await Promise.all([
    prisma.payment.aggregate({
      where,
      _sum: {
        amount: true,
      },
    }),
    prisma.payment.findMany({
      where,
      distinct: ['bookingId'],
      select: {
        bookingId: true,
      },
    }),
  ])

  return {
    amount: Number(aggregate._sum.amount ?? 0),
    orderCount: orders.length,
  }
}

export async function getDailyEarningsSeries(days: number): Promise<Array<{ date: string; revenue: number }>> {
  const now = new Date()
  const series: Array<{ date: string; revenue: number }> = []

  for (let offset = days - 1; offset >= 0; offset--) {
    const day = subDays(now, offset)
    const summary = await getEarningsSummary({
      from: startOfDay(day),
      to: endOfDay(day),
    })

    series.push({
      date: startOfDay(day).toISOString(),
      revenue: summary.amount,
    })
  }

  return series
}

