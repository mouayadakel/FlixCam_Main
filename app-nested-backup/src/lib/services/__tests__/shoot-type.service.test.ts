/**
 * ═══════════════════════════════════════════
 * SERVICE: shoot-type.service
 * ═══════════════════════════════════════════
 * METHODS: getAll, getBySlug, getFullConfig, ...
 * DEPENDENCIES: prisma.shootType, cache
 * ═══════════════════════════════════════════
 */

import { ShootTypeService } from '../shoot-type.service'
import { prisma } from '@/lib/db/prisma'
import { NotFoundError, ValidationError } from '@/lib/errors'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    shootType: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    shootTypeCategoryFlow: { deleteMany: jest.fn(), createMany: jest.fn() },
    shootTypeRecommendation: { findMany: jest.fn(), deleteMany: jest.fn(), createMany: jest.fn() },
    kit: { findMany: jest.fn() },
    $transaction: jest.fn(),
  },
}))

jest.mock('@/lib/cache', () => ({
  cacheGet: jest.fn().mockResolvedValue(null),
  cacheSet: jest.fn().mockResolvedValue(undefined),
  cacheDelete: jest.fn().mockResolvedValue(undefined),
}))

const mockFindMany = prisma.shootType.findMany as jest.Mock
const mockFindFirst = prisma.shootType.findFirst as jest.Mock
const mockCreate = prisma.shootType.create as jest.Mock
const mockUpdate = prisma.shootType.update as jest.Mock
const mockCategoryFlowDelete = prisma.shootTypeCategoryFlow.deleteMany as jest.Mock
const mockCategoryFlowCreate = prisma.shootTypeCategoryFlow.createMany as jest.Mock
const mockRecFindMany = prisma.shootTypeRecommendation.findMany as jest.Mock
const mockRecDelete = prisma.shootTypeRecommendation.deleteMany as jest.Mock
const mockRecCreate = prisma.shootTypeRecommendation.createMany as jest.Mock
const mockKitFindMany = prisma.kit.findMany as jest.Mock
const mockTransaction = prisma.$transaction as jest.Mock

const sampleShootType = {
  id: 'st_01',
  name: 'Commercial',
  slug: 'commercial',
  description: 'Desc',
  nameAr: null,
  nameZh: null,
  descriptionAr: null,
  descriptionZh: null,
  icon: null,
  coverImageUrl: null,
  sortOrder: 1,
  isActive: true,
  questionnaire: null,
  deletedAt: null,
  categoryFlows: [],
  recommendations: [],
  _count: { categoryFlows: 2, recommendations: 5 },
}

describe('ShootTypeService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFindMany.mockResolvedValue([])
    mockFindFirst.mockResolvedValue(null)
    mockCreate.mockResolvedValue(sampleShootType)
    mockUpdate.mockResolvedValue(sampleShootType)
    mockCategoryFlowDelete.mockResolvedValue({})
    mockCategoryFlowCreate.mockResolvedValue({})
    mockRecFindMany.mockResolvedValue([])
    mockRecDelete.mockResolvedValue({})
    mockRecCreate.mockResolvedValue({})
    mockKitFindMany.mockResolvedValue([])
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        shootTypeCategoryFlow: {
          deleteMany: jest.fn().mockResolvedValue({}),
          createMany: jest.fn().mockResolvedValue({}),
        },
      }
      return fn(tx)
    })
  })

  describe('getAll', () => {
    it('returns list of shoot types', async () => {
      mockFindMany.mockResolvedValue([
        { ...sampleShootType, _count: { categoryFlows: 2, recommendations: 5 } },
      ])
      const result = await ShootTypeService.getAll()
      expect(result).toHaveLength(1)
      expect(result[0].slug).toBe('commercial')
      expect(result[0].categoryCount).toBe(2)
    })

    it('excludes inactive when includeInactive is false', async () => {
      await ShootTypeService.getAll(false)
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ isActive: true }) })
      )
    })

    it('includes inactive when includeInactive is true', async () => {
      await ShootTypeService.getAll(true)
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.not.objectContaining({ isActive: expect.anything() }) })
      )
    })
  })

  describe('getBySlug', () => {
    it('returns null when not found', async () => {
      mockFindFirst.mockResolvedValue(null)
      const result = await ShootTypeService.getBySlug('missing')
      expect(result).toBeNull()
    })

    it('returns full config when found', async () => {
      mockFindFirst.mockResolvedValue(sampleShootType)
      const result = await ShootTypeService.getBySlug('commercial')
      expect(result).toMatchObject({ slug: 'commercial' })
    })

    it('returns full config with categorySteps and recommendations when present', async () => {
      const stWithFlows = {
        ...sampleShootType,
        categoryFlows: [
          {
            id: 'cf_1',
            categoryId: 'cat_1',
            category: { id: 'cat_1', name: 'Cameras', slug: 'cameras' },
            sortOrder: 0,
            isRequired: true,
            minRecommended: 1,
            maxRecommended: 3,
            stepTitle: null,
            stepTitleAr: null,
            stepDescription: null,
            stepDescriptionAr: null,
          },
        ],
        recommendations: [
          {
            id: 'rec_1',
            equipmentId: 'eq_1',
            budgetTier: 'PROFESSIONAL',
            reason: 'Popular',
            reasonAr: null,
            defaultQuantity: 1,
            isAutoSelect: false,
            sortOrder: 0,
            equipment: {
              id: 'eq_1',
              sku: 'SKU-1',
              model: 'FX6',
              dailyPrice: 100,
              categoryId: 'cat_1',
              category: { id: 'cat_1', name: 'Cameras', slug: 'cameras' },
              brand: { name: 'Sony', slug: 'sony' },
              media: [],
              specifications: {},
            },
          },
        ],
      }
      mockFindFirst.mockResolvedValue(stWithFlows)
      const result = await ShootTypeService.getBySlug('commercial')
      expect(result).not.toBeNull()
      expect(result?.categorySteps).toHaveLength(1)
      expect(result?.categorySteps?.[0].categoryName).toBe('Cameras')
      expect(result?.recommendations).toHaveLength(1)
      expect(result?.recommendations?.[0].equipment.model).toBe('FX6')
    })

    it('returns cached config when in cache', async () => {
      const cache = require('@/lib/cache')
      const cached = { id: 'st_01', slug: 'commercial', name: 'Commercial' }
      ;(cache.cacheGet as jest.Mock).mockResolvedValueOnce(cached)
      const result = await ShootTypeService.getBySlug('commercial')
      expect(result).toEqual(cached)
      expect(mockFindFirst).not.toHaveBeenCalled()
    })
  })

  describe('getById', () => {
    it('throws NotFoundError when not found', async () => {
      mockFindFirst.mockResolvedValue(null)
      await expect(ShootTypeService.getById('missing')).rejects.toThrow(NotFoundError)
    })

    it('returns full config when found', async () => {
      mockFindFirst.mockResolvedValue(sampleShootType)
      const result = await ShootTypeService.getById('st_01')
      expect(result).toMatchObject({ id: 'st_01' })
    })

    it('returns full config with categorySteps and recommendations when present', async () => {
      const stWithFlows = {
        ...sampleShootType,
        categoryFlows: [
          {
            id: 'cf_1',
            categoryId: 'cat_1',
            category: { id: 'cat_1', name: 'Lenses', slug: 'lenses' },
            sortOrder: 0,
            isRequired: false,
            minRecommended: null,
            maxRecommended: null,
            stepTitle: null,
            stepTitleAr: null,
            stepDescription: null,
            stepDescriptionAr: null,
          },
        ],
        recommendations: [
          {
            id: 'rec_1',
            equipmentId: 'eq_1',
            budgetTier: 'ESSENTIAL',
            reason: null,
            reasonAr: null,
            defaultQuantity: 2,
            isAutoSelect: true,
            sortOrder: 0,
            equipment: {
              id: 'eq_1',
              sku: 'SKU-2',
              model: 'FX3',
              dailyPrice: 80,
              categoryId: 'cat_1',
              category: { id: 'cat_1', name: 'Cameras', slug: 'cameras' },
              brand: { name: 'Sony', slug: 'sony' },
              media: [],
              specifications: {},
            },
          },
        ],
      }
      mockFindFirst.mockResolvedValue(stWithFlows)
      const result = await ShootTypeService.getById('st_01')
      expect(result.categorySteps).toHaveLength(1)
      expect(result.categorySteps[0].categorySlug).toBe('lenses')
      expect(result.recommendations).toHaveLength(1)
      expect(result.recommendations[0].equipment.sku).toBe('SKU-2')
    })
  })

  describe('create', () => {
    it('throws ValidationError when slug exists', async () => {
      mockFindFirst.mockResolvedValue({ id: 'existing' })
      await expect(
        ShootTypeService.create({ name: 'New', slug: 'commercial' }, 'usr_01')
      ).rejects.toThrow(ValidationError)
    })

    it('creates shoot type when valid', async () => {
      mockFindFirst.mockResolvedValue(null)
      mockCreate.mockResolvedValue({ ...sampleShootType, id: 'st_new' })
      mockFindFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(sampleShootType)
      const result = await ShootTypeService.create(
        { name: 'New', slug: 'new-type', description: 'Desc' },
        'usr_01'
      )
      expect(mockCreate).toHaveBeenCalled()
      expect(result).toBeDefined()
    })

    it('uses coverImageUrl when provided', async () => {
      mockFindFirst.mockResolvedValue(null)
      mockCreate.mockResolvedValue({ ...sampleShootType, id: 'st_new', coverImageUrl: 'https://x.com/img.jpg' })
      mockFindFirst.mockResolvedValueOnce(null).mockResolvedValueOnce(sampleShootType)
      await ShootTypeService.create(
        { name: 'New', slug: 'new-type', coverImageUrl: 'https://x.com/img.jpg' },
        'usr_01'
      )
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ coverImageUrl: 'https://x.com/img.jpg' }),
        })
      )
    })
  })

  describe('update', () => {
    it('throws NotFoundError when not found', async () => {
      mockFindFirst.mockResolvedValue(null)
      await expect(
        ShootTypeService.update('missing', { id: 'missing', name: 'Updated' }, 'usr_01')
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError when new slug exists', async () => {
      mockFindFirst.mockResolvedValueOnce(sampleShootType).mockResolvedValueOnce({ id: 'other' })
      await expect(
        ShootTypeService.update('st_01', { id: 'st_01', slug: 'taken' }, 'usr_01')
      ).rejects.toThrow(ValidationError)
    })

    it('updates shoot type when valid', async () => {
      mockFindFirst.mockResolvedValue(sampleShootType)
      const result = await ShootTypeService.update('st_01', { id: 'st_01', name: 'Updated' }, 'usr_01')
      expect(mockUpdate).toHaveBeenCalled()
      expect(result).toBeDefined()
    })

    it('updates coverImageUrl to null when empty string', async () => {
      mockFindFirst.mockResolvedValue(sampleShootType)
      await ShootTypeService.update('st_01', { id: 'st_01', coverImageUrl: '' }, 'usr_01')
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ coverImageUrl: null }),
        })
      )
    })

    it('invalidates both slugs when slug changed', async () => {
      mockFindFirst
        .mockResolvedValueOnce(sampleShootType)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ ...sampleShootType, slug: 'new-slug' })
      await ShootTypeService.update('st_01', { id: 'st_01', slug: 'new-slug' }, 'usr_01')
      expect(mockUpdate).toHaveBeenCalled()
    })

    it('continues when cache invalidation throws', async () => {
      const cache = require('@/lib/cache')
      ;(cache.cacheDelete as jest.Mock).mockRejectedValueOnce(new Error('Cache down'))
      mockFindFirst.mockResolvedValue(sampleShootType)
      const result = await ShootTypeService.update('st_01', { id: 'st_01', name: 'Updated' }, 'usr_01')
      expect(result).toBeDefined()
    })
  })

  describe('softDelete', () => {
    it('throws NotFoundError when not found', async () => {
      mockFindFirst.mockResolvedValue(null)
      await expect(ShootTypeService.softDelete('missing', 'usr_01')).rejects.toThrow(NotFoundError)
    })

    it('soft deletes shoot type', async () => {
      mockFindFirst.mockResolvedValue(sampleShootType)
      await ShootTypeService.softDelete('st_01', 'usr_01')
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'st_01' },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        })
      )
    })
  })

  describe('updateCategoryFlow', () => {
    it('throws NotFoundError when shoot type not found', async () => {
      mockFindFirst.mockResolvedValue(null)
      await expect(
        ShootTypeService.updateCategoryFlow('missing', [])
      ).rejects.toThrow(NotFoundError)
    })

    it('updates category flows in transaction', async () => {
      mockFindFirst.mockResolvedValue(sampleShootType)
      const tx = {
        shootTypeCategoryFlow: {
          deleteMany: jest.fn().mockResolvedValue({}),
          createMany: jest.fn().mockResolvedValue({}),
        },
      }
      mockTransaction.mockImplementation(async (fn: (t: unknown) => Promise<unknown>) => fn(tx))
      await ShootTypeService.updateCategoryFlow('st_01', [
        { categoryId: 'cat_1', sortOrder: 1, isRequired: true },
      ])
      expect(mockTransaction).toHaveBeenCalled()
    })

    it('deletes all flows when empty array', async () => {
      mockFindFirst.mockResolvedValue(sampleShootType)
      const tx = {
        shootTypeCategoryFlow: {
          deleteMany: jest.fn().mockResolvedValue({}),
          createMany: jest.fn().mockResolvedValue({}),
        },
      }
      mockTransaction.mockImplementation(async (fn: (t: unknown) => Promise<unknown>) => fn(tx))
      await ShootTypeService.updateCategoryFlow('st_01', [])
      expect(tx.shootTypeCategoryFlow.deleteMany).toHaveBeenCalled()
      expect(tx.shootTypeCategoryFlow.createMany).not.toHaveBeenCalled()
    })
  })

  describe('setRecommendations', () => {
    it('throws NotFoundError when shoot type not found', async () => {
      mockFindFirst.mockResolvedValue(null)
      await expect(
        ShootTypeService.setRecommendations('missing', [])
      ).rejects.toThrow(NotFoundError)
    })

    it('sets recommendations when categoryId provided', async () => {
      mockFindFirst.mockResolvedValue(sampleShootType)
      mockRecFindMany.mockResolvedValue([{ id: 'r1' }])
      mockRecDelete.mockResolvedValue({})
      mockRecCreate.mockResolvedValue({})
      await ShootTypeService.setRecommendations(
        'st_01',
        [{ equipmentId: 'eq_1', budgetTier: 'ESSENTIAL' }],
        'cat_1'
      )
      expect(mockRecDelete).toHaveBeenCalled()
      expect(mockRecCreate).toHaveBeenCalled()
    })

    it('replaces all recommendations when no categoryId', async () => {
      mockFindFirst.mockResolvedValue(sampleShootType)
      mockRecCreate.mockResolvedValue({})
      await ShootTypeService.setRecommendations(
        'st_01',
        [{ equipmentId: 'eq_1', budgetTier: 'ESSENTIAL' }]
      )
      expect(mockRecDelete).toHaveBeenCalled()
      expect(mockRecCreate).toHaveBeenCalled()
    })

    it('skips delete when categoryId and toDelete empty', async () => {
      mockFindFirst.mockResolvedValue(sampleShootType)
      mockRecFindMany.mockResolvedValue([])
      mockRecCreate.mockResolvedValue({})
      await ShootTypeService.setRecommendations(
        'st_01',
        [{ equipmentId: 'eq_1', budgetTier: 'ESSENTIAL' }],
        'cat_1'
      )
      expect(mockRecDelete).not.toHaveBeenCalled()
      expect(mockRecCreate).toHaveBeenCalled()
    })
  })

  describe('getRecommendationsForCategory', () => {
    it('returns recommendations for category', async () => {
      mockRecFindMany.mockResolvedValue([
        {
          id: 'r1',
          equipmentId: 'eq_1',
          budgetTier: 'ESSENTIAL',
          reason: 'Good',
          reasonAr: null,
          defaultQuantity: 1,
          isAutoSelect: false,
          sortOrder: 1,
          equipment: {
            id: 'eq_1',
            sku: 'SKU-1',
            model: 'M1',
            dailyPrice: { toNumber: () => 100 },
            categoryId: 'cat_1',
            category: { id: 'cat_1', name: 'Cameras', slug: 'cameras' },
            brand: { name: 'Sony', slug: 'sony' },
            media: [],
            specifications: null,
          },
        },
      ])
      const result = await ShootTypeService.getRecommendationsForCategory('st_01', 'cat_1')
      expect(result).toHaveLength(1)
      expect(result[0].equipmentId).toBe('eq_1')
    })

    it('filters by budgetTier when provided', async () => {
      mockRecFindMany.mockResolvedValue([])
      await ShootTypeService.getRecommendationsForCategory('st_01', 'cat_1', 'PREMIUM')
      expect(mockRecFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ budgetTier: 'PREMIUM' }),
        })
      )
    })
  })

  describe('findMatchingPrebuiltKits', () => {
    it('returns empty array when no equipment IDs', async () => {
      const result = await ShootTypeService.findMatchingPrebuiltKits([])
      expect(result).toEqual([])
      expect(mockKitFindMany).not.toHaveBeenCalled()
    })

    it('returns matching kits when overlap >= 50%', async () => {
      mockKitFindMany.mockResolvedValue([
        {
          id: 'kit_1',
          name: 'Starter Kit',
          slug: 'starter',
          description: null,
          discountPercent: 10,
          items: [
            { equipment: { id: 'eq_1', dailyPrice: 100 }, quantity: 1 },
            { equipment: { id: 'eq_2', dailyPrice: 200 }, quantity: 1 },
          ],
        },
      ])
      const result = await ShootTypeService.findMatchingPrebuiltKits(['eq_1', 'eq_2'])
      expect(result).toHaveLength(1)
      expect(result[0].equipmentIds).toContain('eq_1')
    })

    it('excludes kits when overlap < 50%', async () => {
      mockKitFindMany.mockResolvedValue([
        {
          id: 'kit_1',
          name: 'Big Kit',
          slug: 'big',
          description: null,
          discountPercent: 10,
          items: [
            { equipment: { id: 'eq_1', dailyPrice: 100 }, quantity: 1 },
            { equipment: { id: 'eq_2', dailyPrice: 200 }, quantity: 1 },
            { equipment: { id: 'eq_3', dailyPrice: 300 }, quantity: 1 },
          ],
        },
      ])
      const result = await ShootTypeService.findMatchingPrebuiltKits(['eq_1'])
      expect(result).toHaveLength(0)
    })

    it('handles kit with null discountPercent', async () => {
      mockKitFindMany.mockResolvedValue([
        {
          id: 'kit_1',
          name: 'No Discount Kit',
          slug: 'no-discount',
          description: null,
          discountPercent: null,
          items: [
            { equipment: { id: 'eq_1', dailyPrice: 100 }, quantity: 1 },
            { equipment: { id: 'eq_2', dailyPrice: 200 }, quantity: 1 },
          ],
        },
      ])
      const result = await ShootTypeService.findMatchingPrebuiltKits(['eq_1', 'eq_2'])
      expect(result).toHaveLength(1)
      expect(result[0].discountPercent).toBeNull()
    })
  })
})
