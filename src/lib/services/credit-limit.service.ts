/**
 * Customer credit limit enforcement (FIX-038).
 */

import { prisma } from '@/lib/db/prisma'
import { ValidationError } from '@/lib/errors'
import { Decimal } from '@prisma/client/runtime/library'

export class CreditLimitService {
  static async getOutstandingBalance(customerId: string): Promise<number> {
    const [unpaidInvoices, pendingBookings] = await Promise.all([
      prisma.invoice.aggregate({
        where: {
          customerId,
          deletedAt: null,
          status: { in: ['SENT', 'PARTIALLY_PAID', 'OVERDUE'] },
        },
        _sum: { remainingAmount: true },
      }),
      prisma.booking.aggregate({
        where: {
          customerId,
          deletedAt: null,
          status: { in: ['CONFIRMED', 'ACTIVE', 'PAYMENT_PENDING'] },
        },
        _sum: { totalAmount: true },
      }),
    ])

    const invoiceOutstanding = Number(unpaidInvoices._sum.remainingAmount ?? 0)
    const bookingExposure = Number(pendingBookings._sum.totalAmount ?? 0)
    return invoiceOutstanding + bookingExposure * 0.5
  }

  static async assertWithinCreditLimit(
    customerId: string,
    additionalAmount: number
  ): Promise<void> {
    const customer = await prisma.user.findFirst({
      where: { id: customerId, deletedAt: null },
      select: { creditLimit: true },
    })

    if (!customer?.creditLimit) return

    const limit = Number(customer.creditLimit)
    if (limit <= 0) return

    const outstanding = await this.getOutstandingBalance(customerId)
    if (outstanding + additionalAmount > limit) {
      throw new ValidationError(
        `Credit limit exceeded. Limit: ${limit.toFixed(2)} SAR, outstanding exposure: ${outstanding.toFixed(2)} SAR`
      )
    }
  }

  static parseCreditLimit(value: unknown): Decimal | null {
    if (value === null || value === undefined || value === '') return null
    const num = Number(value)
    if (Number.isNaN(num) || num < 0) {
      throw new ValidationError('Credit limit must be a non-negative number')
    }
    return new Decimal(num)
  }
}
