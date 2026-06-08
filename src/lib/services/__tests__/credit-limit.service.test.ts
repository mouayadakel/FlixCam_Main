/**
 * Unit tests for CreditLimitService
 */

import { CreditLimitService } from '../credit-limit.service'
import { prisma } from '@/lib/db/prisma'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: { findFirst: jest.fn() },
    invoice: { aggregate: jest.fn() },
    booking: { aggregate: jest.fn() },
  },
}))

const mockUserFindFirst = prisma.user.findFirst as jest.Mock
const mockInvoiceAggregate = prisma.invoice.aggregate as jest.Mock
const mockBookingAggregate = prisma.booking.aggregate as jest.Mock

describe('CreditLimitService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockInvoiceAggregate.mockResolvedValue({ _sum: { remainingAmount: 0 } })
    mockBookingAggregate.mockResolvedValue({ _sum: { totalAmount: 0 } })
  })

  it('skips check when no credit limit set', async () => {
    mockUserFindFirst.mockResolvedValue({ creditLimit: null })
    await expect(
      CreditLimitService.assertWithinCreditLimit('u1', 5000)
    ).resolves.toBeUndefined()
  })

  it('throws when exposure exceeds limit', async () => {
    mockUserFindFirst.mockResolvedValue({ creditLimit: 1000 })
    mockInvoiceAggregate.mockResolvedValue({ _sum: { remainingAmount: 800 } })
    mockBookingAggregate.mockResolvedValue({ _sum: { totalAmount: 1000 } })

    await expect(CreditLimitService.assertWithinCreditLimit('u1', 500)).rejects.toThrow(
      'Credit limit exceeded'
    )
  })
})
