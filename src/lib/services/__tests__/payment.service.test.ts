/**
 * Unit tests for PaymentService
 */

import { PaymentService } from '../payment.service'
import { ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors'
import { prisma } from '@/lib/db/prisma'
import { BookingStatus, PaymentStatus } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import * as permissions from '@/lib/auth/permissions'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    booking: { findFirst: jest.fn() },
    payment: { findFirst: jest.fn(), create: jest.fn() },
  },
}))

jest.mock('@/lib/auth/permissions', () => ({
  hasPermission: jest.fn(),
}))

jest.mock('../audit.service', () => ({ AuditService: { log: jest.fn() } }))
jest.mock('@/lib/events/event-bus', () => ({ EventBus: { emit: jest.fn() } }))

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('PaymentService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(permissions.hasPermission as jest.Mock).mockResolvedValue(true)
  })

  describe('create', () => {
    const validInput = {
      bookingId: 'booking-1',
      amount: 100,
      userId: 'user-1',
    }

    it('throws ForbiddenError when user lacks permission', async () => {
      ;(permissions.hasPermission as jest.Mock).mockResolvedValue(false)
      await expect(PaymentService.create(validInput)).rejects.toThrow(ForbiddenError)
    })

    it('throws NotFoundError when booking does not exist', async () => {
      ;(mockPrisma.booking.findFirst as jest.Mock).mockResolvedValue(null)
      await expect(PaymentService.create(validInput)).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError when booking is not in PAYMENT_PENDING state', async () => {
      ;(mockPrisma.booking.findFirst as jest.Mock)
        .mockResolvedValue({
          id: 'booking-1',
          status: BookingStatus.DRAFT,
        } as any)(mockPrisma.payment.findFirst as jest.Mock)
        .mockResolvedValue(null)
      await expect(PaymentService.create(validInput)).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError when payment already exists for booking', async () => {
      ;(mockPrisma.booking.findFirst as jest.Mock)
        .mockResolvedValue({
          id: 'booking-1',
          status: BookingStatus.PAYMENT_PENDING,
        } as any)(mockPrisma.payment.findFirst as jest.Mock)
        .mockResolvedValue({
          id: 'pay-1',
          status: PaymentStatus.PENDING,
        } as any)
      await expect(PaymentService.create(validInput)).rejects.toThrow(ValidationError)
    })
  })
})
