/**
 * Unit tests for audit.service
 * REQUIREMENTS: AuditService.log creates audit log with input; getLogs filters by userId, resourceType, resourceId, action, date range, limit, offset and returns with user include.
 */

import { AuditService } from '../audit.service'
import { prisma } from '@/lib/db/prisma'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    auditLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  },
}))

const mockCreate = prisma.auditLog.create as jest.Mock
const mockFindMany = prisma.auditLog.findMany as jest.Mock

describe('AuditService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCreate.mockResolvedValue({})
    mockFindMany.mockResolvedValue([])
  })

  describe('log', () => {
    it('calls prisma.auditLog.create with correct data', async () => {
      await AuditService.log({
        action: 'booking.created',
        userId: 'user-1',
        resourceType: 'Booking',
        resourceId: 'book-1',
        ipAddress: '127.0.0.1',
        userAgent: 'Jest',
        metadata: { key: 'value' },
      })
      expect(mockCreate).toHaveBeenCalledTimes(1)
      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          action: 'booking.created',
          userId: 'user-1',
          resourceType: 'Booking',
          resourceId: 'book-1',
          ipAddress: '127.0.0.1',
          userAgent: 'Jest',
          metadata: { key: 'value' },
          timestamp: expect.any(Date),
        },
      })
    })

    it('uses empty object for metadata when not provided', async () => {
      await AuditService.log({ action: 'user.login' })
      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          action: 'user.login',
          metadata: {},
          timestamp: expect.any(Date),
        }),
      })
    })
  })

  describe('getLogs', () => {
    it('calls findMany with where, orderBy, take, skip and include', async () => {
      mockFindMany.mockResolvedValue([])
      await AuditService.getLogs({
        userId: 'u1',
        resourceType: 'Booking',
        limit: 50,
        offset: 10,
      })
      expect(mockFindMany).toHaveBeenCalledWith({
        where: { userId: 'u1', resourceType: 'Booking' },
        orderBy: { timestamp: 'desc' },
        take: 50,
        skip: 10,
        include: { user: { select: { id: true, email: true, name: true } } },
      })
    })

    it('applies date range when dateFrom and dateTo provided', async () => {
      const from = new Date('2026-01-01')
      const to = new Date('2026-01-31')
      await AuditService.getLogs({ dateFrom: from, dateTo: to })
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            timestamp: { gte: from, lte: to },
          },
        })
      )
    })

    it('applies dateFrom only when dateTo not provided', async () => {
      const from = new Date('2026-01-01')
      await AuditService.getLogs({ dateFrom: from })
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { timestamp: { gte: from } },
        })
      )
    })

    it('applies dateTo only when dateFrom not provided', async () => {
      const to = new Date('2026-01-31')
      await AuditService.getLogs({ dateTo: to })
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { timestamp: { lte: to } },
        })
      )
    })

    it('uses default limit 100 and offset 0 when not provided', async () => {
      await AuditService.getLogs({})
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 100,
          skip: 0,
        })
      )
    })

    it('applies dateFrom only when dateTo not provided', async () => {
      const from = new Date('2026-01-01')
      await AuditService.getLogs({ dateFrom: from })
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { timestamp: { gte: from } },
        })
      )
    })

    it('applies dateTo only when dateFrom not provided', async () => {
      const to = new Date('2026-01-31')
      await AuditService.getLogs({ dateTo: to })
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { timestamp: { lte: to } },
        })
      )
    })

    it('uses limit 100 when limit is 0 (falsy)', async () => {
      await AuditService.getLogs({ limit: 0 })
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 })
      )
    })
  })
})
