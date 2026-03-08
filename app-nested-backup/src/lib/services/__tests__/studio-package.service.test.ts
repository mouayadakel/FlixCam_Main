/**
 * Studio package service tests
 */
import { StudioPackageService } from '../studio-package.service'
import { prisma } from '@/lib/db/prisma'
import { NotFoundError } from '@/lib/errors'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    studioPackage: { findMany: jest.fn(), findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn() },
    studio: { findFirst: jest.fn() },
  },
}))
jest.mock('@/lib/services/audit.service', () => ({ AuditService: { log: jest.fn().mockResolvedValue(undefined) } }))
jest.mock('@/lib/cache', () => ({ cacheDelete: jest.fn().mockResolvedValue(undefined) }))

const mockFindMany = prisma.studioPackage.findMany as jest.Mock
const mockFindFirst = prisma.studioPackage.findFirst as jest.Mock
const mockCreate = prisma.studioPackage.create as jest.Mock
const mockCount = prisma.studioPackage.count as jest.Mock

describe('StudioPackageService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCount.mockResolvedValue(0)
    mockFindFirst.mockResolvedValue(null)
    mockCreate.mockResolvedValue({ id: 'pkg_01', studioId: 'std_01' })
  })

  describe('listByStudio', () => {
    it('returns packages for studio', async () => {
      mockFindMany.mockResolvedValue([])
      const result = await StudioPackageService.listByStudio('std_01')
      expect(result).toEqual([])
    })
  })

  describe('create', () => {
    it('throws when max packages reached', async () => {
      mockCount.mockResolvedValue(15)
      await expect(
        StudioPackageService.create('std_01', { name: 'Pkg', price: 500, isActive: true, order: 0, recommended: false }, 'usr_01')
      ).rejects.toThrow('Maximum 15 packages per studio')
    })

    it('creates package when under limit', async () => {
      const result = await StudioPackageService.create('std_01', { name: 'Pkg', price: 500, isActive: true, order: 0, recommended: false }, 'usr_01')
      expect(result).toMatchObject({ id: 'pkg_01' })
    })
  })

  describe('update', () => {
    it('throws NotFoundError when package not found', async () => {
      mockFindFirst.mockResolvedValue(null)
      await expect(
        StudioPackageService.update('pkg_missing', { name: 'Pkg' }, 'usr_01')
      ).rejects.toThrow(NotFoundError)
    })
  })
})
