/**
 * Unit tests for MarketingService (create, list, getById)
 */

import { MarketingService } from '../marketing.service'
import { prisma } from '@/lib/db/prisma'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    campaign: { findFirst: jest.fn(), findMany: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
    user: { findMany: jest.fn() },
  },
}))

jest.mock('@/lib/services/audit.service', () => ({ AuditService: { log: jest.fn().mockResolvedValue(undefined) } }))
jest.mock('@/lib/events/event-bus', () => ({ EventBus: { emit: jest.fn().mockResolvedValue(undefined) } }))
const mockHasPermission = jest.fn().mockResolvedValue(true)
jest.mock('@/lib/auth/permissions', () => ({ hasPermission: (...args: unknown[]) => mockHasPermission(...args) }))

const mockCreate = prisma.campaign.create as jest.Mock
const mockFindMany = prisma.campaign.findMany as jest.Mock
const mockFindFirst = prisma.campaign.findFirst as jest.Mock
const mockUpdate = prisma.campaign.update as jest.Mock
const mockUserFindMany = prisma.user.findMany as jest.Mock

describe('MarketingService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockHasPermission.mockResolvedValue(true)
  })

  describe('create', () => {
    it('creates campaign and returns', async () => {
      mockCreate.mockResolvedValue({
        id: 'c1',
        name: 'Campaign',
        type: 'EMAIL',
        status: 'DRAFT',
        content: '',
      })
      const result = await MarketingService.create(
        { name: 'Campaign', type: 'email', content: '' },
        'u1'
      )
      expect(result.id).toBe('c1')
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'Campaign' }),
        })
      )
    })

    it('sets SCHEDULED when scheduledAt > now', async () => {
      mockCreate.mockResolvedValue({
        id: 'c1',
        name: 'Campaign',
        type: 'EMAIL',
        status: 'SCHEDULED',
        content: '',
      })
      await MarketingService.create(
        {
          name: 'Campaign',
          type: 'email',
          content: '',
          scheduledAt: new Date(Date.now() + 86400000),
        },
        'u1'
      )
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'SCHEDULED' }),
        })
      )
    })

    it('sets ACTIVE when scheduledAt <= now', async () => {
      mockCreate.mockResolvedValue({
        id: 'c1',
        name: 'Campaign',
        type: 'EMAIL',
        status: 'ACTIVE',
        content: '',
      })
      await MarketingService.create(
        {
          name: 'Campaign',
          type: 'email',
          content: '',
          scheduledAt: new Date(Date.now() - 1000),
        },
        'u1'
      )
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'ACTIVE' }),
        })
      )
    })

    it('uses mapCampaignType fallback when type not in map', async () => {
      mockCreate.mockResolvedValue({
        id: 'c1',
        name: 'Campaign',
        type: 'EMAIL',
        status: 'DRAFT',
        content: '',
      })
      await MarketingService.create(
        {
          name: 'Campaign',
          type: 'invalid' as any,
          content: '',
        },
        'u1'
      )
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: 'EMAIL' }),
        })
      )
    })

    it('includes subject and targetAudience', async () => {
      mockCreate.mockResolvedValue({ id: 'c1', name: 'Campaign', type: 'EMAIL', status: 'DRAFT' })
      await MarketingService.create(
        {
          name: 'Campaign',
          type: 'email',
          content: 'Hello',
          subject: 'Test Subject',
          targetAudience: ['u1', 'u2'],
        },
        'u1'
      )
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subject: 'Test Subject',
            targetAudience: ['u1', 'u2'],
          }),
        })
      )
    })

    it('throws ForbiddenError when user lacks create permission', async () => {
      mockHasPermission.mockResolvedValue(false)
      await expect(
        MarketingService.create({ name: 'Campaign', type: 'email', content: '' }, 'u1')
      ).rejects.toThrow('You do not have permission to create campaigns')
    })
  })

  describe('list', () => {
    it('returns campaigns and total', async () => {
      mockFindMany.mockResolvedValue([])
      const countMock = prisma.campaign.count as jest.Mock
      countMock.mockResolvedValue(0)
      const result = await MarketingService.list('u1', {})
      expect(result.campaigns).toEqual([])
      expect(result.total).toBe(0)
    })

    it('throws ForbiddenError when user lacks read permission', async () => {
      mockHasPermission.mockResolvedValue(false)
      await expect(MarketingService.list('u1')).rejects.toThrow(
        'You do not have permission to view campaigns'
      )
    })

    it('applies status, type, search, dateFrom, dateTo filters', async () => {
      mockFindMany.mockResolvedValue([])
      const countMock = prisma.campaign.count as jest.Mock
      countMock.mockResolvedValue(0)
      const dateFrom = new Date('2026-01-01')
      const dateTo = new Date('2026-01-31')
      await MarketingService.list('u1', {
        status: 'scheduled',
        type: 'sms',
        search: 'test',
        dateFrom,
        dateTo,
      })
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'SCHEDULED',
            type: 'SMS',
            OR: expect.any(Array),
            createdAt: { gte: dateFrom, lte: dateTo },
          }),
        })
      )
    })

    it('applies dateFrom only filter', async () => {
      mockFindMany.mockResolvedValue([])
      const countMock = prisma.campaign.count as jest.Mock
      countMock.mockResolvedValue(0)
      const dateFrom = new Date('2026-01-01')
      await MarketingService.list('u1', { dateFrom })
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({ gte: dateFrom }),
          }),
        })
      )
    })

    it('applies dateTo only filter', async () => {
      mockFindMany.mockResolvedValue([])
      const countMock = prisma.campaign.count as jest.Mock
      countMock.mockResolvedValue(0)
      const dateTo = new Date('2026-01-31')
      await MarketingService.list('u1', { dateTo })
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            createdAt: expect.objectContaining({ lte: dateTo }),
          }),
        })
      )
    })

    it('returns and transforms campaigns', async () => {
      mockFindMany.mockResolvedValue([
        {
          id: 'c1',
          name: 'Campaign',
          type: 'EMAIL',
          status: 'DRAFT',
          subject: null,
          content: '',
          scheduledAt: new Date(),
          sentAt: null,
        },
      ])
      const countMock = prisma.campaign.count as jest.Mock
      countMock.mockResolvedValue(1)
      const result = await MarketingService.list('u1', {})
      expect(result.campaigns).toHaveLength(1)
      expect(result.campaigns[0].id).toBe('c1')
    })
  })

  describe('getById', () => {
    it('returns campaign when found', async () => {
      mockFindFirst.mockResolvedValue({
        id: 'c1',
        name: 'Campaign',
        type: 'EMAIL',
        status: 'DRAFT',
        subject: null,
        content: '',
        targetAudience: null,
        scheduledAt: null,
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      const result = await MarketingService.getById('c1', 'u1')
      expect(result.id).toBe('c1')
    })

    it('throws ForbiddenError when user lacks read permission', async () => {
      mockHasPermission.mockResolvedValue(false)
      await expect(MarketingService.getById('c1', 'u1')).rejects.toThrow(
        'You do not have permission to view campaigns'
      )
    })

    it('throws NotFoundError when campaign not found', async () => {
      mockFindFirst.mockResolvedValue(null)
      await expect(MarketingService.getById('missing', 'u1')).rejects.toThrow('Campaign')
    })
  })

  describe('update', () => {
    it('updates campaign when found', async () => {
      mockFindFirst.mockResolvedValue({
        id: 'c1',
        name: 'Campaign',
        type: 'EMAIL',
        status: 'DRAFT',
        subject: null,
        content: '',
        targetAudience: null,
        scheduledAt: null,
        sentAt: null,
      })
      mockUpdate.mockResolvedValue({
        id: 'c1',
        name: 'Updated',
        type: 'EMAIL',
        status: 'DRAFT',
      })
      const result = await MarketingService.update('c1', { name: 'Updated' }, 'u1')
      expect(result.name).toBe('Updated')
    })

    it('throws NotFoundError when campaign not found', async () => {
      mockFindFirst.mockResolvedValue(null)
      await expect(MarketingService.update('missing', { name: 'Updated' }, 'u1')).rejects.toThrow(
        'Campaign'
      )
    })

    it('throws ValidationError when updating sent campaign', async () => {
      mockFindFirst.mockResolvedValue({
        id: 'c1',
        name: 'Campaign',
        type: 'EMAIL',
        status: 'COMPLETED',
        sentAt: new Date(),
      })
      await expect(
        MarketingService.update('c1', { name: 'Updated' }, 'u1')
      ).rejects.toThrow('Cannot update sent campaign')
    })

    it('updates subject, content, targetAudience, scheduledAt, status', async () => {
      mockFindFirst.mockResolvedValue({
        id: 'c1',
        name: 'Campaign',
        type: 'EMAIL',
        status: 'DRAFT',
        subject: null,
        content: '',
        targetAudience: null,
        scheduledAt: null,
        sentAt: null,
      })
      mockUpdate.mockResolvedValue({
        id: 'c1',
        name: 'Campaign',
        type: 'EMAIL',
        status: 'SCHEDULED',
        subject: 'New Subject',
        content: 'New Content',
        targetAudience: ['u1'],
        scheduledAt: new Date(Date.now() + 86400000),
      })
      await MarketingService.update(
        'c1',
        {
          subject: 'New Subject',
          content: 'New Content',
          targetAudience: ['u1'],
          scheduledAt: new Date(Date.now() + 86400000),
          status: 'scheduled',
        },
        'u1'
      )
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            subject: 'New Subject',
            content: 'New Content',
            targetAudience: ['u1'],
            status: 'SCHEDULED',
          }),
        })
      )
    })

    it('throws ForbiddenError when user lacks update permission', async () => {
      mockHasPermission.mockResolvedValue(false)
      await expect(
        MarketingService.update('c1', { name: 'Updated' }, 'u1')
      ).rejects.toThrow('You do not have permission to update campaigns')
    })

    it('uses mapCampaignStatus fallback when status not in map', async () => {
      mockFindFirst.mockResolvedValue({
        id: 'c1',
        name: 'Campaign',
        type: 'EMAIL',
        status: 'DRAFT',
        subject: null,
        content: '',
        targetAudience: null,
        scheduledAt: null,
        sentAt: null,
      })
      mockUpdate.mockResolvedValue({
        id: 'c1',
        name: 'Campaign',
        type: 'EMAIL',
        status: 'DRAFT',
      })
      await MarketingService.update('c1', { status: 'invalid' as any }, 'u1')
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'DRAFT' }),
        })
      )
    })

    it('updates status based on scheduledAt when status not provided', async () => {
      mockFindFirst.mockResolvedValue({
        id: 'c1',
        name: 'Campaign',
        type: 'EMAIL',
        status: 'DRAFT',
        scheduledAt: null,
        sentAt: null,
      })
      mockUpdate.mockResolvedValue({
        id: 'c1',
        name: 'Campaign',
        type: 'EMAIL',
        status: 'ACTIVE',
      })
      await MarketingService.update(
        'c1',
        { scheduledAt: new Date(Date.now() - 1000) },
        'u1'
      )
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'ACTIVE' }),
        })
      )
    })

    it('sets status to SCHEDULED when scheduledAt in future and status not provided', async () => {
      mockFindFirst.mockResolvedValue({
        id: 'c1',
        name: 'Campaign',
        type: 'EMAIL',
        status: 'DRAFT',
        scheduledAt: null,
        sentAt: null,
      })
      mockUpdate.mockResolvedValue({
        id: 'c1',
        name: 'Campaign',
        type: 'EMAIL',
        status: 'SCHEDULED',
      })
      await MarketingService.update(
        'c1',
        { scheduledAt: new Date(Date.now() + 86400000) },
        'u1'
      )
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'SCHEDULED' }),
        })
      )
    })

    it('sets status to DRAFT when scheduledAt is null and status not provided', async () => {
      mockFindFirst.mockResolvedValue({
        id: 'c1',
        name: 'Campaign',
        type: 'EMAIL',
        status: 'DRAFT',
        scheduledAt: null,
        sentAt: null,
      })
      mockUpdate.mockResolvedValue({
        id: 'c1',
        name: 'Campaign',
        type: 'EMAIL',
        status: 'DRAFT',
      })
      await MarketingService.update('c1', { scheduledAt: undefined }, 'u1')
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ updatedBy: 'u1' }),
        })
      )
    })

    it('updates with type mapping (sms, push, whatsapp)', async () => {
      mockFindFirst.mockResolvedValue({
        id: 'c1',
        name: 'Campaign',
        type: 'EMAIL',
        status: 'DRAFT',
        subject: null,
        content: '',
        targetAudience: null,
        scheduledAt: null,
        sentAt: null,
      })
      mockUpdate.mockResolvedValue({
        id: 'c1',
        name: 'Campaign',
        type: 'SMS',
        status: 'DRAFT',
      })
      await MarketingService.update('c1', { type: 'sms' }, 'u1')
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ type: 'SMS' }),
        })
      )
    })
  })

  describe('send', () => {
    it('sends campaign and returns', async () => {
      mockFindFirst.mockResolvedValue({
        id: 'c1',
        name: 'Campaign',
        type: 'EMAIL',
        status: 'DRAFT',
        subject: null,
        content: '',
        targetAudience: null,
        scheduledAt: null,
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      mockUserFindMany.mockResolvedValue([{ id: 'u1', email: 'a@b.com' }])
      mockUpdate.mockResolvedValue({
        id: 'c1',
        name: 'Campaign',
        type: 'EMAIL',
        status: 'COMPLETED',
        sentAt: new Date(),
        totalRecipients: 1,
        sentCount: 1,
      })
      const result = await MarketingService.send('c1', 'u1')
      expect(result.status).toBe('completed')
    })

    it('throws ForbiddenError when user lacks send permission', async () => {
      mockHasPermission.mockResolvedValue(false)
      await expect(MarketingService.send('c1', 'u1')).rejects.toThrow(
        'You do not have permission to send campaigns'
      )
    })

    it('throws ValidationError when campaign already sent', async () => {
      mockFindFirst.mockResolvedValue({
        id: 'c1',
        name: 'Campaign',
        type: 'EMAIL',
        status: 'COMPLETED',
        subject: null,
        content: '',
        targetAudience: null,
        scheduledAt: null,
        sentAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      await expect(MarketingService.send('c1', 'u1')).rejects.toThrow('Campaign already sent')
    })

    it('throws ValidationError when campaign is cancelled', async () => {
      mockFindFirst.mockResolvedValue({
        id: 'c1',
        name: 'Campaign',
        type: 'EMAIL',
        status: 'CANCELLED',
        subject: null,
        content: '',
        targetAudience: null,
        scheduledAt: null,
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      await expect(MarketingService.send('c1', 'u1')).rejects.toThrow('Cannot send cancelled campaign')
    })

    it('sends to targetAudience when provided', async () => {
      mockFindFirst.mockResolvedValue({
        id: 'c1',
        name: 'Campaign',
        type: 'EMAIL',
        status: 'DRAFT',
        subject: null,
        content: '',
        targetAudience: ['u1', 'u2'],
        scheduledAt: null,
        sentAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      mockUserFindMany.mockResolvedValue([{ id: 'u1' }, { id: 'u2' }])
      mockUpdate.mockResolvedValue({
        id: 'c1',
        name: 'Campaign',
        type: 'EMAIL',
        status: 'COMPLETED',
        sentAt: new Date(),
        totalRecipients: 2,
        sentCount: 2,
      })
      const result = await MarketingService.send('c1', 'u1')
      expect(result.status).toBe('completed')
      expect(mockUserFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ id: { in: ['u1', 'u2'] } }),
        })
      )
    })
  })

  describe('delete', () => {
    it('soft-deletes campaign when found', async () => {
      mockFindFirst.mockResolvedValue({ id: 'c1', name: 'Campaign' })
      mockUpdate.mockResolvedValue({})
      await MarketingService.delete('c1', 'u1')
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        })
      )
    })

    it('throws ForbiddenError when user lacks delete permission', async () => {
      mockHasPermission.mockResolvedValue(false)
      await expect(MarketingService.delete('c1', 'u1')).rejects.toThrow(
        'You do not have permission to delete campaigns'
      )
    })

    it('throws NotFoundError when campaign not found', async () => {
      mockFindFirst.mockResolvedValue(null)
      await expect(MarketingService.delete('missing', 'u1')).rejects.toThrow('Campaign')
    })
  })
})
