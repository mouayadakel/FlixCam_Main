/**
 * Unit tests for warehouse.service
 * PATHS: checkOut (permission, not found, wrong status, invalid equipment, success);
 * checkIn (permission, not found, wrong status, success); getInventory; getReadyForCheckOut; getReadyForCheckIn
 */

import { WarehouseService } from '../warehouse.service'
import { prisma } from '@/lib/db/prisma'
import { NotFoundError, ValidationError, ForbiddenError } from '@/lib/errors'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    booking: { findFirst: jest.fn(), findMany: jest.fn() },
    equipment: { findMany: jest.fn(), updateMany: jest.fn() },
    inspection: { findMany: jest.fn() },
    bookingEquipment: { findMany: jest.fn() },
    $transaction: jest.fn((cb) => cb({})),
  },
}))

jest.mock('@/lib/auth/permissions', () => ({
  hasPermission: jest.fn(),
}))

jest.mock('../inspection.service', () => ({
  InspectionService: {
    create: jest.fn().mockResolvedValue({ id: 'insp_1' }),
  },
}))

jest.mock('../booking.service', () => ({
  BookingService: {
    transitionState: jest.fn().mockResolvedValue(undefined),
  },
}))

jest.mock('../audit.service', () => ({
  AuditService: { log: jest.fn().mockResolvedValue(undefined) },
}))

jest.mock('@/lib/events/event-bus', () => ({
  EventBus: { emit: jest.fn().mockResolvedValue(undefined) },
}))

const mockBookingFindFirst = prisma.booking.findFirst as jest.Mock
const mockBookingFindMany = prisma.booking.findMany as jest.Mock
const mockEquipmentFindMany = prisma.equipment.findMany as jest.Mock
const mockInspectionFindMany = prisma.inspection.findMany as jest.Mock
const mockTransaction = prisma.$transaction as jest.Mock
const hasPermission = require('@/lib/auth/permissions').hasPermission as jest.Mock

const baseBooking = {
  id: 'bk_1',
  status: 'CONFIRMED',
  equipment: [
    { equipmentId: 'eq_1', equipment: { id: 'eq_1' } },
    { equipmentId: 'eq_2', equipment: { id: 'eq_2' } },
  ],
}

describe('WarehouseService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    hasPermission.mockResolvedValue(true)
  })

  describe('checkOut', () => {
    it('throws ForbiddenError when user lacks warehouse.check_out', async () => {
      hasPermission.mockResolvedValue(false)
      await expect(
        WarehouseService.checkOut(
          { bookingId: 'bk_1', equipmentIds: ['eq_1'], checklist: [] },
          'user_1'
        )
      ).rejects.toThrow(ForbiddenError)
    })

    it('throws NotFoundError when booking not found', async () => {
      mockBookingFindFirst.mockResolvedValue(null)
      await expect(
        WarehouseService.checkOut(
          { bookingId: 'missing', equipmentIds: ['eq_1'], checklist: [] },
          'user_1'
        )
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError when booking status is not CONFIRMED or ACTIVE', async () => {
      mockBookingFindFirst.mockResolvedValue({ ...baseBooking, status: 'DRAFT' })
      await expect(
        WarehouseService.checkOut(
          { bookingId: 'bk_1', equipmentIds: ['eq_1'], checklist: [] },
          'user_1'
        )
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError when equipment not part of booking', async () => {
      mockBookingFindFirst.mockResolvedValue(baseBooking)
      mockInspectionFindMany.mockResolvedValue([])
      await expect(
        WarehouseService.checkOut(
          { bookingId: 'bk_1', equipmentIds: ['eq_unknown'], checklist: [] },
          'user_1'
        )
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError when equipment already checked out', async () => {
      mockBookingFindFirst.mockResolvedValue(baseBooking)
      mockInspectionFindMany.mockResolvedValue([{ id: 'insp_1' }])
      await expect(
        WarehouseService.checkOut(
          { bookingId: 'bk_1', equipmentIds: ['eq_1'], checklist: [] },
          'user_1'
        )
      ).rejects.toThrow(ValidationError)
    })

    it('returns inspections when valid', async () => {
      mockBookingFindFirst.mockResolvedValue(baseBooking)
      mockInspectionFindMany.mockResolvedValue([])
      mockTransaction.mockImplementation((cb) => cb({ equipment: { updateMany: jest.fn().mockResolvedValue({}) } }))
      const result = await WarehouseService.checkOut(
        { bookingId: 'bk_1', equipmentIds: ['eq_1'], checklist: [] },
        'user_1'
      )
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })

    it('updates equipment warehouseLocation when warehouseLocation provided', async () => {
      mockBookingFindFirst.mockResolvedValue(baseBooking)
      mockInspectionFindMany.mockResolvedValue([])
      const updateMany = jest.fn().mockResolvedValue({})
      mockTransaction.mockImplementation((cb) => cb({ equipment: { updateMany } }))
      await WarehouseService.checkOut(
        { bookingId: 'bk_1', equipmentIds: ['eq_1', 'eq_2'], checklist: [], warehouseLocation: 'A-1' },
        'user_1'
      )
      expect(updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: ['eq_1', 'eq_2'] }, deletedAt: null },
          data: { warehouseLocation: 'A-1' },
        })
      )
    })
  })

  describe('checkIn', () => {
    it('updates equipment condition when condition provided', async () => {
      mockBookingFindFirst.mockResolvedValue({ ...baseBooking, status: 'ACTIVE' })
      mockInspectionFindMany.mockImplementation(() => Promise.resolve([{ id: 'co1' }]))
      const updateMany = jest.fn().mockResolvedValue({})
      mockTransaction.mockImplementation((cb) =>
        cb({
          equipment: { updateMany },
          bookingEquipment: { findMany: jest.fn().mockResolvedValue([{ equipmentId: 'eq_1' }]) },
          inspection: { findMany: jest.fn().mockResolvedValue([{ equipmentId: 'eq_1' }]) },
        })
      )
      await WarehouseService.checkIn(
        { bookingId: 'bk_1', equipmentIds: ['eq_1'], checklist: [], condition: 'GOOD' },
        'user_1'
      )
      expect(updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: ['eq_1'] }, deletedAt: null },
          data: { condition: 'GOOD' },
        })
      )
    })

    it('throws ForbiddenError when user lacks warehouse.check_in', async () => {
      hasPermission.mockResolvedValue(false)
      await expect(
        WarehouseService.checkIn(
          { bookingId: 'bk_1', equipmentIds: ['eq_1'], checklist: [] },
          'user_1'
        )
      ).rejects.toThrow(ForbiddenError)
    })

    it('throws NotFoundError when booking not found', async () => {
      mockBookingFindFirst.mockResolvedValue(null)
      await expect(
        WarehouseService.checkIn(
          { bookingId: 'missing', equipmentIds: ['eq_1'], checklist: [] },
          'user_1'
        )
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError when booking status is not ACTIVE', async () => {
      mockBookingFindFirst.mockResolvedValue({ ...baseBooking, status: 'CONFIRMED' })
      await expect(
        WarehouseService.checkIn(
          { bookingId: 'bk_1', equipmentIds: ['eq_1'], checklist: [] },
          'user_1'
        )
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError when equipment not part of booking', async () => {
      mockBookingFindFirst.mockResolvedValue({ ...baseBooking, status: 'ACTIVE', equipment: [{ equipmentId: 'eq_1', equipment: { id: 'eq_1' } }] })
      await expect(
        WarehouseService.checkIn(
          { bookingId: 'bk_1', equipmentIds: ['eq_1', 'eq_99'], checklist: [] },
          'user_1'
        )
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError when equipment not checked out', async () => {
      mockBookingFindFirst.mockResolvedValue({ ...baseBooking, status: 'ACTIVE' })
      mockInspectionFindMany.mockResolvedValue([])
      await expect(
        WarehouseService.checkIn(
          { bookingId: 'bk_1', equipmentIds: ['eq_1'], checklist: [] },
          'user_1'
        )
      ).rejects.toThrow(ValidationError)
    })

    it('returns inspections when valid', async () => {
      mockBookingFindFirst.mockResolvedValue({ ...baseBooking, status: 'ACTIVE' })
      mockInspectionFindMany
        .mockResolvedValueOnce([{ id: 'co1' }])
        .mockResolvedValueOnce([])
      mockTransaction.mockImplementation((cb) =>
        cb({
          equipment: { updateMany: jest.fn().mockResolvedValue({}) },
          bookingEquipment: { findMany: jest.fn().mockResolvedValue([{ equipmentId: 'eq_1' }]) },
          inspection: { findMany: jest.fn().mockResolvedValue([{ equipmentId: 'eq_1' }]) },
        })
      )
      const result = await WarehouseService.checkIn(
        { bookingId: 'bk_1', equipmentIds: ['eq_1'], checklist: [] },
        'user_1'
      )
      expect(result).toBeDefined()
    })

  })

  describe('getInventory', () => {
    it('throws ForbiddenError when user lacks warehouse.read', async () => {
      hasPermission.mockResolvedValue(false)
      await expect(WarehouseService.getInventory('user_1')).rejects.toThrow(ForbiddenError)
    })

    it('returns inventory items', async () => {
      mockEquipmentFindMany.mockResolvedValue([
        {
          id: 'eq_1',
          sku: 'SKU1',
          model: 'Model1',
          condition: 'EXCELLENT',
          warehouseLocation: 'A1',
          bookings: [],
        },
      ])
      const result = await WarehouseService.getInventory('user_1')
      expect(Array.isArray(result)).toBe(true)
      expect(result[0]).toMatchObject({
        equipmentId: 'eq_1',
        sku: 'SKU1',
        model: 'Model1',
        condition: 'EXCELLENT',
        warehouseLocation: 'A1',
        isAvailable: true,
        isCheckedOut: false,
        currentBookingId: null,
      })
    })

    it('filters by warehouseLocation when provided', async () => {
      mockEquipmentFindMany.mockResolvedValue([])
      await WarehouseService.getInventory('user_1', { warehouseLocation: 'Zone-A' })
      expect(mockEquipmentFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ warehouseLocation: 'Zone-A', deletedAt: null }),
        })
      )
    })

    it('filters by condition when provided', async () => {
      mockEquipmentFindMany.mockResolvedValue([])
      await WarehouseService.getInventory('user_1', { condition: 'GOOD' })
      expect(mockEquipmentFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ condition: 'GOOD', deletedAt: null }),
        })
      )
    })

    it('filters by available when provided', async () => {
      mockEquipmentFindMany.mockResolvedValue([
        { id: 'eq_1', sku: 'S1', model: 'M1', condition: 'EXCELLENT', warehouseLocation: null, bookings: [] },
        { id: 'eq_2', sku: 'S2', model: 'M2', condition: 'MAINTENANCE', warehouseLocation: null, bookings: [] },
      ])
      const result = await WarehouseService.getInventory('user_1', { available: true })
      expect(result).toHaveLength(1)
      expect(result[0].equipmentId).toBe('eq_1')
      expect(result[0].isAvailable).toBe(true)
    })
  })

  describe('getReadyForCheckOut', () => {
    it('throws ForbiddenError when user lacks warehouse.read', async () => {
      hasPermission.mockResolvedValue(false)
      await expect(WarehouseService.getReadyForCheckOut('user_1')).rejects.toThrow(ForbiddenError)
    })

    it('returns bookings', async () => {
      mockBookingFindMany.mockResolvedValue([{ id: 'bk_1', status: 'CONFIRMED' }])
      const result = await WarehouseService.getReadyForCheckOut('user_1')
      expect(Array.isArray(result)).toBe(true)
    })
  })

  describe('getReadyForCheckIn', () => {
    it('throws ForbiddenError when user lacks warehouse.read', async () => {
      hasPermission.mockResolvedValue(false)
      await expect(WarehouseService.getReadyForCheckIn('user_1')).rejects.toThrow(ForbiddenError)
    })

    it('returns bookings', async () => {
      mockBookingFindMany.mockResolvedValue([{ id: 'bk_1', status: 'ACTIVE' }])
      const result = await WarehouseService.getReadyForCheckIn('user_1')
      expect(Array.isArray(result)).toBe(true)
    })
  })
})
