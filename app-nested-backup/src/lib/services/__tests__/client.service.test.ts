/**
 * Unit tests for ClientService (create, getById, list, update, delete)
 */

import { ClientService } from '../client.service'
import { prisma } from '@/lib/db/prisma'
import { UserRole } from '@prisma/client'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: { findFirst: jest.fn(), create: jest.fn(), findMany: jest.fn(), count: jest.fn(), update: jest.fn() },
    booking: { findMany: jest.fn() },
  },
}))

jest.mock('@/lib/services/audit.service', () => ({ AuditService: { log: jest.fn().mockResolvedValue(undefined) } }))
jest.mock('@/lib/events/event-bus', () => ({ EventBus: { emit: jest.fn().mockResolvedValue(undefined) } }))
jest.mock('@/lib/auth/permissions', () => ({ hasPermission: jest.fn().mockResolvedValue(true) }))
jest.mock('@/lib/auth/auth-helpers', () => ({ hashPassword: jest.fn().mockResolvedValue('hashed') }))

const mockUserFindFirst = prisma.user.findFirst as jest.Mock
const mockUserCreate = prisma.user.create as jest.Mock
const mockUserFindMany = prisma.user.findMany as jest.Mock
const mockUserCount = prisma.user.count as jest.Mock
const mockUserUpdate = prisma.user.update as jest.Mock
const mockBookingFindMany = prisma.booking.findMany as jest.Mock
const mockHasPermission = require('@/lib/auth/permissions').hasPermission as jest.Mock

const sampleUser = {
  id: 'u1',
  email: 'c@test.com',
  name: 'Client',
  phone: null,
  role: UserRole.DATA_ENTRY,
  status: 'active',
  twoFactorEnabled: false,
  verificationStatus: null,
  segmentId: null,
  segment: null,
  createdAt: new Date(),
  updatedAt: new Date(),
}

describe('ClientService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockHasPermission.mockResolvedValue(true)
    mockBookingFindMany.mockResolvedValue([])
  })

  describe('create', () => {
    it('creates user and returns client when email not taken', async () => {
      mockUserFindFirst.mockResolvedValue(null)
      mockUserCreate.mockResolvedValue({ ...sampleUser })
      const result = await ClientService.create(
        { email: 'c@test.com', password: 'secret', name: 'Client' },
        'admin-1'
      )
      expect(result).toMatchObject({ email: 'c@test.com' })
      expect(mockUserCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: 'c@test.com',
            name: 'Client',
            role: UserRole.DATA_ENTRY,
            status: 'active',
          }),
        })
      )
    })

    it('throws ForbiddenError when user lacks permission', async () => {
      mockHasPermission.mockResolvedValue(false)
      await expect(
        ClientService.create({ email: 'c@test.com', password: 'x' }, 'user-1')
      ).rejects.toThrow('You do not have permission to create clients')
    })

    it('throws ValidationError when email exists', async () => {
      mockUserFindFirst.mockResolvedValue({ id: 'existing' })
      await expect(
        ClientService.create({ email: 'taken@test.com', password: 'x' }, 'admin-1')
      ).rejects.toThrow('Email already exists')
    })

    it('uses default role DATA_ENTRY and status active when not provided', async () => {
      mockUserFindFirst.mockResolvedValue(null)
      mockUserCreate.mockResolvedValue({ ...sampleUser })
      await ClientService.create({ email: 'c@test.com', password: 'x' }, 'admin-1')
      expect(mockUserCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: UserRole.DATA_ENTRY,
            status: 'active',
          }),
        })
      )
    })

    it('uses provided role and status', async () => {
      mockUserFindFirst.mockResolvedValue(null)
      mockUserCreate.mockResolvedValue({ ...sampleUser, role: UserRole.ADMIN, status: 'suspended' })
      await ClientService.create(
        { email: 'c@test.com', password: 'x', role: UserRole.ADMIN, status: 'suspended' },
        'admin-1'
      )
      expect(mockUserCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            role: UserRole.ADMIN,
            status: 'suspended',
          }),
        })
      )
    })

    it('passes auditContext to AuditService', async () => {
      mockUserFindFirst.mockResolvedValue(null)
      mockUserCreate.mockResolvedValue({ ...sampleUser })
      const { AuditService } = require('@/lib/services/audit.service')
      await ClientService.create(
        { email: 'c@test.com', password: 'x' },
        'admin-1',
        { ipAddress: '1.2.3.4', userAgent: 'Mozilla' }
      )
      expect(AuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: '1.2.3.4',
          userAgent: 'Mozilla',
        })
      )
    })
  })

  describe('getById', () => {
    it('throws ForbiddenError when user lacks permission', async () => {
      mockHasPermission.mockResolvedValue(false)
      await expect(ClientService.getById('u1', 'user-1')).rejects.toThrow(
        'You do not have permission to view clients'
      )
    })

    it('throws NotFoundError when user not found', async () => {
      mockUserFindFirst.mockResolvedValue(null)
      await expect(ClientService.getById('missing', 'admin-1')).rejects.toThrow('Client')
    })

    it('returns client with statistics when found', async () => {
      mockUserFindFirst.mockResolvedValue({ ...sampleUser })
      mockBookingFindMany.mockResolvedValue([
        { totalAmount: 50, createdAt: new Date('2026-02-15') },
        { totalAmount: 100, createdAt: new Date('2026-02-01') },
      ])
      const result = await ClientService.getById('u1', 'admin-1')
      expect(result).toMatchObject({
        id: 'u1',
        email: 'c@test.com',
        totalBookings: 2,
        totalSpent: 150,
      })
      expect(result.lastBookingDate).toEqual(new Date('2026-02-15'))
    })

    it('returns client with null lastBookingDate when no bookings', async () => {
      mockUserFindFirst.mockResolvedValue({ ...sampleUser })
      mockBookingFindMany.mockResolvedValue([])
      const result = await ClientService.getById('u1', 'admin-1')
      expect(result.totalBookings).toBe(0)
      expect(result.totalSpent).toBe(0)
      expect(result.lastBookingDate).toBeNull()
    })
  })

  describe('list', () => {
    it('throws ForbiddenError when user lacks permission', async () => {
      mockHasPermission.mockResolvedValue(false)
      await expect(ClientService.list('user-1')).rejects.toThrow(
        'You do not have permission to view clients'
      )
    })

    it('returns clients and total from findMany and count', async () => {
      mockUserFindMany.mockResolvedValue([
        { ...sampleUser, id: 'u1', segment: null },
      ])
      mockUserCount.mockResolvedValue(1)
      const result = await ClientService.list('admin-1', { page: 1, pageSize: 20 })
      expect(result.clients).toHaveLength(1)
      expect(result.total).toBe(1)
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(20)
    })

    it('uses default page 1 and pageSize 20 when filters empty', async () => {
      mockUserFindMany.mockResolvedValue([])
      mockUserCount.mockResolvedValue(0)
      const result = await ClientService.list('admin-1', {})
      expect(result.page).toBe(1)
      expect(result.pageSize).toBe(20)
      expect(mockUserFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 })
      )
    })

    it('applies status filter', async () => {
      mockUserFindMany.mockResolvedValue([])
      mockUserCount.mockResolvedValue(0)
      await ClientService.list('admin-1', { status: 'suspended' })
      expect(mockUserFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'suspended' }),
        })
      )
    })

    it('applies role filter', async () => {
      mockUserFindMany.mockResolvedValue([])
      mockUserCount.mockResolvedValue(0)
      await ClientService.list('admin-1', { role: UserRole.ADMIN })
      expect(mockUserFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ role: UserRole.ADMIN }),
        })
      )
    })

    it('applies search filter', async () => {
      mockUserFindMany.mockResolvedValue([])
      mockUserCount.mockResolvedValue(0)
      await ClientService.list('admin-1', { search: 'john' })
      expect(mockUserFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({ email: expect.any(Object) }),
              expect.objectContaining({ name: expect.any(Object) }),
              expect.objectContaining({ phone: expect.any(Object) }),
            ]),
          }),
        })
      )
    })

    it('applies dateFrom and dateTo filters', async () => {
      mockUserFindMany.mockResolvedValue([])
      mockUserCount.mockResolvedValue(0)
      const from = new Date('2026-01-01')
      const to = new Date('2026-01-31')
      await ClientService.list('admin-1', { dateFrom: from, dateTo: to })
      expect(mockUserFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: { gte: from, lte: to },
          }),
        })
      )
    })

    it('filters by hasBookings true', async () => {
      mockUserFindMany.mockResolvedValue([
        { ...sampleUser, id: 'u1', segment: null },
        { ...sampleUser, id: 'u2', segment: null },
      ])
      mockUserCount.mockResolvedValue(2)
      mockBookingFindMany
        .mockResolvedValueOnce([{ totalAmount: 100, createdAt: new Date() }])
        .mockResolvedValueOnce([])
      const result = await ClientService.list('admin-1', { page: 1, pageSize: 20, hasBookings: true })
      expect(result.clients).toHaveLength(1)
      expect(result.clients[0].totalBookings).toBeGreaterThan(0)
    })

    it('filters by hasBookings false', async () => {
      mockUserFindMany.mockResolvedValue([
        { ...sampleUser, id: 'u1', segment: null },
        { ...sampleUser, id: 'u2', segment: null },
      ])
      mockUserCount.mockResolvedValue(2)
      mockBookingFindMany.mockResolvedValue([])
      const result = await ClientService.list('admin-1', { page: 1, pageSize: 20, hasBookings: false })
      expect(result.clients).toHaveLength(2)
    })
  })

  describe('update', () => {
    it('throws ForbiddenError when user lacks permission', async () => {
      mockHasPermission.mockResolvedValue(false)
      await expect(
        ClientService.update('u1', { name: 'New' }, 'user-1')
      ).rejects.toThrow('You do not have permission to update clients')
    })

    it('throws NotFoundError when user not found', async () => {
      mockUserFindFirst.mockResolvedValue(null)
      await expect(
        ClientService.update('missing', { name: 'New' }, 'admin-1')
      ).rejects.toThrow('Client')
    })

    it('updates client and returns updated', async () => {
      mockUserFindFirst.mockResolvedValue({ ...sampleUser })
      mockUserUpdate.mockResolvedValue({ ...sampleUser, name: 'Updated', phone: '+123' })
      const result = await ClientService.update('u1', { name: 'Updated', phone: '+123' }, 'admin-1')
      expect(result).toMatchObject({ name: 'Updated', phone: '+123' })
      expect(mockUserUpdate).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: expect.objectContaining({
          name: 'Updated',
          phone: '+123',
          updatedBy: 'admin-1',
        }),
      })
    })

    it('updates only provided fields', async () => {
      mockUserFindFirst.mockResolvedValue({ ...sampleUser })
      mockUserUpdate.mockResolvedValue({ ...sampleUser, status: 'suspended' })
      await ClientService.update('u1', { status: 'suspended' }, 'admin-1')
      expect(mockUserUpdate).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: expect.objectContaining({
          status: 'suspended',
          updatedBy: 'admin-1',
        }),
      })
    })

    it('updates role when provided', async () => {
      mockUserFindFirst.mockResolvedValue({ ...sampleUser })
      mockUserUpdate.mockResolvedValue({ ...sampleUser, role: UserRole.ADMIN })
      await ClientService.update('u1', { role: UserRole.ADMIN }, 'admin-1')
      expect(mockUserUpdate).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: expect.objectContaining({
          role: UserRole.ADMIN,
          updatedBy: 'admin-1',
        }),
      })
    })

    it('passes auditContext to AuditService', async () => {
      mockUserFindFirst.mockResolvedValue({ ...sampleUser })
      mockUserUpdate.mockResolvedValue({ ...sampleUser })
      const { AuditService } = require('@/lib/services/audit.service')
      await ClientService.update('u1', { name: 'X' }, 'admin-1', {
        ipAddress: '1.2.3.4',
        userAgent: 'Mozilla',
      })
      expect(AuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: '1.2.3.4',
          userAgent: 'Mozilla',
        })
      )
    })
  })

  describe('delete', () => {
    it('throws ForbiddenError when user lacks permission', async () => {
      mockHasPermission.mockResolvedValue(false)
      await expect(ClientService.delete('u1', 'user-1')).rejects.toThrow(
        'You do not have permission to delete clients'
      )
    })

    it('throws NotFoundError when user not found', async () => {
      mockUserFindFirst.mockResolvedValue(null)
      await expect(ClientService.delete('missing', 'admin-1')).rejects.toThrow('Client')
    })

    it('soft deletes client', async () => {
      mockUserFindFirst.mockResolvedValue({ ...sampleUser })
      mockUserUpdate.mockResolvedValue({ ...sampleUser, deletedAt: new Date() })
      await ClientService.delete('u1', 'admin-1')
      expect(mockUserUpdate).toHaveBeenCalledWith({
        where: { id: 'u1' },
        data: expect.objectContaining({
          deletedAt: expect.any(Date),
          deletedBy: 'admin-1',
          updatedBy: 'admin-1',
        }),
      })
    })

    it('passes auditContext to AuditService', async () => {
      mockUserFindFirst.mockResolvedValue({ ...sampleUser })
      mockUserUpdate.mockResolvedValue({})
      const { AuditService } = require('@/lib/services/audit.service')
      await ClientService.delete('u1', 'admin-1', {
        ipAddress: '1.2.3.4',
        userAgent: 'Mozilla',
      })
      expect(AuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          ipAddress: '1.2.3.4',
          userAgent: 'Mozilla',
        })
      )
    })
  })
})
