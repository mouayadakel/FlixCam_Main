/**
 * Unit tests for BookingService
 */

import { BookingService } from '../booking.service'
import { ForbiddenError, ValidationError, NotFoundError } from '@/lib/errors'
import { prisma } from '@/lib/db/prisma'
import * as permissions from '@/lib/auth/permissions'
import * as equipmentService from '../equipment.service'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: { findFirst: jest.fn(), findUnique: jest.fn() },
    booking: { create: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
    bookingEquipment: { createMany: jest.fn() },
    $transaction: jest.fn((cb) => cb(prisma)),
  },
}))

jest.mock('@/lib/auth/permissions', () => ({
  hasPermission: jest.fn(),
  PERMISSIONS: { BOOKING_CREATE: 'booking.create' },
}))

jest.mock('../equipment.service', () => ({
  EquipmentService: { checkAvailability: jest.fn() },
}))

jest.mock('../audit.service', () => ({ AuditService: { log: jest.fn() } }))
jest.mock('@/lib/events/event-bus', () => ({ EventBus: { emit: jest.fn() } }))

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('BookingService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(permissions.hasPermission as jest.Mock).mockResolvedValue(true)
  })

  describe('create', () => {
    const validInput = {
      customerId: 'cust-1',
      startDate: new Date('2026-03-01'),
      endDate: new Date('2026-03-05'),
      equipment: [{ equipmentId: 'eq-1', quantity: 1 }],
    }

    it('throws ForbiddenError when user lacks permission', async () => {
      ;(permissions.hasPermission as jest.Mock).mockResolvedValue(false)
      await expect(BookingService.create(validInput, 'user-1')).rejects.toThrow(ForbiddenError)
    })

    it('throws ValidationError when end date is before start date', async () => {
      const invalidInput = {
        ...validInput,
        startDate: new Date('2026-03-05'),
        endDate: new Date('2026-03-01'),
      }
      ;(mockPrisma.user.findFirst as jest.Mock).mockResolvedValue({ id: 'cust-1' } as any)
      await expect(BookingService.create(invalidInput, 'user-1')).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError when start date is in the past', async () => {
      const pastInput = {
        ...validInput,
        startDate: new Date('2020-01-01'),
        endDate: new Date('2020-01-05'),
      }
      ;(mockPrisma.user.findFirst as jest.Mock).mockResolvedValue({ id: 'cust-1' } as any)
      await expect(BookingService.create(pastInput, 'user-1')).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError when equipment is empty', async () => {
      const noEquipment = {
        ...validInput,
        equipment: [],
      }
      ;(mockPrisma.user.findFirst as jest.Mock).mockResolvedValue({ id: 'cust-1' } as any)
      await expect(BookingService.create(noEquipment, 'user-1')).rejects.toThrow(ValidationError)
    })

    it('throws NotFoundError when customer does not exist', async () => {
      ;(mockPrisma.user.findFirst as jest.Mock).mockResolvedValue(null)
      await expect(BookingService.create(validInput, 'user-1')).rejects.toThrow(NotFoundError)
    })
  })
})
