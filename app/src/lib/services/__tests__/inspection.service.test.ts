/**
 * Unit tests for inspection.service
 */

import { InspectionService } from '../inspection.service'
import { prisma } from '@/lib/db/prisma'
import { hasPermission } from '@/lib/auth/permissions'
import { AuditService } from '../audit.service'
import { NotFoundError, ValidationError, ForbiddenError } from '@/lib/errors'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    booking: { findFirst: jest.fn() },
    equipment: { findFirst: jest.fn() },
    bookingEquipment: { findFirst: jest.fn() },
    inspection: { create: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), update: jest.fn() },
  },
}))
jest.mock('@/lib/auth/permissions', () => ({ hasPermission: jest.fn() }))
jest.mock('../audit.service', () => ({ AuditService: { log: jest.fn() } }))

const mockBookingFindFirst = prisma.booking.findFirst as jest.Mock
const mockEquipmentFindFirst = prisma.equipment.findFirst as jest.Mock
const mockBookingEquipmentFindFirst = prisma.bookingEquipment.findFirst as jest.Mock
const mockInspectionCreate = prisma.inspection.create as jest.Mock
const mockInspectionFindFirst = prisma.inspection.findFirst as jest.Mock
const mockInspectionFindMany = prisma.inspection.findMany as jest.Mock
const mockInspectionUpdate = prisma.inspection.update as jest.Mock
const mockHasPermission = hasPermission as jest.Mock
const mockAuditLog = AuditService.log as jest.Mock

describe('InspectionService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockHasPermission.mockResolvedValue(true)
    mockAuditLog.mockResolvedValue(undefined)
  })

  describe('create', () => {
    const validInput = {
      bookingId: 'book-1',
      type: 'check_in' as const,
      checklist: [{ item: 'Lens', status: 'ok' as const }],
    }

    it('throws ForbiddenError when user lacks permission', async () => {
      mockHasPermission.mockResolvedValueOnce(false)
      await expect(
        InspectionService.create(validInput, 'user-1')
      ).rejects.toThrow(ForbiddenError)
      expect(mockInspectionCreate).not.toHaveBeenCalled()
    })

    it('throws NotFoundError when booking does not exist', async () => {
      mockBookingFindFirst.mockResolvedValueOnce(null)
      await expect(
        InspectionService.create(validInput, 'user-1')
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError when checklist is empty', async () => {
      mockBookingFindFirst.mockResolvedValueOnce({ id: 'book-1' })
      await expect(
        InspectionService.create(
          { ...validInput, checklist: [] },
          'user-1'
        )
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError when equipment is not part of booking', async () => {
      mockBookingFindFirst.mockResolvedValueOnce({ id: 'book-1' })
      mockEquipmentFindFirst.mockResolvedValueOnce({ id: 'eq-1' })
      mockBookingEquipmentFindFirst.mockResolvedValueOnce(null)
      await expect(
        InspectionService.create(
          { ...validInput, equipmentId: 'eq-1' },
          'user-1'
        )
      ).rejects.toThrow(ValidationError)
    })

    it('creates inspection and audits when input is valid', async () => {
      mockBookingFindFirst.mockResolvedValueOnce({ id: 'book-1' })
      mockInspectionCreate.mockResolvedValueOnce({
        id: 'insp-1',
        bookingId: 'book-1',
        type: 'check_in',
        checklist: validInput.checklist,
      })
      const result = await InspectionService.create(validInput, 'user-1')
      expect(mockInspectionCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          bookingId: 'book-1',
          type: 'check_in',
          checklist: validInput.checklist,
          createdBy: 'user-1',
          updatedBy: 'user-1',
        }),
        include: expect.any(Object),
      })
      expect(mockAuditLog).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'inspection.check_in.created',
          userId: 'user-1',
          resourceType: 'inspection',
          resourceId: 'insp-1',
        })
      )
      expect(result.id).toBe('insp-1')
    })
  })

  describe('getById', () => {
    it('throws ForbiddenError when user lacks permission', async () => {
      mockHasPermission.mockResolvedValueOnce(false)
      await expect(InspectionService.getById('insp-1', 'user-1')).rejects.toThrow(ForbiddenError)
    })

    it('throws NotFoundError when inspection not found', async () => {
      mockInspectionFindFirst.mockResolvedValueOnce(null)
      await expect(InspectionService.getById('insp-1', 'user-1')).rejects.toThrow(NotFoundError)
    })

    it('returns inspection when found', async () => {
      const inspection = { id: 'insp-1', bookingId: 'book-1', type: 'check_in' }
      mockInspectionFindFirst.mockResolvedValueOnce(inspection)
      const result = await InspectionService.getById('insp-1', 'user-1')
      expect(result).toEqual(inspection)
    })
  })

  describe('listByBooking', () => {
    it('throws ForbiddenError when user lacks permission', async () => {
      mockHasPermission.mockResolvedValueOnce(false)
      await expect(
        InspectionService.listByBooking('book-1', 'user-1')
      ).rejects.toThrow(ForbiddenError)
    })

    it('returns list of inspections with filters', async () => {
      mockInspectionFindMany.mockResolvedValueOnce([{ id: 'insp-1' }])
      const result = await InspectionService.listByBooking('book-1', 'user-1', {
        type: 'check_out',
        equipmentId: 'eq-1',
      })
      expect(mockInspectionFindMany).toHaveBeenCalledWith({
        where: { bookingId: 'book-1', deletedAt: null, type: 'check_out', equipmentId: 'eq-1' },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      })
      expect(result).toEqual([{ id: 'insp-1' }])
    })
  })

  describe('update', () => {
    it('throws ForbiddenError when user lacks permission', async () => {
      mockHasPermission.mockResolvedValueOnce(false)
      await expect(
        InspectionService.update('insp-1', { notes: 'Updated' }, 'user-1')
      ).rejects.toThrow(ForbiddenError)
    })

    it('updates inspection when permission and record exist', async () => {
      mockInspectionFindFirst
        .mockResolvedValueOnce({ id: 'insp-1' })
        .mockResolvedValueOnce({ id: 'insp-1' })
      mockInspectionUpdate.mockResolvedValueOnce({ id: 'insp-1', notes: 'Updated' })
      const result = await InspectionService.update(
        'insp-1',
        { checklist: [{ item: 'Lens', status: 'damaged' }], notes: 'Updated' },
        'user-1'
      )
      expect(mockInspectionUpdate).toHaveBeenCalledWith({
        where: { id: 'insp-1' },
        data: expect.objectContaining({
          checklist: [{ item: 'Lens', status: 'damaged' }],
          notes: 'Updated',
          updatedBy: 'user-1',
        }),
      })
      expect(result.notes).toBe('Updated')
    })
  })
})
