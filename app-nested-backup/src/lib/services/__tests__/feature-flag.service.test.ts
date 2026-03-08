/**
 * Unit tests for FeatureFlagService (getAll, getById, getByName, isEnabled, create)
 */

import { FeatureFlagService } from '../feature-flag.service'
import { prisma } from '@/lib/db/prisma'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    featureFlag: { findMany: jest.fn(), findFirst: jest.fn(), findUnique: jest.fn(), create: jest.fn(), update: jest.fn() },
  },
}))

jest.mock('@/lib/services/audit.service', () => ({ AuditService: { log: jest.fn().mockResolvedValue(undefined) } }))

const mockFindMany = prisma.featureFlag.findMany as jest.Mock
const mockFindFirst = prisma.featureFlag.findFirst as jest.Mock
const mockFindUnique = prisma.featureFlag.findUnique as jest.Mock
const mockCreate = prisma.featureFlag.create as jest.Mock
const mockUpdate = prisma.featureFlag.update as jest.Mock

describe('FeatureFlagService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getAll', () => {
    it('returns findMany result', async () => {
      mockFindMany.mockResolvedValue([{ id: 'f1', name: 'flag1', enabled: true }])
      const result = await FeatureFlagService.getAll()
      expect(result).toHaveLength(1)
      expect(mockFindMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        orderBy: [{ scope: 'asc' }, { name: 'asc' }],
      })
    })
  })

  describe('getById', () => {
    it('returns flag when found', async () => {
      mockFindFirst.mockResolvedValue({ id: 'f1', name: 'test' })
      const result = await FeatureFlagService.getById('f1')
      expect(result).toMatchObject({ id: 'f1', name: 'test' })
    })
  })

  describe('getByName', () => {
    it('returns flag when found', async () => {
      mockFindFirst.mockResolvedValue({ name: 'myFlag', enabled: true })
      const result = await FeatureFlagService.getByName('myFlag')
      expect(result?.name).toBe('myFlag')
    })
  })

  describe('isEnabled', () => {
    it('returns false when flag not found', async () => {
      mockFindFirst.mockResolvedValue(null)
      const result = await FeatureFlagService.isEnabled('missing')
      expect(result).toBe(false)
    })

    it('returns true when flag enabled', async () => {
      mockFindFirst.mockResolvedValue({ enabled: true })
      const result = await FeatureFlagService.isEnabled('onFlag')
      expect(result).toBe(true)
    })
  })

  describe('create', () => {
    it('calls prisma.featureFlag.create with correct data', async () => {
      mockCreate.mockResolvedValue({ id: 'f2', name: 'new', scope: 'MODULE', enabled: false })
      const result = await FeatureFlagService.create({
        name: 'new',
        scope: 'MODULE',
        userId: 'u1',
      })
      expect(result.name).toBe('new')
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'new', scope: 'MODULE' }),
        })
      )
    })
  })

  describe('update', () => {
    it('throws when flag not found', async () => {
      mockFindUnique.mockResolvedValue(null)
      await expect(
        FeatureFlagService.update('missing', { enabled: true, userId: 'u1' })
      ).rejects.toThrow('Feature flag not found')
    })

    it('throws when flag is soft-deleted', async () => {
      mockFindUnique.mockResolvedValue({ id: 'f1', deletedAt: new Date() })
      await expect(
        FeatureFlagService.update('f1', { enabled: true, userId: 'u1' })
      ).rejects.toThrow('Feature flag not found')
    })

    it('updates flag when found', async () => {
      mockFindUnique.mockResolvedValue({ id: 'f1', name: 'test', enabled: false, description: 'old', requiresApproval: false, deletedAt: null })
      mockUpdate.mockResolvedValue({ id: 'f1', name: 'test', enabled: true, description: 'old', requiresApproval: false })
      const result = await FeatureFlagService.update('f1', { enabled: true, userId: 'u1' })
      expect(result.enabled).toBe(true)
    })
  })

  describe('toggle', () => {
    it('throws when flag not found', async () => {
      mockFindUnique.mockResolvedValue(null)
      await expect(FeatureFlagService.toggle('missing', 'u1')).rejects.toThrow('Feature flag not found')
    })

    it('throws when requiresApproval', async () => {
      mockFindUnique.mockResolvedValue({ id: 'f1', enabled: false, requiresApproval: true, deletedAt: null })
      await expect(FeatureFlagService.toggle('f1', 'u1')).rejects.toThrow('requires approval')
    })

    it('toggles enabled when not requiresApproval', async () => {
      mockFindUnique.mockResolvedValue({ id: 'f1', enabled: false, requiresApproval: false, deletedAt: null })
      mockUpdate.mockResolvedValue({ id: 'f1', enabled: true })
      const result = await FeatureFlagService.toggle('f1', 'u1')
      expect(result.enabled).toBe(true)
    })
  })

  describe('delete', () => {
    it('soft-deletes flag', async () => {
      mockUpdate.mockResolvedValue({ id: 'f1', name: 'test', deletedAt: new Date() })
      const result = await FeatureFlagService.delete('f1', 'u1')
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'f1' },
        data: expect.objectContaining({ deletedAt: expect.any(Date), deletedBy: 'u1' }),
      })
    })
  })

  describe('getByScope', () => {
    it('returns flags for scope', async () => {
      mockFindMany.mockResolvedValue([{ id: 'f1', name: 'flag1', scope: 'MODULE' }])
      const result = await FeatureFlagService.getByScope('MODULE')
      expect(result).toHaveLength(1)
      expect(mockFindMany).toHaveBeenCalledWith({
        where: { scope: 'MODULE', deletedAt: null },
        orderBy: { name: 'asc' },
      })
    })
  })
})
