/**
 * Unit tests for MaintenanceService (create, list, getById)
 */

import { MaintenanceService } from '../maintenance.service'
import { prisma } from '@/lib/db/prisma'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    maintenance: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
    equipment: { findFirst: jest.fn(), update: jest.fn() },
    user: { findFirst: jest.fn() },
  },
}))

jest.mock('@/lib/services/audit.service', () => ({ AuditService: { log: jest.fn().mockResolvedValue(undefined) } }))
jest.mock('@/lib/events/event-bus', () => ({ EventBus: { emit: jest.fn().mockResolvedValue(undefined) } }))
const mockHasPermission = jest.fn().mockResolvedValue(true)
jest.mock('@/lib/auth/permissions', () => ({ hasPermission: (...args: unknown[]) => mockHasPermission(...args) }))

const mockFindFirst = prisma.maintenance.findFirst as jest.Mock
const mockCreate = prisma.maintenance.create as jest.Mock
const mockUpdate = prisma.maintenance.update as jest.Mock
const mockFindMany = prisma.maintenance.findMany as jest.Mock

const mockEquipmentFindFirst = prisma.equipment.findFirst as jest.Mock
const mockEquipmentUpdate = prisma.equipment.update as jest.Mock
const mockUserFindFirst = prisma.user.findFirst as jest.Mock

describe('MaintenanceService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockHasPermission.mockResolvedValue(true)
    mockFindFirst.mockResolvedValue(null)
    mockEquipmentFindFirst.mockResolvedValue({ id: 'eq1', condition: 'MAINTENANCE' })
    mockEquipmentUpdate.mockResolvedValue({})
    mockCreate.mockResolvedValue({
      id: 'm1',
      maintenanceNumber: 'MT-X-1',
      equipmentId: 'eq1',
      type: 'PREVENTIVE',
      status: 'SCHEDULED',
    })
  })

  describe('create', () => {
    it('creates and returns maintenance', async () => {
      const result = await MaintenanceService.create(
        {
          equipmentId: 'eq1',
          type: 'preventive',
          priority: 'medium',
          scheduledDate: new Date(),
          description: 'Routine',
          notes: 'Routine',
        },
        'u1'
      )
      expect(result).toMatchObject({ id: 'm1' })
      expect(mockCreate).toHaveBeenCalled()
    })

    it('throws ForbiddenError when user lacks create permission', async () => {
      mockHasPermission.mockResolvedValue(false)
      await expect(
        MaintenanceService.create(
          { equipmentId: 'eq1', type: 'preventive', priority: 'medium', scheduledDate: new Date(), description: 'x' },
          'u1'
        )
      ).rejects.toThrow('You do not have permission to create maintenance')
    })

    it('retries generateMaintenanceNumber when collision occurs', async () => {
      mockEquipmentFindFirst.mockResolvedValue({ id: 'eq1', condition: 'GOOD' })
      const maintenanceFindFirst = prisma.maintenance.findFirst as jest.Mock
      maintenanceFindFirst
        .mockResolvedValueOnce({ id: 'existing', maintenanceNumber: 'MT-X-1' })
        .mockResolvedValueOnce(null)
      mockCreate.mockResolvedValue({
        id: 'm1',
        maintenanceNumber: 'MT-X-2',
        equipmentId: 'eq1',
        type: 'PREVENTIVE',
        status: 'SCHEDULED',
      })
      const result = await MaintenanceService.create(
        { equipmentId: 'eq1', type: 'preventive', priority: 'medium', scheduledDate: new Date(), description: 'x' },
        'u1'
      )
      expect(result).toMatchObject({ id: 'm1' })
    })

    it('updates equipment condition when not already MAINTENANCE', async () => {
      mockEquipmentFindFirst.mockResolvedValue({ id: 'eq1', condition: 'GOOD' })
      await MaintenanceService.create(
        { equipmentId: 'eq1', type: 'corrective', priority: 'medium', scheduledDate: new Date(), description: 'x' },
        'u1'
      )
      expect(mockEquipmentUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ condition: 'MAINTENANCE' }) })
      )
    })

    it('maps corrective type to CORRECTIVE', async () => {
      await MaintenanceService.create(
        { equipmentId: 'eq1', type: 'corrective', priority: 'medium', scheduledDate: new Date(), description: 'x' },
        'u1'
      )
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: 'CORRECTIVE' }),
        })
      )
    })

    it('maps inspection and repair types', async () => {
      await MaintenanceService.create(
        { equipmentId: 'eq1', type: 'inspection', priority: 'medium', scheduledDate: new Date(), description: 'x' },
        'u1'
      )
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: 'INSPECTION' }),
        })
      )
    })

    it('validates technician when provided', async () => {
      mockUserFindFirst.mockResolvedValue({ id: 'tech1', role: 'TECHNICIAN' })
      await MaintenanceService.create(
        {
          equipmentId: 'eq1',
          type: 'preventive',
          priority: 'medium',
          scheduledDate: new Date(),
          description: 'x',
          technicianId: 'tech1',
        },
        'u1'
      )
      expect(mockUserFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ id: 'tech1', role: 'TECHNICIAN' }) })
      )
    })

    it('throws NotFoundError when technician not found', async () => {
      mockUserFindFirst.mockResolvedValue(null)
      await expect(
        MaintenanceService.create(
          {
            equipmentId: 'eq1',
            type: 'preventive',
            priority: 'medium',
            scheduledDate: new Date(),
            description: 'x',
            technicianId: 'tech_invalid',
          },
          'u1'
        )
      ).rejects.toThrow('Technician')
    })

    it('throws NotFoundError when equipment not found', async () => {
      mockEquipmentFindFirst.mockResolvedValue(null)
      await expect(
        MaintenanceService.create(
          { equipmentId: 'eq_nonexistent', type: 'preventive', priority: 'medium', scheduledDate: new Date(), description: 'x' },
          'u1'
        )
      ).rejects.toThrow('Equipment')
    })
  })

  describe('list', () => {
    it('returns maintenance array and total', async () => {
      mockFindMany.mockResolvedValue([])
      const countMock = prisma.maintenance.count as jest.Mock
      countMock.mockResolvedValue(0)
      const result = await MaintenanceService.list('u1', {})
      expect(result).toHaveProperty('maintenance')
      expect(Array.isArray(result.maintenance)).toBe(true)
      expect(result.total).toBe(0)
    })

    it('throws ForbiddenError when user lacks read permission', async () => {
      mockHasPermission.mockResolvedValue(false)
      await expect(MaintenanceService.list('u1')).rejects.toThrow('You do not have permission to view maintenance')
    })

    it('applies status filter', async () => {
      mockFindMany.mockResolvedValue([])
      const countMock = prisma.maintenance.count as jest.Mock
      countMock.mockResolvedValue(0)
      await MaintenanceService.list('u1', { status: 'in_progress' })
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'IN_PROGRESS' }),
        })
      )
    })

    it('applies type, equipmentId, technicianId filters', async () => {
      mockFindMany.mockResolvedValue([])
      const countMock = prisma.maintenance.count as jest.Mock
      countMock.mockResolvedValue(0)
      await MaintenanceService.list('u1', {
        type: 'corrective',
        equipmentId: 'eq1',
        technicianId: 'tech1',
      })
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            type: 'CORRECTIVE',
            equipmentId: 'eq1',
            technicianId: 'tech1',
          }),
        })
      )
    })

    it('applies dateFrom and dateTo filters', async () => {
      mockFindMany.mockResolvedValue([])
      const countMock = prisma.maintenance.count as jest.Mock
      countMock.mockResolvedValue(0)
      const dateFrom = new Date('2026-01-01')
      const dateTo = new Date('2026-01-31')
      await MaintenanceService.list('u1', { dateFrom, dateTo })
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            scheduledDate: { gte: dateFrom, lte: dateTo },
          }),
        })
      )
    })

    it('returns and transforms maintenance records', async () => {
      mockFindMany.mockResolvedValue([
        {
          id: 'm1',
          maintenanceNumber: 'MT-X-1',
          equipmentId: 'eq1',
          type: 'PREVENTIVE',
          status: 'SCHEDULED',
          equipment: { id: 'eq1', sku: 'EQ1', model: 'Model' },
          technician: null,
          scheduledDate: new Date(),
          completedDate: null,
          priority: 'medium',
          description: null,
          notes: null,
          cost: null,
          partsUsed: null,
          equipmentConditionBefore: null,
          equipmentConditionAfter: null,
          technicianId: null,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ])
      const countMock = prisma.maintenance.count as jest.Mock
      countMock.mockResolvedValue(1)
      const result = await MaintenanceService.list('u1', {})
      expect(result.maintenance).toHaveLength(1)
      expect(result.maintenance[0].id).toBe('m1')
    })
  })

  describe('getById', () => {
    it('returns maintenance when found', async () => {
      mockFindFirst.mockResolvedValue({
        id: 'm1',
        maintenanceNumber: 'MT-X-1',
        equipmentId: 'eq1',
        type: 'PREVENTIVE',
        status: 'SCHEDULED',
        priority: 'medium',
        scheduledDate: new Date(),
        completedDate: null,
        technicianId: null,
        description: 'Test',
        notes: null,
        cost: null,
        partsUsed: null,
        equipmentConditionBefore: 'GOOD',
        equipmentConditionAfter: null,
        equipment: { id: 'eq1', sku: 'EQ1', model: 'Model' },
        technician: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      const result = await MaintenanceService.getById('m1', 'u1')
      expect(result.id).toBe('m1')
    })

    it('throws ForbiddenError when user lacks read permission', async () => {
      mockHasPermission.mockResolvedValue(false)
      await expect(MaintenanceService.getById('m1', 'u1')).rejects.toThrow(
        'You do not have permission to view maintenance'
      )
    })

    it('transforms maintenance with undefined equipment', async () => {
      mockFindFirst.mockResolvedValue({
        id: 'm1',
        maintenanceNumber: 'MT-X-1',
        equipmentId: 'eq1',
        type: 'PREVENTIVE',
        status: 'SCHEDULED',
        priority: 'medium',
        scheduledDate: new Date(),
        completedDate: null,
        technicianId: null,
        description: 'Test',
        notes: null,
        cost: null,
        partsUsed: null,
        equipmentConditionBefore: 'GOOD',
        equipmentConditionAfter: null,
        equipment: null,
        technician: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      const result = await MaintenanceService.getById('m1', 'u1')
      expect(result.equipment).toBeUndefined()
    })

    it('throws NotFoundError when maintenance not found', async () => {
      mockFindFirst.mockResolvedValue(null)
      await expect(MaintenanceService.getById('m_nonexistent', 'u1')).rejects.toThrow('Maintenance')
    })
  })

  describe('update', () => {
    it('updates maintenance when found', async () => {
      mockFindFirst
        .mockResolvedValueOnce({
          id: 'm1',
          maintenanceNumber: 'MT-X-1',
          equipmentId: 'eq1',
          type: 'PREVENTIVE',
          status: 'SCHEDULED',
          equipment: {},
          technician: null,
        })
        .mockResolvedValueOnce({ id: 'm1' })
      mockUpdate.mockResolvedValue({
        id: 'm1',
        type: 'CORRECTIVE',
        status: 'SCHEDULED',
        equipment: {},
        technician: null,
      })
      const result = await MaintenanceService.update('m1', { type: 'corrective' }, 'u1')
      expect(result).toMatchObject({ id: 'm1' })
    })

    it('throws ForbiddenError when user lacks update permission', async () => {
      mockHasPermission.mockResolvedValue(false)
      await expect(MaintenanceService.update('m1', { type: 'corrective' }, 'u1')).rejects.toThrow(
        'You do not have permission to update maintenance'
      )
    })

    it('validates technician when provided in update', async () => {
      mockFindFirst.mockResolvedValue({
        id: 'm1',
        maintenanceNumber: 'MT-X-1',
        equipmentId: 'eq1',
        type: 'PREVENTIVE',
        status: 'SCHEDULED',
        equipment: {},
        technician: null,
      })
      mockUserFindFirst.mockResolvedValue(null)
      await expect(
        MaintenanceService.update('m1', { technicianId: 'tech_invalid' }, 'u1')
      ).rejects.toThrow('Technician')
    })

    it('throws NotFoundError when maintenance not found for update', async () => {
      mockFindFirst.mockResolvedValue(null)
      await expect(MaintenanceService.update('m_nonexistent', { type: 'corrective' }, 'u1')).rejects.toThrow(
        'Maintenance'
      )
    })

    it('updates with status and scheduledDate', async () => {
      mockFindFirst.mockResolvedValue({
        id: 'm1',
        maintenanceNumber: 'MT-X-1',
        equipmentId: 'eq1',
        type: 'PREVENTIVE',
        status: 'SCHEDULED',
        equipment: {},
        technician: null,
      })
      mockUpdate.mockResolvedValue({
        id: 'm1',
        type: 'PREVENTIVE',
        status: 'IN_PROGRESS',
        scheduledDate: new Date(),
        equipment: {},
        technician: null,
      })
      const result = await MaintenanceService.update(
        'm1',
        { status: 'in_progress', scheduledDate: new Date('2026-02-01') },
        'u1'
      )
      expect(result).toMatchObject({ id: 'm1' })
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'IN_PROGRESS',
            scheduledDate: new Date('2026-02-01'),
          }),
        })
      )
    })
  })

  describe('complete', () => {
    it('completes maintenance when found', async () => {
      mockFindFirst.mockResolvedValue({
        id: 'm1',
        maintenanceNumber: 'MT-X-1',
        equipmentId: 'eq1',
        equipment: { id: 'eq1', condition: 'MAINTENANCE' },
        notes: null,
        cost: null,
        equipmentConditionAfter: null,
      })
      mockUpdate.mockResolvedValue({
        id: 'm1',
        maintenanceNumber: 'MT-X-1',
        equipmentId: 'eq1',
        type: 'PREVENTIVE',
        status: 'COMPLETED',
        priority: 'medium',
        scheduledDate: new Date(),
        completedDate: new Date(),
        technicianId: null,
        description: null,
        notes: null,
        cost: null,
        partsUsed: null,
        equipmentConditionBefore: 'MAINTENANCE',
        equipmentConditionAfter: 'GOOD',
        equipment: { id: 'eq1', sku: 'EQ1', model: 'Model' },
        technician: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      mockEquipmentUpdate.mockResolvedValue({})
      const result = await MaintenanceService.complete('m1', { equipmentConditionAfter: 'GOOD' }, 'u1')
      expect(result).toMatchObject({ id: 'm1' })
    })

    it('throws NotFoundError when maintenance not found for complete', async () => {
      mockFindFirst.mockResolvedValue(null)
      await expect(
        MaintenanceService.complete('m_nonexistent', { equipmentConditionAfter: 'GOOD' }, 'u1')
      ).rejects.toThrow('Maintenance')
    })

    it('throws ForbiddenError when user lacks complete permission', async () => {
      mockHasPermission.mockResolvedValue(false)
      await expect(
        MaintenanceService.complete('m1', { equipmentConditionAfter: 'GOOD' }, 'u1')
      ).rejects.toThrow('You do not have permission to complete maintenance')
    })

    it('updates equipment condition when newCondition is not MAINTENANCE', async () => {
      mockFindFirst.mockResolvedValue({
        id: 'm1',
        maintenanceNumber: 'MT-X-1',
        equipmentId: 'eq1',
        equipment: { id: 'eq1', condition: 'MAINTENANCE' },
        notes: null,
        cost: null,
        equipmentConditionAfter: null,
      })
      mockUpdate.mockResolvedValue({
        id: 'm1',
        maintenanceNumber: 'MT-X-1',
        equipmentId: 'eq1',
        type: 'PREVENTIVE',
        status: 'COMPLETED',
        equipment: { id: 'eq1', sku: 'EQ1', model: 'Model' },
        technician: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      mockEquipmentUpdate.mockResolvedValue({})
      await MaintenanceService.complete('m1', { equipmentConditionAfter: 'GOOD' }, 'u1')
      expect(mockEquipmentUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ data: { condition: 'GOOD', updatedBy: 'u1' } })
      )
    })
  })

  describe('delete', () => {
    it('soft-deletes maintenance when found', async () => {
      mockFindFirst.mockResolvedValue({ id: 'm1', maintenanceNumber: 'MT-X-1' })
      mockUpdate.mockResolvedValue({})
      await MaintenanceService.delete('m1', 'u1')
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'm1' },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        })
      )
    })

    it('throws ForbiddenError when user lacks delete permission', async () => {
      mockHasPermission.mockResolvedValue(false)
      await expect(MaintenanceService.delete('m1', 'u1')).rejects.toThrow(
        'You do not have permission to delete maintenance'
      )
    })

    it('throws NotFoundError when maintenance not found for delete', async () => {
      mockFindFirst.mockResolvedValue(null)
      await expect(MaintenanceService.delete('m_nonexistent', 'u1')).rejects.toThrow('Maintenance')
    })
  })
})
