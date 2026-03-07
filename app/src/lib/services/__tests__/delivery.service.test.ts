/**
 * Unit tests for delivery.service (scheduleDelivery, updateDelivery, updateDeliveryStatus,
 * getDeliveriesByBooking, getPendingDeliveries, getDriverDeliveries)
 */

import { DeliveryService } from '../delivery.service'
import { prisma } from '@/lib/db/prisma'
import { ForbiddenError, NotFoundError, ValidationError } from '@/lib/errors'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    delivery: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn() },
    booking: { findFirst: jest.fn() },
    user: { findFirst: jest.fn() },
  },
}))

jest.mock('@/lib/services/audit.service', () => ({ AuditService: { log: jest.fn().mockResolvedValue(undefined) } }))
jest.mock('@/lib/services/booking.service', () => ({
  BookingService: { getById: jest.fn(), transitionState: jest.fn().mockResolvedValue(undefined) },
}))
jest.mock('@/lib/events/event-bus', () => ({ EventBus: { emit: jest.fn().mockResolvedValue(undefined) } }))
jest.mock('@/lib/auth/permissions', () => ({ hasPermission: jest.fn().mockResolvedValue(true) }))

const mockDeliveryFindFirst = prisma.delivery.findFirst as jest.Mock
const mockDeliveryFindMany = prisma.delivery.findMany as jest.Mock
const mockDeliveryCreate = prisma.delivery.create as jest.Mock
const mockDeliveryUpdate = prisma.delivery.update as jest.Mock
const mockBookingFindFirst = prisma.booking.findFirst as jest.Mock
const mockUserFindFirst = prisma.user.findFirst as jest.Mock
const hasPermission = require('@/lib/auth/permissions').hasPermission as jest.Mock

const sampleBooking = {
  id: 'bkg-1',
  bookingNumber: 'B001',
  status: 'CONFIRMED',
  equipment: [{ equipmentId: 'eq1', equipment: { id: 'eq1', sku: 'S1', model: 'M1' }, quantity: 1 }],
}

const sampleDelivery = {
  id: 'del-1',
  deliveryNumber: 'DLV-1',
  bookingId: 'bkg-1',
  type: 'PICKUP',
  status: 'SCHEDULED',
  scheduledDate: new Date(),
  address: 'A',
  city: 'Riyadh',
  contactName: 'N',
  contactPhone: 'P',
  driverId: null,
  driver: null,
  booking: { ...sampleBooking, status: 'CONFIRMED' },
}

describe('DeliveryService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    hasPermission.mockResolvedValue(true)
  })

  describe('scheduleDelivery', () => {
    it('throws ForbiddenError when user lacks permission', async () => {
      hasPermission.mockResolvedValue(false)
      await expect(
        DeliveryService.scheduleDelivery(
          {
            bookingId: 'bkg-1',
            type: 'pickup',
            scheduledDate: new Date(),
            address: 'A',
            city: 'Riyadh',
            contactName: 'N',
            contactPhone: 'P',
          },
          'u1'
        )
      ).rejects.toThrow(ForbiddenError)
    })

    it('throws NotFoundError when booking not found', async () => {
      mockBookingFindFirst.mockResolvedValue(null)
      await expect(
        DeliveryService.scheduleDelivery(
          {
            bookingId: 'missing',
            type: 'pickup',
            scheduledDate: new Date(),
            address: 'A',
            city: 'Riyadh',
            contactName: 'N',
            contactPhone: 'P',
          },
          'u1'
        )
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError when pickup for non-CONFIRMED/ACTIVE booking', async () => {
      mockBookingFindFirst.mockResolvedValue({ ...sampleBooking, status: 'DRAFT' })
      await expect(
        DeliveryService.scheduleDelivery(
          {
            bookingId: 'bkg-1',
            type: 'pickup',
            scheduledDate: new Date(),
            address: 'A',
            city: 'Riyadh',
            contactName: 'N',
            contactPhone: 'P',
          },
          'u1'
        )
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError when return for non-ACTIVE/RETURNED booking', async () => {
      mockBookingFindFirst.mockResolvedValue({ ...sampleBooking, status: 'CONFIRMED' })
      await expect(
        DeliveryService.scheduleDelivery(
          {
            bookingId: 'bkg-1',
            type: 'return',
            scheduledDate: new Date(),
            address: 'A',
            city: 'Riyadh',
            contactName: 'N',
            contactPhone: 'P',
          },
          'u1'
        )
      ).rejects.toThrow(ValidationError)
    })

    it('throws NotFoundError when driverId provided but driver not found', async () => {
      mockBookingFindFirst.mockResolvedValue({ ...sampleBooking, status: 'CONFIRMED' })
      mockUserFindFirst.mockResolvedValue(null)
      await expect(
        DeliveryService.scheduleDelivery(
          {
            bookingId: 'bkg-1',
            type: 'pickup',
            scheduledDate: new Date(),
            address: 'A',
            city: 'Riyadh',
            contactName: 'N',
            contactPhone: 'P',
            driverId: 'drv-missing',
          },
          'u1'
        )
      ).rejects.toThrow(NotFoundError)
    })

    it('creates delivery and returns booking when valid', async () => {
      mockBookingFindFirst
        .mockResolvedValueOnce({ ...sampleBooking, status: 'CONFIRMED' })
        .mockResolvedValueOnce({ id: 'bkg-1', deliveries: [{ id: 'del-1' }], equipment: [] })
      mockDeliveryFindFirst.mockResolvedValue(null)
      mockDeliveryCreate.mockResolvedValue({ id: 'del-1', deliveryNumber: 'DLV-1' })
      const result = await DeliveryService.scheduleDelivery(
        {
          bookingId: 'bkg-1',
          type: 'pickup',
          scheduledDate: new Date(),
          address: 'A',
          city: 'Riyadh',
          contactName: 'N',
          contactPhone: 'P',
        },
        'u1'
      )
      expect(mockDeliveryCreate).toHaveBeenCalled()
      expect(result).toBeDefined()
    })
  })

  describe('updateDelivery', () => {
    it('throws ForbiddenError when user lacks permission', async () => {
      hasPermission.mockResolvedValue(false)
      await expect(
        DeliveryService.updateDelivery('bkg-1', { scheduledDate: new Date() }, 'u1')
      ).rejects.toThrow(ForbiddenError)
    })

    it('throws NotFoundError when delivery not found', async () => {
      mockDeliveryFindFirst.mockResolvedValue(null)
      await expect(
        DeliveryService.updateDelivery('bkg-1', { scheduledDate: new Date() }, 'u1')
      ).rejects.toThrow(NotFoundError)
    })

    it('updates delivery by deliveryId when provided', async () => {
      mockDeliveryFindFirst.mockResolvedValue({ id: 'del-1', bookingId: 'bkg-1' })
      mockDeliveryUpdate.mockResolvedValue({})
      mockBookingFindFirst.mockResolvedValue({ id: 'bkg-1', deliveries: [] })
      await DeliveryService.updateDelivery(
        'bkg-1',
        { deliveryId: 'del-1', scheduledDate: new Date() },
        'u1'
      )
      expect(mockDeliveryFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ id: 'del-1', bookingId: 'bkg-1' }) })
      )
    })

    it('updates delivery by bookingId when no deliveryId', async () => {
      mockDeliveryFindFirst.mockResolvedValue({ id: 'del-1', bookingId: 'bkg-1' })
      mockDeliveryUpdate.mockResolvedValue({})
      mockBookingFindFirst.mockResolvedValue({ id: 'bkg-1', deliveries: [] })
      await DeliveryService.updateDelivery('bkg-1', { scheduledDate: new Date() }, 'u1')
      expect(mockDeliveryFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ bookingId: 'bkg-1' }) })
      )
    })

    it('validates driver when driverId provided on update', async () => {
      mockDeliveryFindFirst.mockResolvedValue({ id: 'del-1', bookingId: 'bkg-1' })
      mockUserFindFirst.mockResolvedValue({ id: 'drv-1' })
      mockDeliveryUpdate.mockResolvedValue({})
      mockBookingFindFirst.mockResolvedValue({ id: 'bkg-1', deliveries: [] })
      await DeliveryService.updateDelivery('bkg-1', { driverId: 'drv-1' }, 'u1')
      expect(mockUserFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 'drv-1', deletedAt: null } })
      )
    })
  })

  describe('updateDeliveryStatus', () => {
    it('throws ForbiddenError when user lacks permission', async () => {
      hasPermission.mockResolvedValue(false)
      await expect(
        DeliveryService.updateDeliveryStatus('bkg-1', 'delivered', 'u1')
      ).rejects.toThrow(ForbiddenError)
    })

    it('throws NotFoundError when delivery not found', async () => {
      mockDeliveryFindFirst.mockResolvedValue(null)
      await expect(
        DeliveryService.updateDeliveryStatus('bkg-1', 'delivered', 'u1')
      ).rejects.toThrow(NotFoundError)
    })

    it('updates status and transitions booking when delivered (pickup)', async () => {
      const { BookingService } = require('@/lib/services/booking.service')
      const deliveryWithBooking = {
        ...sampleDelivery,
        type: 'PICKUP',
        booking: { ...sampleBooking, status: 'CONFIRMED' },
      }
      mockDeliveryFindFirst
        .mockResolvedValueOnce(deliveryWithBooking)
        .mockResolvedValueOnce({ ...deliveryWithBooking, status: 'DELIVERED' })
      mockDeliveryUpdate.mockResolvedValue({})
      await DeliveryService.updateDeliveryStatus('bkg-1', 'delivered', 'u1')
      expect(BookingService.transitionState).toHaveBeenCalledWith('bkg-1', 'ACTIVE', 'u1')
    })

    it('transitions to RETURNED when return delivery delivered', async () => {
      const { BookingService } = require('@/lib/services/booking.service')
      const deliveryWithBooking = {
        ...sampleDelivery,
        type: 'RETURN',
        booking: { ...sampleBooking, status: 'ACTIVE' },
      }
      mockDeliveryFindFirst
        .mockResolvedValueOnce(deliveryWithBooking)
        .mockResolvedValueOnce({ ...deliveryWithBooking, status: 'DELIVERED' })
      mockDeliveryUpdate.mockResolvedValue({})
      await DeliveryService.updateDeliveryStatus('bkg-1', 'delivered', 'u1')
      expect(BookingService.transitionState).toHaveBeenCalledWith('bkg-1', 'RETURNED', 'u1')
    })

    it('finds delivery by deliveryIdParam when provided', async () => {
      const deliveryWithBooking = {
        ...sampleDelivery,
        type: 'PICKUP',
        booking: { ...sampleBooking, status: 'CONFIRMED' },
      }
      mockDeliveryFindFirst
        .mockResolvedValueOnce(deliveryWithBooking)
        .mockResolvedValueOnce({ ...deliveryWithBooking, status: 'DELIVERED' })
      mockDeliveryUpdate.mockResolvedValue({})
      await DeliveryService.updateDeliveryStatus('bkg-1', 'delivered', 'u1', undefined, 'del-1')
      expect(mockDeliveryFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ id: 'del-1', bookingId: 'bkg-1' }) })
      )
    })
  })

  describe('getDeliveriesByBooking', () => {
    it('throws ForbiddenError when user lacks permission', async () => {
      hasPermission.mockResolvedValue(false)
      await expect(DeliveryService.getDeliveriesByBooking('bkg-1', 'u1')).rejects.toThrow(ForbiddenError)
    })

    it('throws NotFoundError when booking not found', async () => {
      mockBookingFindFirst.mockResolvedValue(null)
      await expect(DeliveryService.getDeliveriesByBooking('missing', 'u1')).rejects.toThrow(NotFoundError)
    })

    it('returns deliveries from booking when found', async () => {
      mockBookingFindFirst.mockResolvedValue({
        id: 'booking-1',
        bookingNumber: 'B001',
        deliveries: [
          {
            id: 'del-1',
            type: 'PICKUP',
            status: 'SCHEDULED',
            scheduledDate: new Date(),
            address: 'A',
            city: 'Riyadh',
            contactName: 'N',
            contactPhone: 'P',
            driver: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
        equipment: [
          { equipmentId: 'eq1', equipment: { id: 'eq1', sku: 'S1', model: 'M1' }, quantity: 1 },
        ],
      })
      const result = await DeliveryService.getDeliveriesByBooking('booking-1', 'u1')
      expect(Array.isArray(result)).toBe(true)
      expect(result[0]).toMatchObject({ id: 'del-1', type: 'pickup', status: 'scheduled' })
    })
  })

  describe('getPendingDeliveries', () => {
    it('throws ForbiddenError when user lacks permission', async () => {
      hasPermission.mockResolvedValue(false)
      await expect(DeliveryService.getPendingDeliveries('u1')).rejects.toThrow(ForbiddenError)
    })

    it('returns array', async () => {
      mockDeliveryFindMany.mockResolvedValue([])
      const result = await DeliveryService.getPendingDeliveries('u1')
      expect(Array.isArray(result)).toBe(true)
    })

    it('applies filters when provided', async () => {
      mockDeliveryFindMany.mockResolvedValue([])
      await DeliveryService.getPendingDeliveries('u1', {
        type: 'pickup',
        driverId: 'drv-1',
        dateFrom: new Date('2025-01-01'),
        dateTo: new Date('2025-01-31'),
      })
      expect(mockDeliveryFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: 'PICKUP',
            driverId: 'drv-1',
            scheduledDate: { gte: expect.any(Date), lte: expect.any(Date) },
          }),
        })
      )
    })

    it('maps equipment when deliveries have booking with equipment', async () => {
      mockDeliveryFindMany.mockResolvedValue([
        {
          id: 'del-1',
          deliveryNumber: 'DLV-1',
          booking: {
            bookingNumber: 'B001',
            equipment: [
              { equipmentId: 'eq1', equipment: { id: 'eq1', sku: 'S1', model: 'M1' }, quantity: 1 },
            ],
          },
          type: 'PICKUP',
          status: 'SCHEDULED',
          scheduledDate: new Date(),
          address: 'A',
          city: 'Riyadh',
          contactName: 'N',
          contactPhone: 'P',
          driver: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])
      const result = await DeliveryService.getPendingDeliveries('u1')
      expect(result[0].equipment).toHaveLength(1)
      expect(result[0].equipment[0]).toMatchObject({ id: 'eq1', sku: 'S1', model: 'M1', quantity: 1 })
    })
  })

  describe('getDriverDeliveries', () => {
    it('throws ForbiddenError when user lacks permission', async () => {
      hasPermission.mockResolvedValue(false)
      await expect(DeliveryService.getDriverDeliveries('drv-1', 'u1')).rejects.toThrow(ForbiddenError)
    })

    it('returns driver deliveries with filters', async () => {
      mockDeliveryFindMany.mockResolvedValue([])
      await DeliveryService.getDriverDeliveries('drv-1', 'u1', {
        status: 'scheduled',
        dateFrom: new Date('2025-01-01'),
        dateTo: new Date('2025-01-31'),
      })
      expect(mockDeliveryFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            driverId: 'drv-1',
            status: 'SCHEDULED',
            scheduledDate: { gte: expect.any(Date), lte: expect.any(Date) },
          }),
        })
      )
    })

    it('maps equipment when driver deliveries have booking with equipment', async () => {
      mockDeliveryFindMany.mockResolvedValue([
        {
          id: 'del-1',
          deliveryNumber: 'DLV-1',
          booking: {
            bookingNumber: 'B001',
            equipment: [
              { equipmentId: 'eq1', equipment: { id: 'eq1', sku: 'S1', model: 'M1' }, quantity: 1 },
            ],
          },
          type: 'PICKUP',
          status: 'SCHEDULED',
          scheduledDate: new Date(),
          address: 'A',
          city: 'Riyadh',
          contactName: 'N',
          contactPhone: 'P',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])
      const result = await DeliveryService.getDriverDeliveries('drv-1', 'u1')
      expect(result[0].equipment).toHaveLength(1)
      expect(result[0].equipment[0]).toMatchObject({ id: 'eq1', sku: 'S1', model: 'M1', quantity: 1 })
    })
  })
})
