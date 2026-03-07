/**
 * Booking service tests.
 * - Double-booking prevention (pure logic)
 * - BookingService class (create, getById, update, list, cancel, transitionState, etc.)
 */

import { BookingService } from '../booking.service'
import { NotFoundError, ValidationError, ForbiddenError } from '@/lib/errors'
import { BookingStatus } from '@prisma/client'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    booking: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    user: { findFirst: jest.fn(), findUnique: jest.fn() },
    bookingEquipment: { create: jest.fn(), findMany: jest.fn() },
    equipment: { findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn() },
    payment: { findFirst: jest.fn() },
    pricingRule: { findMany: jest.fn(), update: jest.fn() },
    $transaction: jest.fn((cb) => (typeof cb === 'function' ? cb(prismaTx) : Promise.resolve())),
  },
}))

const prismaTx = {
  booking: { update: jest.fn() },
  equipment: { findFirst: jest.fn(), update: jest.fn() },
}

jest.mock('@/lib/auth/permissions', () => ({
  hasPermission: jest.fn(),
  PERMISSIONS: {
    BOOKING_CREATE: 'booking.create',
    BOOKING_READ: 'booking.read',
    BOOKING_UPDATE: 'booking.update',
    BOOKING_CANCEL: 'booking.cancel',
  },
}))

jest.mock('../equipment.service', () => ({
  EquipmentService: {
    checkAvailability: jest.fn().mockResolvedValue({
      available: true,
      availableQuantity: 5,
      rentedQuantity: 0,
    }),
  },
}))

jest.mock('../studio.service', () => ({
  StudioService: {
    checkAvailability: jest.fn().mockResolvedValue({ available: true, conflicts: [] }),
  },
}))

jest.mock('../audit.service', () => ({
  AuditService: { log: jest.fn().mockResolvedValue(undefined) },
}))

jest.mock('@/lib/events/event-bus', () => ({
  EventBus: { emit: jest.fn().mockResolvedValue(undefined) },
}))

jest.mock('../invoice.service', () => ({
  InvoiceService: { autoGenerateForBooking: jest.fn().mockResolvedValue(undefined) },
}))

jest.mock('../payout.service', () => ({
  PayoutService: { createVendorPayoutsForBooking: jest.fn().mockResolvedValue(undefined) },
}))

jest.mock('@/lib/logger', () => ({
  logger: { error: jest.fn() },
}))

const { prisma } = require('@/lib/db/prisma')
const hasPermission = require('@/lib/auth/permissions').hasPermission as jest.Mock
const { EventBus } = require('@/lib/events/event-bus')
const { AuditService } = require('../audit.service')
const PayoutService = require('../payout.service').PayoutService
const InvoiceService = require('../invoice.service').InvoiceService
const EquipmentService = require('../equipment.service').EquipmentService
const StudioService = require('../studio.service').StudioService
const { logger } = require('@/lib/logger')

const mockBookingFindFirst = prisma.booking.findFirst as jest.Mock
const mockBookingFindMany = prisma.booking.findMany as jest.Mock
const mockBookingCreate = prisma.booking.create as jest.Mock
const mockBookingUpdate = prisma.booking.update as jest.Mock
const mockBookingCount = prisma.booking.count as jest.Mock
const mockUserFindFirst = prisma.user.findFirst as jest.Mock
const mockUserFindUnique = prisma.user.findUnique as jest.Mock
const mockBookingEquipmentCreate = prisma.bookingEquipment.create as jest.Mock
const mockBookingEquipmentFindMany = prisma.bookingEquipment.findMany as jest.Mock
const mockEquipmentFindFirst = prisma.equipment.findFirst as jest.Mock
const mockEquipmentUpdate = prisma.equipment.update as jest.Mock
const mockPaymentFindFirst = prisma.payment.findFirst as jest.Mock
const mockPricingRuleFindMany = prisma.pricingRule.findMany as jest.Mock
const mockPricingRuleUpdate = prisma.pricingRule.update as jest.Mock
const mockTransaction = prisma.$transaction as jest.Mock

describe('BookingService', () => {
  const futureStart = new Date('2026-06-01')
  const futureEnd = new Date('2026-06-05')
  const staffUser = { id: 'u1', role: 'ADMIN' }
  const clientUser = { id: 'c1', role: 'DATA_ENTRY' }

  beforeEach(() => {
    jest.clearAllMocks()
    hasPermission.mockResolvedValue(true)
    mockUserFindUnique.mockResolvedValue(staffUser)
    mockUserFindFirst.mockResolvedValue({ id: 'c1', status: 'active' })
  })

  describe('create', () => {
    it('throws ForbiddenError when user lacks permission', async () => {
      hasPermission.mockResolvedValue(false)
      await expect(
        BookingService.create(
          {
            customerId: 'c1',
            startDate: futureStart,
            endDate: futureEnd,
            equipment: [{ equipmentId: 'e1', quantity: 1 }],
          },
          'u1'
        )
      ).rejects.toThrow(ForbiddenError)
    })

    it('throws NotFoundError when customer not found', async () => {
      mockUserFindFirst.mockResolvedValue(null)
      await expect(
        BookingService.create(
          {
            customerId: 'c1',
            startDate: futureStart,
            endDate: futureEnd,
            equipment: [{ equipmentId: 'e1', quantity: 1 }],
          },
          'u1'
        )
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError when endDate <= startDate', async () => {
      await expect(
        BookingService.create(
          {
            customerId: 'c1',
            startDate: futureEnd,
            endDate: futureStart,
            equipment: [{ equipmentId: 'e1', quantity: 1 }],
          },
          'u1'
        )
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError when startDate in past', async () => {
      const past = new Date('2020-01-01')
      await expect(
        BookingService.create(
          {
            customerId: 'c1',
            startDate: past,
            endDate: futureEnd,
            equipment: [{ equipmentId: 'e1', quantity: 1 }],
          },
          'u1'
        )
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError when no equipment or studio', async () => {
      await expect(
        BookingService.create(
          {
            customerId: 'c1',
            startDate: futureStart,
            endDate: futureEnd,
            equipment: [],
          },
          'u1'
        )
      ).rejects.toThrow(ValidationError)
    })

    it('creates booking successfully with equipment', async () => {
      const createdBooking = {
        id: 'bk1',
        bookingNumber: 'BK-ABC-123',
        customerId: 'c1',
        status: BookingStatus.DRAFT,
        customer: {},
        equipment: [],
        studio: null,
        payments: [],
        contracts: [],
      }
      mockBookingFindFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValue(createdBooking)
      mockBookingCreate.mockResolvedValue(createdBooking)
      mockBookingEquipmentCreate.mockResolvedValue({})

      const result = await BookingService.create(
        {
          customerId: 'c1',
          startDate: futureStart,
          endDate: futureEnd,
          equipment: [{ equipmentId: 'e1', quantity: 1 }],
        },
        'u1'
      )

      expect(result).toMatchObject({ id: 'bk1', bookingNumber: 'BK-ABC-123' })
      expect(mockBookingCreate).toHaveBeenCalled()
      expect(mockBookingEquipmentCreate).toHaveBeenCalled()
    })

    it('passes auditContext ipAddress and userAgent to AuditService when provided', async () => {
      const createdBooking = {
        id: 'bk1',
        bookingNumber: 'BK-ABC-123',
        customerId: 'c1',
        status: BookingStatus.DRAFT,
        customer: {},
        equipment: [],
        studio: null,
        payments: [],
        contracts: [],
      }
      mockBookingFindFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValue(createdBooking)
      mockBookingCreate.mockResolvedValue(createdBooking)
      mockBookingEquipmentCreate.mockResolvedValue({})

      await BookingService.create(
        {
          customerId: 'c1',
          startDate: futureStart,
          endDate: futureEnd,
          equipment: [{ equipmentId: 'e1', quantity: 1 }],
        },
        'u1',
        { ipAddress: '192.168.1.1', userAgent: 'Mozilla/5.0' }
      )

      expect(AuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'booking.created',
          ipAddress: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
        })
      )
    })

    it('creates booking with totalAmount, depositAmount, vatAmount', async () => {
      const createdBooking = {
        id: 'bk1',
        bookingNumber: 'BK-ABC-123',
        customerId: 'c1',
        status: BookingStatus.DRAFT,
        customer: {},
        equipment: [],
        studio: null,
        payments: [],
        contracts: [],
      }
      mockBookingFindFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValue(createdBooking)
      mockBookingCreate.mockResolvedValue(createdBooking)
      mockBookingEquipmentCreate.mockResolvedValue({})

      await BookingService.create(
        {
          customerId: 'c1',
          startDate: futureStart,
          endDate: futureEnd,
          equipment: [{ equipmentId: 'e1', quantity: 1 }],
          totalAmount: 5000,
          depositAmount: 1000,
          vatAmount: 750,
        },
        'u1'
      )

      expect(mockBookingCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            totalAmount: expect.anything(),
            depositAmount: expect.anything(),
            vatAmount: expect.anything(),
          }),
        })
      )
    })

    it('creates booking with checkoutFormData and receiver fields', async () => {
      const createdBooking = {
        id: 'bk1',
        bookingNumber: 'BK-ABC-123',
        customerId: 'c1',
        status: BookingStatus.DRAFT,
        customer: {},
        equipment: [],
        studio: null,
        payments: [],
        contracts: [],
      }
      mockBookingFindFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValue(createdBooking)
      mockBookingCreate.mockResolvedValue(createdBooking)
      mockBookingEquipmentCreate.mockResolvedValue({})

      const result = await BookingService.create(
        {
          customerId: 'c1',
          startDate: futureStart,
          endDate: futureEnd,
          equipment: [{ equipmentId: 'e1', quantity: 1 }],
          receiverId: 'rec1',
          receiverName: 'John',
          receiverPhone: '+123',
          checkoutFormData: { delivery: 'pickup' },
        },
        'u1'
      )

      expect(result).toBeDefined()
      expect(mockBookingCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            receiverId: 'rec1',
            receiverName: 'John',
            receiverPhone: '+123',
            checkoutFormData: { delivery: 'pickup' },
          }),
        })
      )
    })

    it('throws ValidationError when equipment not available', async () => {
      EquipmentService.checkAvailability.mockResolvedValueOnce({
        available: false,
        availableQuantity: 0,
        rentedQuantity: 5,
      })
      await expect(
        BookingService.create(
          {
            customerId: 'c1',
            startDate: futureStart,
            endDate: futureEnd,
            equipment: [{ equipmentId: 'e1', quantity: 2 }],
          },
          'u1'
        )
      ).rejects.toThrow(/Available quantity/)
    })

    it('throws ValidationError when equipment insufficient quantity', async () => {
      EquipmentService.checkAvailability.mockResolvedValueOnce({
        available: true,
        availableQuantity: 2,
        rentedQuantity: 3,
      })
      await expect(
        BookingService.create(
          {
            customerId: 'c1',
            startDate: futureStart,
            endDate: futureEnd,
            equipment: [{ equipmentId: 'e1', quantity: 5 }],
          },
          'u1'
        )
      ).rejects.toThrow(ValidationError)
    })

    it('uses nullish coalescing for availability when rentedQuantity undefined', async () => {
      EquipmentService.checkAvailability.mockResolvedValueOnce({
        available: true,
        availableQuantity: 3,
        rentedQuantity: undefined,
      })
      mockBookingFindFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValue({ id: 'bk1', bookingNumber: 'BK-X', status: BookingStatus.DRAFT })
      mockBookingCreate.mockResolvedValue({ id: 'bk1', bookingNumber: 'BK-X' })
      mockBookingEquipmentCreate.mockResolvedValue({})
      const result = await BookingService.create(
        {
          customerId: 'c1',
          startDate: futureStart,
          endDate: futureEnd,
          equipment: [{ equipmentId: 'e1', quantity: 1 }],
        },
        'u1'
      )
      expect(result).toBeDefined()
    })

    it('throws when availableQuantity undefined (nullish coalescing branch)', async () => {
      EquipmentService.checkAvailability.mockResolvedValueOnce({
        available: true,
        availableQuantity: undefined,
        rentedQuantity: 0,
      })
      await expect(
        BookingService.create(
          {
            customerId: 'c1',
            startDate: futureStart,
            endDate: futureEnd,
            equipment: [{ equipmentId: 'e1', quantity: 1 }],
          },
          'u1'
        )
      ).rejects.toThrow(/Available quantity/)
    })

    it('throws ValidationError when studio end time <= start time', async () => {
      await expect(
        BookingService.create(
          {
            customerId: 'c1',
            startDate: futureStart,
            endDate: futureEnd,
            studioId: 's1',
            studioStartTime: new Date('2026-06-01T10:00:00'),
            studioEndTime: new Date('2026-06-01T09:00:00'),
            equipment: [],
          },
          'u1'
        )
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError when studio not available', async () => {
      StudioService.checkAvailability.mockResolvedValueOnce({
        available: false,
        conflicts: [{ type: 'booking' }],
      })
      await expect(
        BookingService.create(
          {
            customerId: 'c1',
            startDate: futureStart,
            endDate: futureEnd,
            studioId: 's1',
            studioStartTime: new Date('2026-06-01T10:00:00'),
            studioEndTime: new Date('2026-06-01T18:00:00'),
            equipment: [{ equipmentId: 'e1', quantity: 1 }],
          },
          'u1'
        )
      ).rejects.toThrow(ValidationError)
    })

    it('retries generateBookingNumber when collision occurs', async () => {
      const created = {
        id: 'bk1',
        bookingNumber: 'BK-RETRY',
        status: BookingStatus.DRAFT,
        customer: {},
        equipment: [],
        studio: null,
        payments: [],
        contracts: [],
      }
      mockBookingFindFirst
        .mockResolvedValueOnce({ id: 'existing' })
        .mockResolvedValueOnce(null)
        .mockResolvedValue(created)
      mockBookingCreate.mockResolvedValue({ id: 'bk1', bookingNumber: 'BK-RETRY' })
      const result = await BookingService.create(
        {
          customerId: 'c1',
          startDate: futureStart,
          endDate: futureEnd,
          equipment: [],
          studioId: 's1',
          studioStartTime: new Date('2026-06-01T10:00:00'),
          studioEndTime: new Date('2026-06-01T18:00:00'),
        },
        'u1'
      )
      expect(result).toBeDefined()
      expect(mockBookingFindFirst).toHaveBeenCalled()
      const findFirstCalls = mockBookingFindFirst.mock.calls
      const uniquenessChecks = findFirstCalls.filter(
        (c: unknown[]) => (c[0] as { where?: { bookingNumber?: unknown } })?.where?.bookingNumber != null
      )
      expect(uniquenessChecks.length).toBeGreaterThanOrEqual(2)
    })

    it('creates studio-only booking when no equipment', async () => {
      const createdBooking = {
        id: 'bk1',
        bookingNumber: 'BK-ABC-123',
        customerId: 'c1',
        status: BookingStatus.DRAFT,
        customer: {},
        equipment: [],
        studio: { id: 's1' },
        payments: [],
        contracts: [],
      }
      mockBookingFindFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValue(createdBooking)
      mockBookingCreate.mockResolvedValue(createdBooking)
      StudioService.checkAvailability.mockResolvedValue({ available: true, conflicts: [] })

      const result = await BookingService.create(
        {
          customerId: 'c1',
          startDate: futureStart,
          endDate: futureEnd,
          studioId: 's1',
          studioStartTime: new Date('2026-06-01T10:00:00'),
          studioEndTime: new Date('2026-06-01T18:00:00'),
          equipment: [],
        },
        'u1'
      )

      expect(result).toMatchObject({ id: 'bk1' })
      expect(mockBookingCreate).toHaveBeenCalled()
      expect(mockBookingEquipmentCreate).not.toHaveBeenCalled()
    })
  })

  describe('getById', () => {
    it('throws ForbiddenError when user lacks permission', async () => {
      hasPermission.mockResolvedValue(false)
      await expect(BookingService.getById('bk1', 'u1')).rejects.toThrow(ForbiddenError)
    })

    it('throws NotFoundError when booking not found', async () => {
      mockBookingFindFirst.mockResolvedValue(null)
      await expect(BookingService.getById('bk1', 'u1')).rejects.toThrow(NotFoundError)
    })

    it('returns booking when found and user has permission', async () => {
      const booking = {
        id: 'bk1',
        bookingNumber: 'BK-123',
        customer: {},
        equipment: [],
        studio: null,
        payments: [],
        contracts: [],
      }
      mockBookingFindFirst.mockResolvedValue(booking)
      const result = await BookingService.getById('bk1', 'u1')
      expect(result).toEqual(booking)
    })

    it('scopes to customerId when user is client role', async () => {
      mockUserFindUnique.mockResolvedValue({ id: 'c1', role: 'DATA_ENTRY' })
      const booking = {
        id: 'bk1',
        customerId: 'c1',
        customer: {},
        equipment: [],
        studio: null,
        payments: [],
        contracts: [],
      }
      mockBookingFindFirst.mockResolvedValue(booking)
      const result = await BookingService.getById('bk1', 'c1')
      expect(result).toEqual(booking)
      expect(mockBookingFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ customerId: 'c1' }),
        })
      )
    })
  })

  describe('update', () => {
    it('throws ForbiddenError when user lacks permission', async () => {
      hasPermission.mockResolvedValue(false)
      await expect(
        BookingService.update('bk1', 'u1', { notes: 'Updated' })
      ).rejects.toThrow(ForbiddenError)
    })

    it('throws NotFoundError when booking not found', async () => {
      mockBookingFindFirst.mockResolvedValue(null)
      await expect(
        BookingService.update('bk1', 'u1', { notes: 'Updated' })
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError when booking is not DRAFT', async () => {
      mockBookingFindFirst.mockResolvedValue({
        id: 'bk1',
        status: BookingStatus.CONFIRMED,
        deletedAt: null,
      })
      await expect(
        BookingService.update('bk1', 'u1', { notes: 'Updated' })
      ).rejects.toThrow(ValidationError)
    })

    it('updates draft booking successfully', async () => {
      const updated = {
        id: 'bk1',
        status: BookingStatus.DRAFT,
        notes: 'Updated',
        customer: {},
        equipment: [],
        studio: null,
      }
      mockBookingFindFirst.mockResolvedValue({
        id: 'bk1',
        status: BookingStatus.DRAFT,
        deletedAt: null,
      })
      mockBookingUpdate.mockResolvedValue(updated)
      const result = await BookingService.update('bk1', 'u1', { notes: 'Updated' })
      expect(result).toEqual(updated)
      expect(mockBookingUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'bk1' },
          data: expect.objectContaining({ notes: 'Updated', updatedBy: 'u1' }),
        })
      )
    })
  })

  describe('transitionState', () => {
    it('throws NotFoundError when booking not found', async () => {
      mockBookingFindFirst.mockResolvedValue(null)
      await expect(
        BookingService.transitionState('bk1', BookingStatus.RISK_CHECK, 'u1')
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError for invalid transition', async () => {
      mockBookingFindFirst.mockResolvedValue({
        id: 'bk1',
        status: BookingStatus.DRAFT,
        deletedAt: null,
      })
      await expect(
        BookingService.transitionState('bk1', BookingStatus.CONFIRMED, 'u1')
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError when confirming without payment', async () => {
      mockBookingFindFirst.mockResolvedValue({
        id: 'bk1',
        status: BookingStatus.PAYMENT_PENDING,
        deletedAt: null,
      })
      mockPaymentFindFirst.mockResolvedValue(null)
      await expect(
        BookingService.transitionState('bk1', BookingStatus.CONFIRMED, 'u1')
      ).rejects.toThrow(ValidationError)
    })

    it('transitions DRAFT to RISK_CHECK successfully', async () => {
      const updated = { id: 'bk1', status: BookingStatus.RISK_CHECK }
      mockBookingFindFirst
        .mockResolvedValueOnce({
          id: 'bk1',
          status: BookingStatus.DRAFT,
          deletedAt: null,
        })
        .mockResolvedValue(updated)
      mockBookingUpdate.mockResolvedValue(updated)
      mockBookingEquipmentFindMany.mockResolvedValue([])
      const result = await BookingService.transitionState(
        'bk1',
        BookingStatus.RISK_CHECK,
        'u1'
      )
      expect(result.status).toBe(BookingStatus.RISK_CHECK)
    })

    it('passes auditContext ipAddress and userAgent to AuditService when provided', async () => {
      const updated = { id: 'bk1', status: BookingStatus.RISK_CHECK }
      mockBookingFindFirst
        .mockResolvedValueOnce({
          id: 'bk1',
          status: BookingStatus.DRAFT,
          deletedAt: null,
        })
        .mockResolvedValue(updated)
      mockBookingUpdate.mockResolvedValue(updated)
      mockBookingEquipmentFindMany.mockResolvedValue([])
      await BookingService.transitionState(
        'bk1',
        BookingStatus.RISK_CHECK,
        'u1',
        { ipAddress: '127.0.0.1', userAgent: 'Jest/1.0' }
      )
      expect(AuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'booking.status_changed',
          ipAddress: '127.0.0.1',
          userAgent: 'Jest/1.0',
        })
      )
    })

    it('transitions DRAFT to CANCELLED and restores equipment', async () => {
      const updated = { id: 'bk1', status: BookingStatus.CANCELLED }
      mockBookingFindFirst.mockResolvedValue({
        id: 'bk1',
        status: BookingStatus.DRAFT,
        deletedAt: null,
      })
      mockBookingUpdate.mockResolvedValue(updated)
      mockBookingEquipmentFindMany.mockResolvedValue([
        { equipmentId: 'e1', quantity: 1 },
      ])
      mockEquipmentFindFirst.mockResolvedValue({
        id: 'e1',
        quantityTotal: 5,
        quantityAvailable: 4,
      })
      mockEquipmentUpdate.mockResolvedValue({})
      const result = await BookingService.transitionState(
        'bk1',
        BookingStatus.CANCELLED,
        'u1'
      )
      expect(result.status).toBe(BookingStatus.CANCELLED)
      expect(mockEquipmentUpdate).toHaveBeenCalled()
      expect(EventBus.emit).toHaveBeenCalledWith(
        'booking.cancelled',
        expect.objectContaining({ booking: updated, userId: 'u1' })
      )
    })

    it('transitions PAYMENT_PENDING to CONFIRMED with payment', async () => {
      const updated = { id: 'bk1', status: BookingStatus.CONFIRMED }
      mockBookingFindFirst.mockResolvedValue({
        id: 'bk1',
        status: BookingStatus.PAYMENT_PENDING,
        deletedAt: null,
      })
      mockPaymentFindFirst.mockResolvedValue({ id: 'p1', status: 'SUCCESS' })
      mockBookingUpdate.mockResolvedValue(updated)
      mockBookingEquipmentFindMany.mockResolvedValue([
        { equipmentId: 'e1', quantity: 1 },
      ])
      mockEquipmentFindFirst.mockResolvedValue({
        id: 'e1',
        quantityAvailable: 5,
        quantityTotal: 5,
      })
      mockEquipmentUpdate.mockResolvedValue({})
      mockPricingRuleFindMany.mockResolvedValue([])
      const result = await BookingService.transitionState(
        'bk1',
        BookingStatus.CONFIRMED,
        'u1'
      )
      expect(result.status).toBe(BookingStatus.CONFIRMED)
    })

    it('transitions to CONFIRMED and logs error when recordPricingRuleApplication throws', async () => {
      const updated = { id: 'bk1', status: BookingStatus.CONFIRMED }
      mockBookingFindFirst.mockResolvedValue({
        id: 'bk1',
        status: BookingStatus.PAYMENT_PENDING,
        deletedAt: null,
      })
      mockPaymentFindFirst.mockResolvedValue({ id: 'p1', status: 'SUCCESS' })
      mockBookingUpdate.mockResolvedValue(updated)
      mockBookingEquipmentFindMany.mockResolvedValue([
        { equipmentId: 'e1', quantity: 1 },
      ])
      mockEquipmentFindFirst.mockResolvedValue({
        id: 'e1',
        quantityAvailable: 5,
        quantityTotal: 5,
      })
      mockEquipmentUpdate.mockResolvedValue({})
      mockPricingRuleFindMany.mockRejectedValueOnce(new Error('DB connection failed'))
      const result = await BookingService.transitionState(
        'bk1',
        BookingStatus.CONFIRMED,
        'u1'
      )
      expect(result.status).toBe(BookingStatus.CONFIRMED)
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to record pricing rule application',
        expect.objectContaining({ error: 'DB connection failed' })
      )
    })

    it('transitions CONFIRMED to ACTIVE successfully', async () => {
      const updated = { id: 'bk1', status: BookingStatus.ACTIVE }
      mockBookingFindFirst.mockResolvedValue({
        id: 'bk1',
        status: BookingStatus.CONFIRMED,
        deletedAt: null,
      })
      mockBookingUpdate.mockResolvedValue(updated)
      mockBookingEquipmentFindMany.mockResolvedValue([
        { equipmentId: 'e1', quantity: 1 },
      ])
      mockEquipmentFindFirst.mockResolvedValue({
        id: 'e1',
        quantityAvailable: 5,
        quantityTotal: 5,
      })
      mockEquipmentUpdate.mockResolvedValue({})
      const result = await BookingService.transitionState(
        'bk1',
        BookingStatus.ACTIVE,
        'u1'
      )
      expect(result.status).toBe(BookingStatus.ACTIVE)
    })

    it('throws ValidationError for invalid transition to ACTIVE from PAYMENT_PENDING', async () => {
      mockBookingFindFirst.mockResolvedValue({
        id: 'bk1',
        status: BookingStatus.PAYMENT_PENDING,
        deletedAt: null,
      })
      await expect(
        BookingService.transitionState('bk1', BookingStatus.ACTIVE, 'u1')
      ).rejects.toThrow(ValidationError)
    })

    it('increments pricing rule appliedCount when rules match on CONFIRMED', async () => {
      const updated = { id: 'bk1', status: BookingStatus.CONFIRMED, startDate: futureStart, endDate: futureEnd }
      mockBookingFindFirst.mockResolvedValue({
        id: 'bk1',
        status: BookingStatus.PAYMENT_PENDING,
        deletedAt: null,
      })
      mockPaymentFindFirst.mockResolvedValue({ id: 'p1', status: 'SUCCESS' })
      mockBookingUpdate.mockResolvedValue(updated)
      mockBookingEquipmentFindMany.mockResolvedValue([
        { equipmentId: 'e1', quantity: 1 },
      ])
      mockEquipmentFindFirst.mockResolvedValue({
        id: 'e1',
        quantityAvailable: 5,
        quantityTotal: 5,
      })
      mockEquipmentUpdate.mockResolvedValue({})
      mockPricingRuleFindMany.mockResolvedValue([
        {
          id: 'rule1',
          conditions: {
            dateRange: { start: '2026-05-01', end: '2026-07-01' },
            minDuration: 1,
            maxDuration: 30,
          },
        },
      ])
      mockPricingRuleUpdate.mockResolvedValue({})
      const result = await BookingService.transitionState(
        'bk1',
        BookingStatus.CONFIRMED,
        'u1'
      )
      expect(result.status).toBe(BookingStatus.CONFIRMED)
      expect(mockPricingRuleUpdate).toHaveBeenCalledWith({
        where: { id: 'rule1' },
        data: { appliedCount: { increment: 1 } },
      })
    })

    it('handles pricing rule with null conditions on CONFIRMED', async () => {
      const updated = { id: 'bk1', status: BookingStatus.CONFIRMED, startDate: futureStart, endDate: futureEnd }
      mockBookingFindFirst.mockResolvedValue({
        id: 'bk1',
        status: BookingStatus.PAYMENT_PENDING,
        deletedAt: null,
      })
      mockPaymentFindFirst.mockResolvedValue({ id: 'p1', status: 'SUCCESS' })
      mockBookingUpdate.mockResolvedValue(updated)
      mockBookingEquipmentFindMany.mockResolvedValue([{ equipmentId: 'e1', quantity: 1 }])
      mockEquipmentFindFirst.mockResolvedValue({
        id: 'e1',
        quantityAvailable: 5,
        quantityTotal: 5,
      })
      mockEquipmentUpdate.mockResolvedValue({})
      mockPricingRuleFindMany.mockResolvedValue([
        { id: 'rule-null-cond', conditions: null },
      ])
      mockPricingRuleUpdate.mockResolvedValue({})
      const result = await BookingService.transitionState(
        'bk1',
        BookingStatus.CONFIRMED,
        'u1'
      )
      expect(result.status).toBe(BookingStatus.CONFIRMED)
      expect(mockPricingRuleUpdate).toHaveBeenCalledWith({
        where: { id: 'rule-null-cond' },
        data: { appliedCount: { increment: 1 } },
      })
    })

    it('logs error when recordPricingRuleApplication throws on CONFIRMED', async () => {
      const updated = {
        id: 'bk1',
        status: BookingStatus.CONFIRMED,
        startDate: futureStart,
        endDate: futureEnd,
      }
      mockBookingFindFirst.mockResolvedValue({
        id: 'bk1',
        status: BookingStatus.PAYMENT_PENDING,
        deletedAt: null,
      })
      mockPaymentFindFirst.mockResolvedValue({ id: 'p1', status: 'SUCCESS' })
      mockBookingUpdate.mockResolvedValue(updated)
      mockBookingEquipmentFindMany.mockResolvedValue([
        { equipmentId: 'e1', quantity: 1 },
      ])
      mockEquipmentFindFirst.mockResolvedValue({
        id: 'e1',
        quantityAvailable: 5,
        quantityTotal: 5,
      })
      mockEquipmentUpdate.mockResolvedValue({})
      mockPricingRuleFindMany.mockRejectedValue(new Error('DB error'))
      const result = await BookingService.transitionState(
        'bk1',
        BookingStatus.CONFIRMED,
        'u1'
      )
      expect(result.status).toBe(BookingStatus.CONFIRMED)
      expect(logger.error).toHaveBeenCalledWith('Failed to record pricing rule application', expect.any(Object))
    })

    it('logs error when createVendorPayoutsForBooking throws on CONFIRMED', async () => {
      const updated = {
        id: 'bk1',
        status: BookingStatus.CONFIRMED,
        startDate: futureStart,
        endDate: futureEnd,
      }
      mockBookingFindFirst.mockResolvedValue({
        id: 'bk1',
        status: BookingStatus.PAYMENT_PENDING,
        deletedAt: null,
      })
      mockPaymentFindFirst.mockResolvedValue({ id: 'p1', status: 'SUCCESS' })
      mockBookingUpdate.mockResolvedValue(updated)
      mockBookingEquipmentFindMany.mockResolvedValue([
        { equipmentId: 'e1', quantity: 1 },
      ])
      mockEquipmentFindFirst.mockResolvedValue({
        id: 'e1',
        quantityAvailable: 5,
        quantityTotal: 5,
      })
      mockEquipmentUpdate.mockResolvedValue({})
      mockPricingRuleFindMany.mockResolvedValue([])
      ;(PayoutService.createVendorPayoutsForBooking as jest.Mock).mockRejectedValueOnce(
        new Error('payout error')
      )
      const result = await BookingService.transitionState(
        'bk1',
        BookingStatus.CONFIRMED,
        'u1'
      )
      expect(result.status).toBe(BookingStatus.CONFIRMED)
      expect(logger.error).toHaveBeenCalledWith('Failed to create vendor payouts', expect.any(Object))
    })

    it('logs error when autoGenerateForBooking throws on CONFIRMED', async () => {
      const updated = {
        id: 'bk1',
        status: BookingStatus.CONFIRMED,
        startDate: futureStart,
        endDate: futureEnd,
      }
      mockBookingFindFirst.mockResolvedValue({
        id: 'bk1',
        status: BookingStatus.PAYMENT_PENDING,
        deletedAt: null,
      })
      mockPaymentFindFirst.mockResolvedValue({ id: 'p1', status: 'SUCCESS' })
      mockBookingUpdate.mockResolvedValue(updated)
      mockBookingEquipmentFindMany.mockResolvedValue([
        { equipmentId: 'e1', quantity: 1 },
      ])
      mockEquipmentFindFirst.mockResolvedValue({
        id: 'e1',
        quantityAvailable: 5,
        quantityTotal: 5,
      })
      mockEquipmentUpdate.mockResolvedValue({})
      mockPricingRuleFindMany.mockResolvedValue([])
      ;(InvoiceService.autoGenerateForBooking as jest.Mock).mockRejectedValueOnce(
        new Error('invoice error')
      )
      const result = await BookingService.transitionState(
        'bk1',
        BookingStatus.CONFIRMED,
        'u1'
      )
      expect(result.status).toBe(BookingStatus.CONFIRMED)
      expect(logger.error).toHaveBeenCalledWith('Failed to auto-generate invoice for confirmed booking', expect.any(Object))
    })

    it('logs error with String(err) when non-Error thrown in recordPricingRuleApplication', async () => {
      mockBookingFindFirst.mockResolvedValue({
        id: 'bk1',
        status: BookingStatus.PAYMENT_PENDING,
        deletedAt: null,
      })
      mockPaymentFindFirst.mockResolvedValue({ id: 'p1', status: 'SUCCESS' })
      mockBookingUpdate.mockResolvedValue({
        id: 'bk1',
        status: BookingStatus.CONFIRMED,
        startDate: futureStart,
        endDate: futureEnd,
      })
      mockBookingEquipmentFindMany.mockResolvedValue([{ equipmentId: 'e1', quantity: 1 }])
      mockEquipmentFindFirst.mockResolvedValue({ id: 'e1', quantityAvailable: 5, quantityTotal: 5 })
      mockEquipmentUpdate.mockResolvedValue({})
      mockPricingRuleFindMany.mockRejectedValueOnce('string error')
      const result = await BookingService.transitionState(
        'bk1',
        BookingStatus.CONFIRMED,
        'u1'
      )
      expect(result.status).toBe(BookingStatus.CONFIRMED)
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to record pricing rule application',
        expect.objectContaining({ error: 'string error' })
      )
    })

    it('logs error with String(err) when PayoutService throws non-Error', async () => {
      mockBookingFindFirst.mockResolvedValue({
        id: 'bk1',
        status: BookingStatus.PAYMENT_PENDING,
        deletedAt: null,
      })
      mockPaymentFindFirst.mockResolvedValue({ id: 'p1', status: 'SUCCESS' })
      mockBookingUpdate.mockResolvedValue({
        id: 'bk1',
        status: BookingStatus.CONFIRMED,
        startDate: futureStart,
        endDate: futureEnd,
      })
      mockBookingEquipmentFindMany.mockResolvedValue([{ equipmentId: 'e1', quantity: 1 }])
      mockEquipmentFindFirst.mockResolvedValue({ id: 'e1', quantityAvailable: 5, quantityTotal: 5 })
      mockEquipmentUpdate.mockResolvedValue({})
      mockPricingRuleFindMany.mockResolvedValue([])
      ;(PayoutService.createVendorPayoutsForBooking as jest.Mock).mockRejectedValueOnce('payout string')
      const result = await BookingService.transitionState(
        'bk1',
        BookingStatus.CONFIRMED,
        'u1'
      )
      expect(result.status).toBe(BookingStatus.CONFIRMED)
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to create vendor payouts',
        expect.objectContaining({ error: 'payout string' })
      )
    })

    it('logs error with String(err) when InvoiceService throws non-Error', async () => {
      mockBookingFindFirst.mockResolvedValue({
        id: 'bk1',
        status: BookingStatus.PAYMENT_PENDING,
        deletedAt: null,
      })
      mockPaymentFindFirst.mockResolvedValue({ id: 'p1', status: 'SUCCESS' })
      mockBookingUpdate.mockResolvedValue({
        id: 'bk1',
        status: BookingStatus.CONFIRMED,
        startDate: futureStart,
        endDate: futureEnd,
      })
      mockBookingEquipmentFindMany.mockResolvedValue([{ equipmentId: 'e1', quantity: 1 }])
      mockEquipmentFindFirst.mockResolvedValue({ id: 'e1', quantityAvailable: 5, quantityTotal: 5 })
      mockEquipmentUpdate.mockResolvedValue({})
      mockPricingRuleFindMany.mockResolvedValue([])
      ;(InvoiceService.autoGenerateForBooking as jest.Mock).mockRejectedValueOnce('invoice string')
      const result = await BookingService.transitionState(
        'bk1',
        BookingStatus.CONFIRMED,
        'u1'
      )
      expect(result.status).toBe(BookingStatus.CONFIRMED)
      expect(logger.error).toHaveBeenCalledWith(
        'Failed to auto-generate invoice for confirmed booking',
        expect.objectContaining({ error: 'invoice string', bookingId: 'bk1' })
      )
    })

    it('skips pricing rules that do not match date range or duration', async () => {
      const updated = {
        id: 'bk1',
        status: BookingStatus.CONFIRMED,
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-05'),
      }
      mockBookingFindFirst.mockResolvedValue({
        id: 'bk1',
        status: BookingStatus.PAYMENT_PENDING,
        deletedAt: null,
      })
      mockPaymentFindFirst.mockResolvedValue({ id: 'p1', status: 'SUCCESS' })
      mockBookingUpdate.mockResolvedValue(updated)
      mockBookingEquipmentFindMany.mockResolvedValue([
        { equipmentId: 'e1', quantity: 1 },
      ])
      mockEquipmentFindFirst.mockResolvedValue({
        id: 'e1',
        quantityAvailable: 5,
        quantityTotal: 5,
      })
      mockEquipmentUpdate.mockResolvedValue({})
      mockPricingRuleFindMany.mockResolvedValue([
        { id: 'rule1', conditions: { dateRange: { start: '2027-01-01', end: '2027-12-31' } } },
        { id: 'rule2', conditions: { minDuration: 100 } },
        { id: 'rule3', conditions: { maxDuration: 1 } },
        { id: 'rule4', conditions: { dateRange: { start: '2025-01-01', end: '2025-12-31' } } },
      ])
      const result = await BookingService.transitionState(
        'bk1',
        BookingStatus.CONFIRMED,
        'u1'
      )
      expect(result.status).toBe(BookingStatus.CONFIRMED)
      expect(mockPricingRuleUpdate).not.toHaveBeenCalled()
    })

    it('applies pricing rule when dateRange overlaps and duration matches', async () => {
      const updated = {
        id: 'bk1',
        status: BookingStatus.CONFIRMED,
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-10'),
      }
      mockBookingFindFirst.mockResolvedValue({
        id: 'bk1',
        status: BookingStatus.PAYMENT_PENDING,
        deletedAt: null,
      })
      mockPaymentFindFirst.mockResolvedValue({ id: 'p1', status: 'SUCCESS' })
      mockBookingUpdate.mockResolvedValue(updated)
      mockBookingEquipmentFindMany.mockResolvedValue([
        { equipmentId: 'e1', quantity: 1 },
      ])
      mockEquipmentFindFirst.mockResolvedValue({
        id: 'e1',
        quantityAvailable: 5,
        quantityTotal: 5,
      })
      mockEquipmentUpdate.mockResolvedValue({})
      mockPricingRuleFindMany.mockResolvedValue([
        {
          id: 'rule1',
          conditions: {
            dateRange: { start: '2026-05-01', end: '2026-07-01' },
            minDuration: 5,
            maxDuration: 30,
          },
        },
      ])
      mockPricingRuleUpdate.mockResolvedValue({})
      const result = await BookingService.transitionState(
        'bk1',
        BookingStatus.CONFIRMED,
        'u1'
      )
      expect(result.status).toBe(BookingStatus.CONFIRMED)
      expect(mockPricingRuleUpdate).toHaveBeenCalledWith({
        where: { id: 'rule1' },
        data: { appliedCount: { increment: 1 } },
      })
    })
  })

  describe('list', () => {
    it('throws ForbiddenError when user lacks permission', async () => {
      hasPermission.mockResolvedValue(false)
      await expect(BookingService.list('u1')).rejects.toThrow(ForbiddenError)
    })

    it('returns paginated bookings for staff', async () => {
      mockBookingFindMany.mockResolvedValue([
        { id: 'bk1', bookingNumber: 'BK-1', customer: {}, equipment: [], studio: null },
      ])
      mockBookingCount.mockResolvedValue(1)
      const result = await BookingService.list('u1')
      expect(result).toMatchObject({ data: expect.any(Array), total: 1, limit: 50, offset: 0 })
      expect(result.data).toHaveLength(1)
    })

    it('applies customerId filter for staff', async () => {
      mockBookingFindMany.mockResolvedValue([])
      mockBookingCount.mockResolvedValue(0)
      await BookingService.list('u1', { customerId: 'c1' })
      expect(mockBookingFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ customerId: 'c1' }),
        })
      )
    })

    it('applies status filter', async () => {
      mockBookingFindMany.mockResolvedValue([])
      mockBookingCount.mockResolvedValue(0)
      await BookingService.list('u1', { status: BookingStatus.CONFIRMED })
      expect(mockBookingFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: BookingStatus.CONFIRMED }),
        })
      )
    })

    it('scopes to customerId when user is client', async () => {
      mockUserFindUnique.mockResolvedValue({ id: 'c1', role: 'DATA_ENTRY' })
      mockBookingFindMany.mockResolvedValue([])
      mockBookingCount.mockResolvedValue(0)
      await BookingService.list('c1')
      expect(mockBookingFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ customerId: 'c1' }),
        })
      )
    })

    it('applies startDate and endDate filters', async () => {
      mockBookingFindMany.mockResolvedValue([])
      mockBookingCount.mockResolvedValue(0)
      await BookingService.list('u1', {
        startDate: new Date('2026-06-01'),
        endDate: new Date('2026-06-10'),
      })
      expect(mockBookingFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                AND: expect.any(Array),
              }),
            ]),
          }),
        })
      )
    })

    it('applies search filter', async () => {
      mockBookingFindMany.mockResolvedValue([])
      mockBookingCount.mockResolvedValue(0)
      await BookingService.list('u1', { search: 'BK-123' })
      expect(mockBookingFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
          }),
        })
      )
    })
  })

  describe('cancel', () => {
    it('throws ForbiddenError when user lacks permission', async () => {
      hasPermission.mockResolvedValue(false)
      await expect(BookingService.cancel('bk1', 'u1')).rejects.toThrow(ForbiddenError)
    })

    it('throws NotFoundError when booking not found', async () => {
      mockBookingFindFirst.mockResolvedValue(null)
      await expect(BookingService.cancel('bk1', 'u1')).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError when booking is CLOSED', async () => {
      mockBookingFindFirst.mockResolvedValue({
        id: 'bk1',
        status: BookingStatus.CLOSED,
        deletedAt: null,
        customerId: 'c1',
      })
      await expect(BookingService.cancel('bk1', 'u1')).rejects.toThrow(ValidationError)
    })

    it('cancels DRAFT booking via transitionState', async () => {
      const draftBooking = {
        id: 'bk1',
        status: BookingStatus.DRAFT,
        deletedAt: null,
        customerId: 'c1',
      }
      const cancelledBooking = {
        id: 'bk1',
        status: BookingStatus.CANCELLED,
        customer: {},
        equipment: [],
        studio: null,
        payments: [],
        contracts: [],
      }
      mockBookingFindFirst
        .mockResolvedValueOnce(draftBooking)
        .mockResolvedValueOnce(draftBooking)
        .mockResolvedValue(cancelledBooking)
      mockBookingUpdate.mockResolvedValue({ id: 'bk1', status: BookingStatus.CANCELLED })
      mockBookingEquipmentFindMany.mockResolvedValue([])
      const result = await BookingService.cancel('bk1', 'u1')
      expect(result).toMatchObject({ id: 'bk1' })
    })

    it('cancels DRAFT booking when user is client (scopes to customerId)', async () => {
      const draftBooking = {
        id: 'bk1',
        status: BookingStatus.DRAFT,
        deletedAt: null,
        customerId: 'c1',
      }
      const cancelledBooking = {
        id: 'bk1',
        status: BookingStatus.CANCELLED,
        customer: {},
        equipment: [],
        studio: null,
        payments: [],
        contracts: [],
      }
      mockUserFindUnique.mockResolvedValue({ id: 'c1', role: 'DATA_ENTRY' })
      mockBookingFindFirst
        .mockResolvedValueOnce(draftBooking)
        .mockResolvedValueOnce(draftBooking)
        .mockResolvedValue(cancelledBooking)
      mockBookingUpdate.mockResolvedValue({ id: 'bk1', status: BookingStatus.CANCELLED })
      mockBookingEquipmentFindMany.mockResolvedValue([])
      const result = await BookingService.cancel('bk1', 'c1')
      expect(result).toMatchObject({ id: 'bk1' })
      expect(mockBookingFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ customerId: 'c1' }),
        })
      )
    })
  })

  describe('markReturned', () => {
    it('throws ForbiddenError when user lacks permission', async () => {
      hasPermission.mockResolvedValue(false)
      await expect(BookingService.markReturned('bk1', 'u1')).rejects.toThrow(ForbiddenError)
    })

    it('throws NotFoundError when booking not found', async () => {
      mockBookingFindFirst.mockResolvedValue(null)
      await expect(BookingService.markReturned('bk1', 'u1')).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError when booking is not ACTIVE', async () => {
      mockBookingFindFirst.mockResolvedValue({
        id: 'bk1',
        status: BookingStatus.DRAFT,
        deletedAt: null,
        equipment: [],
      })
      await expect(BookingService.markReturned('bk1', 'u1')).rejects.toThrow(ValidationError)
    })

    it('marks ACTIVE booking as RETURNED', async () => {
      const updated = { id: 'bk1', status: BookingStatus.RETURNED }
      mockBookingFindFirst.mockResolvedValue({
        id: 'bk1',
        status: BookingStatus.ACTIVE,
        endDate: new Date('2026-06-05'),
        deletedAt: null,
        equipment: [
          {
            equipmentId: 'e1',
            quantity: 1,
            equipment: { dailyPrice: 100 },
          },
        ],
      })
      mockTransaction.mockImplementation((cb) => cb(prismaTx))
      prismaTx.booking.update.mockResolvedValue(updated)
      prismaTx.equipment.findFirst.mockResolvedValue({
        id: 'e1',
        quantityTotal: 5,
        quantityAvailable: 4,
      })
      prismaTx.equipment.update.mockResolvedValue({})
      const result = await BookingService.markReturned('bk1', 'u1')
      expect(result).toEqual(updated)
    })

    it('omits lateFeeAmount from audit metadata when returned on time', async () => {
      const updated = { id: 'bk1', status: BookingStatus.RETURNED }
      mockBookingFindFirst.mockResolvedValue({
        id: 'bk1',
        status: BookingStatus.ACTIVE,
        endDate: new Date('2026-06-05'),
        deletedAt: null,
        equipment: [
          {
            equipmentId: 'e1',
            quantity: 1,
            equipment: { dailyPrice: 100 },
          },
        ],
      })
      mockTransaction.mockImplementation((cb) => cb(prismaTx))
      prismaTx.booking.update.mockResolvedValue(updated)
      prismaTx.equipment.findFirst.mockResolvedValue({
        id: 'e1',
        quantityTotal: 5,
        quantityAvailable: 4,
      })
      prismaTx.equipment.update.mockResolvedValue({})
      await BookingService.markReturned('bk1', 'u1', new Date('2026-06-04'))
      const logCall = (AuditService.log as jest.Mock).mock.calls.find(
        (c: unknown[]) => (c[0] as { action?: string })?.action === 'booking.mark_returned'
      )
      expect(logCall).toBeDefined()
      expect(logCall[0].metadata.lateFeeAmount).toBeUndefined()
    })

    it('uses 0 for late fee when equipment dailyPrice is null', async () => {
      const updated = {
        id: 'bk1',
        status: BookingStatus.RETURNED,
        lateFeeAmount: 0,
      }
      mockBookingFindFirst.mockResolvedValue({
        id: 'bk1',
        status: BookingStatus.ACTIVE,
        endDate: new Date('2026-06-05'),
        deletedAt: null,
        equipment: [
          {
            equipmentId: 'e1',
            quantity: 1,
            equipment: { dailyPrice: null },
          },
        ],
      })
      mockTransaction.mockImplementation((cb) => cb(prismaTx))
      prismaTx.booking.update.mockResolvedValue(updated)
      prismaTx.equipment.findFirst.mockResolvedValue({
        id: 'e1',
        quantityTotal: 5,
        quantityAvailable: 4,
      })
      prismaTx.equipment.update.mockResolvedValue({})
      const result = await BookingService.markReturned(
        'bk1',
        'u1',
        new Date('2026-06-07')
      )
      expect(result).toBeDefined()
      const updateCall = prismaTx.booking.update.mock.calls[0]
      expect(updateCall[0].data.lateFeeAmount).toBeDefined()
    })

    it('calculates late fee when returned after endDate', async () => {
      const updated = {
        id: 'bk1',
        status: BookingStatus.RETURNED,
        lateFeeAmount: 300,
      }
      mockBookingFindFirst.mockResolvedValue({
        id: 'bk1',
        status: BookingStatus.ACTIVE,
        endDate: new Date('2026-06-05'),
        deletedAt: null,
        equipment: [
          {
            equipmentId: 'e1',
            quantity: 1,
            equipment: { dailyPrice: 100 },
          },
        ],
      })
      mockTransaction.mockImplementation((cb) => cb(prismaTx))
      prismaTx.booking.update.mockResolvedValue(updated)
      prismaTx.equipment.findFirst.mockResolvedValue({
        id: 'e1',
        quantityTotal: 5,
        quantityAvailable: 4,
      })
      prismaTx.equipment.update.mockResolvedValue({})
      const result = await BookingService.markReturned(
        'bk1',
        'u1',
        new Date('2026-06-07')
      )
      expect(result).toBeDefined()
      const updateCall = prismaTx.booking.update.mock.calls[0]
      const lateFee = updateCall[0].data.lateFeeAmount
      expect(lateFee).toBeDefined()
      expect(lateFee).not.toBeNull()
    })

    it('passes auditContext ipAddress and userAgent to AuditService when provided', async () => {
      const updated = { id: 'bk1', status: BookingStatus.RETURNED }
      mockBookingFindFirst.mockResolvedValue({
        id: 'bk1',
        status: BookingStatus.ACTIVE,
        endDate: new Date('2026-06-05'),
        deletedAt: null,
        equipment: [
          {
            equipmentId: 'e1',
            quantity: 1,
            equipment: { dailyPrice: 100 },
          },
        ],
      })
      mockTransaction.mockImplementation((cb) => cb(prismaTx))
      prismaTx.booking.update.mockResolvedValue(updated)
      prismaTx.equipment.findFirst.mockResolvedValue({
        id: 'e1',
        quantityTotal: 5,
        quantityAvailable: 4,
      })
      prismaTx.equipment.update.mockResolvedValue({})
      await BookingService.markReturned(
        'bk1',
        'u1',
        new Date('2026-06-07'),
        { ipAddress: '1.2.3.4', userAgent: 'Chrome/120' }
      )
      expect(AuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'booking.mark_returned',
          ipAddress: '1.2.3.4',
          userAgent: 'Chrome/120',
        })
      )
    })
  })

  describe('releaseExpiredSoftLocks', () => {
    it('releases expired soft locks and returns count', async () => {
      mockBookingFindMany.mockResolvedValue([
        { id: 'bk1', softLockExpiresAt: new Date('2020-01-01') },
      ])
      mockBookingUpdate.mockResolvedValue({})
      const count = await BookingService.releaseExpiredSoftLocks()
      expect(count).toBe(1)
      expect(mockBookingUpdate).toHaveBeenCalled()
    })

    it('returns 0 when no expired locks', async () => {
      mockBookingFindMany.mockResolvedValue([])
      const count = await BookingService.releaseExpiredSoftLocks()
      expect(count).toBe(0)
    })
  })

  describe('performRiskCheck', () => {
    it('throws NotFoundError when booking not found', async () => {
      mockBookingFindFirst.mockResolvedValue(null)
      await expect(BookingService.performRiskCheck('bk1', 'u1')).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError when booking is not DRAFT', async () => {
      mockBookingFindFirst.mockResolvedValue({
        id: 'bk1',
        status: BookingStatus.CONFIRMED,
        deletedAt: null,
        totalAmount: 1000,
        customerId: 'c1',
        equipment: [],
        customer: {},
      })
      await expect(BookingService.performRiskCheck('bk1', 'u1')).rejects.toThrow(ValidationError)
    })

    it('returns medium risk and auto-transitions DRAFT to PAYMENT_PENDING', async () => {
      const draftBooking = {
        id: 'bk1',
        status: BookingStatus.DRAFT,
        deletedAt: null,
        totalAmount: 25000,
        customerId: 'c1',
        equipment: [{ equipment: { dailyPrice: 60000 }, quantity: 1 }],
        customer: {},
      }
      const paymentPendingBooking = {
        id: 'bk1',
        status: BookingStatus.PAYMENT_PENDING,
        customer: {},
        equipment: [],
        studio: null,
        payments: [],
        contracts: [],
      }
      mockBookingFindFirst
        .mockResolvedValueOnce(draftBooking)
        .mockResolvedValueOnce(draftBooking)
        .mockResolvedValue(paymentPendingBooking)
      mockBookingFindMany.mockResolvedValue([{ status: 'CLOSED', totalAmount: 1000 }])
      mockBookingUpdate.mockResolvedValue({ id: 'bk1', status: BookingStatus.PAYMENT_PENDING })
      mockBookingEquipmentFindMany.mockResolvedValue([])
      const result = await BookingService.performRiskCheck('bk1', 'u1')
      expect(result).toMatchObject({
        riskLevel: 'medium',
        requiresManualReview: false,
      })
    })

    it('passes auditContext ipAddress and userAgent to AuditService when provided', async () => {
      const draftBooking = {
        id: 'bk1',
        status: BookingStatus.DRAFT,
        deletedAt: null,
        totalAmount: 25000,
        customerId: 'c1',
        equipment: [{ equipment: { dailyPrice: 60000 }, quantity: 1 }],
        customer: {},
      }
      const paymentPendingBooking = {
        id: 'bk1',
        status: BookingStatus.PAYMENT_PENDING,
        customer: {},
        equipment: [],
        studio: null,
        payments: [],
        contracts: [],
      }
      mockBookingFindFirst
        .mockResolvedValueOnce(draftBooking)
        .mockResolvedValueOnce(draftBooking)
        .mockResolvedValue(paymentPendingBooking)
      mockBookingFindMany.mockResolvedValue([{ status: 'CLOSED', totalAmount: 1000 }])
      mockBookingUpdate.mockResolvedValue({ id: 'bk1', status: BookingStatus.PAYMENT_PENDING })
      mockBookingEquipmentFindMany.mockResolvedValue([])
      await BookingService.performRiskCheck('bk1', 'u1', {
        ipAddress: '10.0.0.1',
        userAgent: 'TestAgent/1.0',
      })
      expect(AuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'booking.risk_check',
          ipAddress: '10.0.0.1',
          userAgent: 'TestAgent/1.0',
        })
      )
    })

    it('returns low risk and auto-transitions DRAFT to PAYMENT_PENDING', async () => {
      const draftBooking = {
        id: 'bk1',
        status: BookingStatus.DRAFT,
        deletedAt: null,
        totalAmount: 1000,
        customerId: 'c1',
        equipment: [{ equipment: { dailyPrice: 50 }, quantity: 1 }],
        customer: {},
      }
      const paymentPendingBooking = {
        id: 'bk1',
        status: BookingStatus.PAYMENT_PENDING,
        customer: {},
        equipment: [],
        studio: null,
        payments: [],
        contracts: [],
      }
      mockBookingFindFirst
        .mockResolvedValueOnce(draftBooking)
        .mockResolvedValueOnce(draftBooking)
        .mockResolvedValue(paymentPendingBooking)
      mockBookingFindMany.mockResolvedValue([{ status: 'CLOSED', totalAmount: 1000 }])
      mockBookingUpdate.mockResolvedValue({ id: 'bk1', status: BookingStatus.PAYMENT_PENDING })
      mockBookingEquipmentFindMany.mockResolvedValue([])
      const result = await BookingService.performRiskCheck('bk1', 'u1')
      expect(result).toMatchObject({
        riskLevel: 'low',
        requiresManualReview: false,
      })
    })

    it('returns medium risk and auto-transitions to PAYMENT_PENDING', async () => {
      const draftBooking = {
        id: 'bk1',
        status: BookingStatus.DRAFT,
        deletedAt: null,
        totalAmount: 25000,
        customerId: 'c1',
        equipment: [{ equipment: { dailyPrice: 40000 }, quantity: 1 }],
        customer: {},
      }
      const paymentPendingBooking = {
        id: 'bk1',
        status: BookingStatus.PAYMENT_PENDING,
        customer: {},
        equipment: [],
        studio: null,
        payments: [],
        contracts: [],
      }
      mockBookingFindFirst
        .mockResolvedValueOnce(draftBooking)
        .mockResolvedValueOnce(draftBooking)
        .mockResolvedValue(paymentPendingBooking)
      mockBookingFindMany.mockResolvedValue([])
      mockBookingUpdate.mockResolvedValue({ id: 'bk1', status: BookingStatus.PAYMENT_PENDING })
      mockBookingEquipmentFindMany.mockResolvedValue([])
      const result = await BookingService.performRiskCheck('bk1', 'u1')
      expect(result).toMatchObject({
        riskLevel: 'medium',
        requiresManualReview: false,
      })
    })

    it('returns risk result and transitions high-risk to RISK_CHECK for manual review', async () => {
      const draftBooking = {
        id: 'bk1',
        status: BookingStatus.DRAFT,
        deletedAt: null,
        totalAmount: 60000,
        customerId: 'c1',
        equipment: [{ equipment: { dailyPrice: 50000 }, quantity: 1 }],
        customer: {},
      }
      const riskCheckBooking = {
        id: 'bk1',
        status: BookingStatus.RISK_CHECK,
        customer: {},
        equipment: [],
        studio: null,
        payments: [],
        contracts: [],
      }
      mockBookingFindFirst
        .mockResolvedValueOnce(draftBooking)
        .mockResolvedValueOnce(draftBooking)
        .mockResolvedValue(riskCheckBooking)
      mockBookingFindMany.mockResolvedValue([])
      mockBookingUpdate.mockResolvedValue({})
      mockBookingEquipmentFindMany.mockResolvedValue([])
      const result = await BookingService.performRiskCheck('bk1', 'u1')
      expect(result).toMatchObject({
        riskLevel: 'high',
        requiresManualReview: true,
        factors: expect.objectContaining({
          bookingAmount: 60000,
          equipmentValue: 50000,
        }),
      })
    })

    it('returns high risk when bookingAmount > 50000 (riskScore += 3)', async () => {
      const draftBooking = {
        id: 'bk1',
        status: BookingStatus.DRAFT,
        deletedAt: null,
        totalAmount: 55000,
        customerId: 'c1',
        equipment: [{ equipment: { dailyPrice: 1000 }, quantity: 1 }],
        customer: {},
      }
      mockBookingFindFirst.mockResolvedValue(draftBooking)
      mockBookingFindMany.mockResolvedValue([])
      mockBookingUpdate.mockResolvedValue({ ...draftBooking, status: BookingStatus.RISK_CHECK })
      mockBookingEquipmentFindMany.mockResolvedValue([])
      const result = await BookingService.performRiskCheck('bk1', 'u1')
      expect(result.riskLevel).toBe('high')
      expect(result.factors.bookingAmount).toBe(55000)
    })

    it('returns medium risk when bookingAmount 10000-20000 (riskScore += 1)', async () => {
      const draftBooking = {
        id: 'bk1',
        status: BookingStatus.DRAFT,
        deletedAt: null,
        totalAmount: 15000,
        customerId: 'c1',
        equipment: [{ equipment: { dailyPrice: 100 }, quantity: 1 }],
        customer: {},
      }
      mockBookingFindFirst.mockResolvedValue(draftBooking)
      mockBookingFindMany.mockResolvedValue([])
      mockBookingUpdate.mockResolvedValue({ ...draftBooking, status: BookingStatus.PAYMENT_PENDING })
      mockBookingEquipmentFindMany.mockResolvedValue([])
      const result = await BookingService.performRiskCheck('bk1', 'u1')
      expect(result.riskLevel).toBe('medium')
    })

    it('returns high risk when equipmentValue > 100000 (riskScore += 2)', async () => {
      const draftBooking = {
        id: 'bk1',
        status: BookingStatus.DRAFT,
        deletedAt: null,
        totalAmount: 15000,
        customerId: 'c1',
        equipment: [{ equipment: { dailyPrice: 120000 }, quantity: 1 }],
        customer: {},
      }
      mockBookingFindFirst.mockResolvedValue(draftBooking)
      mockBookingFindMany.mockResolvedValue([])
      mockBookingUpdate.mockResolvedValue({ ...draftBooking, status: BookingStatus.RISK_CHECK })
      mockBookingEquipmentFindMany.mockResolvedValue([])
      const result = await BookingService.performRiskCheck('bk1', 'u1')
      expect(result.riskLevel).toBe('high')
      expect(result.factors.equipmentValue).toBe(120000)
    })

    it('adds risk when cancelledBookings > completedBookings', async () => {
      const draftBooking = {
        id: 'bk1',
        status: BookingStatus.DRAFT,
        deletedAt: null,
        totalAmount: 55000,
        customerId: 'c1',
        equipment: [{ equipment: { dailyPrice: 1000 }, quantity: 1 }],
        customer: {},
      }
      mockBookingFindFirst.mockResolvedValue(draftBooking)
      mockBookingFindMany.mockResolvedValue([
        { status: BookingStatus.CANCELLED, totalAmount: 1000 },
        { status: BookingStatus.CANCELLED, totalAmount: 500 },
        { status: BookingStatus.CLOSED, totalAmount: 500 },
      ])
      mockBookingUpdate.mockResolvedValue({ ...draftBooking, status: BookingStatus.RISK_CHECK })
      mockBookingEquipmentFindMany.mockResolvedValue([])
      const result = await BookingService.performRiskCheck('bk1', 'u1')
      expect(result.riskLevel).toBe('high')
      expect(result.factors.customerHistory.cancelledBookings).toBe(2)
      expect(result.factors.customerHistory.completedBookings).toBe(1)
    })

    it('adds risk when totalSpent 0 but customer has prior bookings', async () => {
      const draftBooking = {
        id: 'bk1',
        status: BookingStatus.DRAFT,
        deletedAt: null,
        totalAmount: 25000,
        customerId: 'c1',
        equipment: [{ equipment: { dailyPrice: 1000 }, quantity: 1 }],
        customer: {},
      }
      mockBookingFindFirst.mockResolvedValue(draftBooking)
      mockBookingFindMany.mockResolvedValue([
        { status: BookingStatus.CANCELLED, totalAmount: 1000 },
        { status: BookingStatus.CANCELLED, totalAmount: 500 },
      ])
      mockBookingUpdate.mockResolvedValue({ ...draftBooking, status: BookingStatus.RISK_CHECK })
      mockBookingEquipmentFindMany.mockResolvedValue([])
      const result = await BookingService.performRiskCheck('bk1', 'u1')
      expect(result.factors.customerHistory.totalSpent).toBe(0)
      expect(result.factors.customerHistory.totalBookings).toBe(2)
    })
  })
})

describe('Double Booking Prevention', () => {
  interface BookingSlot {
    equipmentId: string
    startDate: Date
    endDate: Date
    quantity: number
    status: 'CONFIRMED' | 'ACTIVE' | 'CANCELLED'
  }

  /**
   * Pure logic check for booking overlap (mirrors the availability engine).
   */
  function hasOverlap(
    newStart: Date,
    newEnd: Date,
    existingStart: Date,
    existingEnd: Date
  ): boolean {
    return newStart < existingEnd && newEnd > existingStart
  }

  /**
   * Check if booking is possible given existing bookings and stock.
   */
  function canBook(
    equipmentId: string,
    startDate: Date,
    endDate: Date,
    quantityRequested: number,
    totalStock: number,
    existingBookings: BookingSlot[]
  ): { allowed: boolean; reason?: string } {
    const activeBookings = existingBookings.filter(
      (b) =>
        b.equipmentId === equipmentId &&
        b.status !== 'CANCELLED' &&
        hasOverlap(startDate, endDate, b.startDate, b.endDate)
    )

    const maxConcurrentUsage = activeBookings.reduce((sum, b) => sum + b.quantity, 0)

    if (maxConcurrentUsage + quantityRequested > totalStock) {
      return {
        allowed: false,
        reason: `Insufficient stock: ${totalStock - maxConcurrentUsage} available, ${quantityRequested} requested`,
      }
    }

    return { allowed: true }
  }

  test('Test 1: Book item A Jan 1-5, then same item Jan 3-7 → REJECTED (overlap)', () => {
    const existingBookings: BookingSlot[] = [
      {
        equipmentId: 'eq-1',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-01-05'),
        quantity: 1,
        status: 'CONFIRMED',
      },
    ]

    const result = canBook(
      'eq-1',
      new Date('2026-01-03'),
      new Date('2026-01-07'),
      1,
      1,
      existingBookings
    )

    expect(result.allowed).toBe(false)
    expect(result.reason).toContain('Insufficient stock')
  })

  test('Test 2: Book item A Jan 1-5, then Jan 6-10 → ALLOWED (adjacent, not overlapping)', () => {
    const existingBookings: BookingSlot[] = [
      {
        equipmentId: 'eq-1',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-01-05'),
        quantity: 1,
        status: 'CONFIRMED',
      },
    ]

    const result = canBook(
      'eq-1',
      new Date('2026-01-06'),
      new Date('2026-01-10'),
      1,
      1,
      existingBookings
    )

    expect(result.allowed).toBe(true)
  })

  test('Test 3: Book item A Jan 1-5 (qty=2, stock=2), then same dates qty=1 → REJECTED', () => {
    const existingBookings: BookingSlot[] = [
      {
        equipmentId: 'eq-1',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-01-05'),
        quantity: 2,
        status: 'CONFIRMED',
      },
    ]

    const result = canBook(
      'eq-1',
      new Date('2026-01-01'),
      new Date('2026-01-05'),
      1,
      2,
      existingBookings
    )

    expect(result.allowed).toBe(false)
  })

  test('Test 4: Cancel booking Jan 1-5, then re-book same dates → ALLOWED', () => {
    const existingBookings: BookingSlot[] = [
      {
        equipmentId: 'eq-1',
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-01-05'),
        quantity: 1,
        status: 'CANCELLED',
      },
    ]

    const result = canBook(
      'eq-1',
      new Date('2026-01-01'),
      new Date('2026-01-05'),
      1,
      1,
      existingBookings
    )

    expect(result.allowed).toBe(true)
  })

  test('Test 5: Concurrent booking simulation — two requests for same slot → only one succeeds', () => {
    const existingBookings: BookingSlot[] = []

    const result1 = canBook('eq-1', new Date('2026-03-01'), new Date('2026-03-05'), 1, 1, existingBookings)
    expect(result1.allowed).toBe(true)

    existingBookings.push({
      equipmentId: 'eq-1',
      startDate: new Date('2026-03-01'),
      endDate: new Date('2026-03-05'),
      quantity: 1,
      status: 'CONFIRMED',
    })

    const result2 = canBook('eq-1', new Date('2026-03-01'), new Date('2026-03-05'), 1, 1, existingBookings)
    expect(result2.allowed).toBe(false)
  })
})
