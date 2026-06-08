/**
 * Unit tests for deposit.service
 */

import { DepositService } from '../deposit.service'
import { DepositStatus } from '@prisma/client'
import { NotFoundError, ValidationError } from '@/lib/errors'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    deposit: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    damageClaim: {
      count: jest.fn(),
    },
  },
}))

jest.mock('../audit.service', () => ({
  AuditService: { log: jest.fn().mockResolvedValue(undefined) },
}))

jest.mock('@/lib/events/event-bus', () => ({
  EventBus: { emit: jest.fn().mockResolvedValue(undefined) },
}))

import { prisma } from '@/lib/db/prisma'

const mockDepositFind = prisma.deposit.findUnique as jest.Mock
const mockDepositUpdate = prisma.deposit.update as jest.Mock
const mockDamageCount = prisma.damageClaim.count as jest.Mock

describe('deposit.service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('releaseDeposit', () => {
    it('releases a collected deposit when no open claims', async () => {
      mockDepositFind.mockResolvedValue({
        id: 'd1',
        bookingId: 'b1',
        status: DepositStatus.COLLECTED,
        amount: 500,
      })
      mockDamageCount.mockResolvedValue(0)

      await DepositService.releaseDeposit('b1', 'admin1', 'ref-1')

      expect(mockDepositUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { bookingId: 'b1' },
          data: expect.objectContaining({ status: DepositStatus.RETURNED }),
        })
      )
    })

    it('blocks release when damage claims are open', async () => {
      mockDepositFind.mockResolvedValue({
        id: 'd1',
        bookingId: 'b1',
        status: DepositStatus.COLLECTED,
        amount: 500,
      })
      mockDamageCount.mockResolvedValue(1)

      await expect(DepositService.releaseDeposit('b1', 'admin1')).rejects.toThrow(ValidationError)
    })

    it('throws when deposit record is missing', async () => {
      mockDepositFind.mockResolvedValue(null)
      await expect(DepositService.releaseDeposit('b1', 'admin1')).rejects.toThrow(NotFoundError)
    })
  })

  describe('tryAutoReleaseOnReturn', () => {
    it('no-ops when deposit is still pending', async () => {
      mockDepositFind.mockResolvedValue({
        id: 'd1',
        status: DepositStatus.PENDING,
        amount: 500,
      })

      await DepositService.tryAutoReleaseOnReturn('b1', 'staff1')

      expect(mockDepositUpdate).not.toHaveBeenCalled()
    })
  })
})
