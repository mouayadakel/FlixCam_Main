/**
 * Unit tests for EquipmentService
 */

import { EquipmentService } from '../equipment.service'
import { prisma } from '@/lib/db/prisma'

const mockTx = {
  equipment: { create: jest.fn(), update: jest.fn(), findFirst: jest.fn() },
  media: {
    create: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
}
jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    equipment: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    category: { findFirst: jest.fn() },
    brand: { findFirst: jest.fn() },
    bookingEquipment: { findFirst: jest.fn(), findMany: jest.fn() },
    maintenance: { findMany: jest.fn() },
    $transaction: jest.fn((cb: (tx: unknown) => Promise<unknown>) => cb(mockTx)),
  },
}))

jest.mock('../translation.service', () => ({
  TranslationService: {
    upsert: jest.fn(),
    getTranslationsByLocale: jest.fn().mockResolvedValue(null),
    saveTranslations: jest.fn().mockResolvedValue(undefined),
    deleteTranslations: jest.fn().mockResolvedValue(undefined),
    formatTranslationsForSave: (t: unknown) => t,
  },
}))
jest.mock('../media.service', () => ({ MediaService: { create: jest.fn() } }))

const mockPrisma = prisma as jest.Mocked<typeof prisma>

describe('EquipmentService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getEquipmentList', () => {
    it('returns empty array when no equipment found', async () => {
      ;(mockPrisma.equipment.findMany as jest.Mock).mockResolvedValue([])
      ;(mockPrisma.equipment.count as jest.Mock).mockResolvedValue(0)
      const result = await EquipmentService.getEquipmentList({})
      expect(result.items).toEqual([])
      expect(result.total).toBe(0)
    })

    it('applies filters when provided', async () => {
      ;(mockPrisma.equipment.findMany as jest.Mock).mockResolvedValue([])
      ;(mockPrisma.equipment.count as jest.Mock).mockResolvedValue(0)
      await EquipmentService.getEquipmentList({
        categoryId: 'cat-1',
        brandId: 'brand-1',
        isActive: true,
      })
      expect(mockPrisma.equipment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            categoryId: 'cat-1',
            brandId: 'brand-1',
            isActive: true,
          }),
        })
      )
    })

    it('applies search, vendorId, condition, featured filters', async () => {
      ;(mockPrisma.equipment.findMany as jest.Mock).mockResolvedValue([])
      ;(mockPrisma.equipment.count as jest.Mock).mockResolvedValue(0)
      await EquipmentService.getEquipmentList({
        search: 'Sony',
        vendorId: 'v1',
        condition: 'GOOD',
        featured: true,
      })
      expect(mockPrisma.equipment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.any(Array),
            vendorId: 'v1',
            condition: 'GOOD',
            featured: true,
          }),
        })
      )
    })

    it('clamps skip and take to valid ranges', async () => {
      ;(mockPrisma.equipment.findMany as jest.Mock).mockResolvedValue([])
      ;(mockPrisma.equipment.count as jest.Mock).mockResolvedValue(0)
      const result = await EquipmentService.getEquipmentList({
        skip: 500,
        take: 100,
      })
      expect(mockPrisma.equipment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 500,
          take: 100,
        })
      )
      expect(result.skip).toBe(500)
      expect(result.take).toBe(100)
    })

    it('uses defaults when skip/take invalid', async () => {
      ;(mockPrisma.equipment.findMany as jest.Mock).mockResolvedValue([])
      ;(mockPrisma.equipment.count as jest.Mock).mockResolvedValue(0)
      const result = await EquipmentService.getEquipmentList({
        skip: -1,
        take: 0,
      })
      expect(result.skip).toBe(0)
      expect(result.take).toBe(50)
    })
  })

  describe('getEquipmentById', () => {
    it('throws when equipment not found', async () => {
      ;(mockPrisma.equipment.findFirst as jest.Mock).mockResolvedValue(null)
      await expect(EquipmentService.getEquipmentById('non-existent')).rejects.toThrow(
        'Equipment not found'
      )
    })

    it('returns equipment with translations when found', async () => {
      const mockEquipment = {
        id: 'eq1',
        sku: 'CAM-1',
        model: 'Sony FX3',
        categoryId: 'cat1',
        customFields: null,
        category: { name: 'Cameras' },
        brand: { name: 'Sony' },
        vendor: null,
        media: [],
        bookings: [],
      }
      ;(mockPrisma.equipment.findFirst as jest.Mock).mockResolvedValue(mockEquipment)
      ;(mockPrisma.equipment.findMany as jest.Mock).mockResolvedValue([])
      const TranslationService = require('../translation.service').TranslationService
      TranslationService.getTranslationsByLocale.mockResolvedValue({ ar: { name: 'كاميرا' } })
      const result = await EquipmentService.getEquipmentById('eq1')
      expect(result).toMatchObject({
        id: 'eq1',
        sku: 'CAM-1',
        model: 'Sony FX3',
      })
      expect(result.translations).toBeDefined()
    })

    it('returns equipment with relatedEquipmentIds from customFields', async () => {
      const mockEquipment = {
        id: 'eq1',
        sku: 'CAM-1',
        model: 'Sony FX3',
        categoryId: 'cat1',
        customFields: { relatedEquipmentIds: ['eq2', 'eq3'] },
        category: { name: 'Cameras' },
        brand: { name: 'Sony' },
        vendor: null,
        media: [],
        bookings: [],
      }
      ;(mockPrisma.equipment.findFirst as jest.Mock).mockResolvedValue(mockEquipment)
      ;(mockPrisma.equipment.findMany as jest.Mock).mockResolvedValue([
        { id: 'eq2', sku: 'LENS-1', model: 'Lens A', category: { name: 'Lenses' } },
        { id: 'eq3', sku: 'LENS-2', model: 'Lens B', category: { name: 'Lenses' } },
      ])
      const TranslationService = require('../translation.service').TranslationService
      TranslationService.getTranslationsByLocale.mockResolvedValue(null)
      const result = await EquipmentService.getEquipmentById('eq1')
      expect(result.relatedEquipmentIds).toEqual(['eq2', 'eq3'])
      expect(result.relatedEquipment).toHaveLength(2)
    })

    it('returns equipment with boxContents and bufferTime from customFields', async () => {
      const mockEquipment = {
        id: 'eq1',
        sku: 'CAM-1',
        model: 'Sony FX3',
        categoryId: 'cat1',
        customFields: { boxContents: 'Camera, battery, charger', bufferTime: 2, bufferTimeUnit: 'hours' },
        category: { name: 'Cameras' },
        brand: { name: 'Sony' },
        vendor: null,
        media: [],
        bookings: [],
      }
      ;(mockPrisma.equipment.findFirst as jest.Mock).mockResolvedValue(mockEquipment)
      ;(mockPrisma.equipment.findMany as jest.Mock).mockResolvedValue([])
      const TranslationService = require('../translation.service').TranslationService
      TranslationService.getTranslationsByLocale.mockResolvedValue(null)
      const result = await EquipmentService.getEquipmentById('eq1')
      expect(result.boxContents).toBe('Camera, battery, charger')
      expect(result.bufferTime).toBe(2)
      expect(result.bufferTimeUnit).toBe('hours')
    })
  })

  describe('createEquipment', () => {
    it('creates equipment with required fields', async () => {
      const created = {
        id: 'eq-new',
        sku: 'EQ-ABC-123',
        model: 'Test Model',
        categoryId: 'cat1',
        customFields: null,
        category: { name: 'Cameras' },
        brand: { name: 'Sony' },
        vendor: null,
        media: [],
        bookings: [],
      }
      ;(mockPrisma.equipment.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValue(created)
      mockTx.equipment.create.mockResolvedValue(created)
      ;(mockPrisma.equipment.findMany as jest.Mock).mockResolvedValue([])
      const TranslationService = require('../translation.service').TranslationService
      TranslationService.getTranslationsByLocale.mockResolvedValue(null)
      const result = await EquipmentService.createEquipment({
        model: 'Test Model',
        categoryId: 'cat1',
        dailyPrice: 100,
        createdBy: 'u1',
      })
      expect(result).toBeDefined()
      expect(mockTx.equipment.create).toHaveBeenCalled()
    })

    it('creates equipment with customFields (relatedEquipmentIds, boxContents, tags)', async () => {
      const created = {
        id: 'eq-new',
        sku: 'EQ-ABC-123',
        model: 'Test Model',
        categoryId: 'cat1',
        customFields: {},
        category: { name: 'Cameras' },
        brand: { name: 'Sony' },
        vendor: null,
        media: [],
        bookings: [],
      }
      ;(mockPrisma.equipment.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValue(created)
      mockTx.equipment.create.mockResolvedValue(created)
      ;(mockPrisma.equipment.findMany as jest.Mock).mockResolvedValue([])
      const TranslationService = require('../translation.service').TranslationService
      TranslationService.getTranslationsByLocale.mockResolvedValue(null)
      const result = await EquipmentService.createEquipment({
        model: 'Test Model',
        categoryId: 'cat1',
        dailyPrice: 100,
        createdBy: 'u1',
        relatedEquipmentIds: ['eq2'],
        boxContents: 'Camera, battery',
        tags: 'cinema,professional',
      })
      expect(result).toBeDefined()
      expect(mockTx.equipment.create).toHaveBeenCalled()
      const createData = mockTx.equipment.create.mock.calls[0][0]?.data
      expect(createData?.customFields).toBeDefined()
    })

    it('creates equipment with translations', async () => {
      const created = {
        id: 'eq-new',
        sku: 'EQ-ABC-123',
        model: 'Test Model',
        categoryId: 'cat1',
        customFields: null,
        category: { name: 'Cameras' },
        brand: { name: 'Sony' },
        vendor: null,
        media: [],
        bookings: [],
      }
      ;(mockPrisma.equipment.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValue(created)
      mockTx.equipment.create.mockResolvedValue(created)
      ;(mockPrisma.equipment.findMany as jest.Mock).mockResolvedValue([])
      const TranslationService = require('../translation.service').TranslationService
      TranslationService.getTranslationsByLocale.mockResolvedValue(null)
      TranslationService.saveTranslations.mockResolvedValue(undefined)
      await EquipmentService.createEquipment({
        model: 'Test Model',
        categoryId: 'cat1',
        dailyPrice: 100,
        createdBy: 'u1',
        translations: [{ locale: 'ar', name: 'موديل تجريبي' }],
      })
      expect(TranslationService.saveTranslations).toHaveBeenCalled()
    })

    it('creates equipment with featuredImageUrl and galleryImageUrls', async () => {
      const created = {
        id: 'eq-new',
        sku: 'EQ-ABC-123',
        model: 'Test Model',
        categoryId: 'cat1',
        customFields: null,
        category: { name: 'Cameras' },
        brand: { name: 'Sony' },
        vendor: null,
        media: [],
        bookings: [],
      }
      ;(mockPrisma.equipment.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValue(created)
      mockTx.equipment.create.mockResolvedValue(created)
      mockTx.media.create.mockResolvedValue({})
      ;(mockPrisma.equipment.findMany as jest.Mock).mockResolvedValue([])
      const TranslationService = require('../translation.service').TranslationService
      TranslationService.getTranslationsByLocale.mockResolvedValue(null)
      await EquipmentService.createEquipment({
        model: 'Test Model',
        categoryId: 'cat1',
        dailyPrice: 100,
        createdBy: 'u1',
        featuredImageUrl: 'https://example.com/featured.jpg',
        galleryImageUrls: ['https://example.com/g1.jpg', 'https://example.com/g2.jpg'],
      })
      expect(mockTx.media.create).toHaveBeenCalledTimes(3)
    })

    it('creates equipment with depositAmount and vendorSubmissionStatus', async () => {
      const created = {
        id: 'eq-new',
        sku: 'EQ-ABC-123',
        model: 'Test Model',
        categoryId: 'cat1',
        customFields: null,
        category: { name: 'Cameras' },
        brand: { name: 'Sony' },
        vendor: null,
        media: [],
        bookings: [],
      }
      ;(mockPrisma.equipment.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValue(created)
      mockTx.equipment.create.mockResolvedValue(created)
      ;(mockPrisma.equipment.findMany as jest.Mock).mockResolvedValue([])
      const TranslationService = require('../translation.service').TranslationService
      TranslationService.getTranslationsByLocale.mockResolvedValue(null)
      await EquipmentService.createEquipment({
        model: 'Test Model',
        categoryId: 'cat1',
        dailyPrice: 100,
        createdBy: 'u1',
        depositAmount: 500,
        requiresDeposit: true,
        vendorSubmissionStatus: 'approved',
      })
      const createData = mockTx.equipment.create.mock.calls[0][0]?.data
      expect(createData?.customFields).toMatchObject({
        depositAmount: 500,
        requiresDeposit: true,
        vendorSubmissionStatus: 'approved',
      })
    })

    it('creates equipment with videoUrl and bufferTime', async () => {
      const created = {
        id: 'eq-new',
        sku: 'EQ-ABC-123',
        model: 'Test Model',
        categoryId: 'cat1',
        customFields: null,
        category: { name: 'Cameras' },
        brand: { name: 'Sony' },
        vendor: null,
        media: [],
        bookings: [],
      }
      ;(mockPrisma.equipment.findFirst as jest.Mock)
        .mockResolvedValueOnce(null)
        .mockResolvedValue(created)
      mockTx.equipment.create.mockResolvedValue(created)
      mockTx.media.create.mockResolvedValue({})
      ;(mockPrisma.equipment.findMany as jest.Mock).mockResolvedValue([])
      const TranslationService = require('../translation.service').TranslationService
      TranslationService.getTranslationsByLocale.mockResolvedValue(null)
      await EquipmentService.createEquipment({
        model: 'Test Model',
        categoryId: 'cat1',
        dailyPrice: 100,
        createdBy: 'u1',
        videoUrl: 'https://example.com/video.mp4',
        bufferTime: 2,
        bufferTimeUnit: 'days',
        subCategoryId: 'sub1',
        vendorId: 'v1',
      })
      expect(mockTx.media.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'video',
            url: 'https://example.com/video.mp4',
          }),
        })
      )
      const createData = mockTx.equipment.create.mock.calls[0][0]?.data
      expect(createData?.customFields).toMatchObject({
        bufferTime: 2,
        bufferTimeUnit: 'days',
        subCategoryId: 'sub1',
        vendorSubmissionStatus: 'pending_review',
      })
    })
  })

  describe('updateEquipment', () => {
    it('throws when equipment not found', async () => {
      ;(mockPrisma.equipment.findFirst as jest.Mock).mockResolvedValue(null)
      await expect(
        EquipmentService.updateEquipment({
          id: 'missing',
          updatedBy: 'u1',
          model: 'Updated',
        })
      ).rejects.toThrow('Equipment not found')
    })

    it('updates equipment when found', async () => {
      const existing = {
        id: 'eq1',
        sku: 'CAM-1',
        model: 'Old Model',
        categoryId: 'cat1',
        customFields: null,
      }
      const updated = {
        id: 'eq1',
        sku: 'CAM-1',
        model: 'Updated Model',
        categoryId: 'cat1',
        customFields: null,
        category: { name: 'Cameras' },
        brand: { name: 'Sony' },
        vendor: null,
        media: [],
        bookings: [],
      }
      ;(mockPrisma.equipment.findFirst as jest.Mock)
        .mockResolvedValueOnce(existing)
        .mockResolvedValue(updated)
      mockTx.equipment.update.mockResolvedValue(updated)
      ;(mockPrisma.equipment.findMany as jest.Mock).mockResolvedValue([])
      const TranslationService = require('../translation.service').TranslationService
      TranslationService.getTranslationsByLocale.mockResolvedValue(null)
      const result = await EquipmentService.updateEquipment({
        id: 'eq1',
        updatedBy: 'u1',
        model: 'Updated Model',
      })
      expect(result).toBeDefined()
      expect(mockTx.equipment.update).toHaveBeenCalled()
    })

    it('throws when updating to duplicate SKU', async () => {
      const existing = {
        id: 'eq1',
        sku: 'CAM-1',
        model: 'Old Model',
        categoryId: 'cat1',
        customFields: null,
      }
      ;(mockPrisma.equipment.findFirst as jest.Mock)
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce({ id: 'eq2', sku: 'CAM-2' })
      await expect(
        EquipmentService.updateEquipment({
          id: 'eq1',
          updatedBy: 'u1',
          sku: 'CAM-2',
        })
      ).rejects.toThrow('Equipment with SKU')
    })

    it('updates equipment with boxContents, bufferTime, vendorSubmissionStatus, requiresDeposit', async () => {
      const existing = {
        id: 'eq1',
        sku: 'CAM-1',
        model: 'Old Model',
        categoryId: 'cat1',
        customFields: null,
      }
      const updated = {
        id: 'eq1',
        sku: 'CAM-1',
        model: 'Old Model',
        categoryId: 'cat1',
        customFields: null,
        category: { name: 'Cameras' },
        brand: { name: 'Sony' },
        vendor: null,
        media: [],
        bookings: [],
      }
      ;(mockPrisma.equipment.findFirst as jest.Mock)
        .mockResolvedValueOnce(existing)
        .mockResolvedValue(updated)
      mockTx.equipment.update.mockResolvedValue(updated)
      ;(mockPrisma.equipment.findMany as jest.Mock).mockResolvedValue([])
      const TranslationService = require('../translation.service').TranslationService
      TranslationService.getTranslationsByLocale.mockResolvedValue(null)
      TranslationService.saveTranslations.mockResolvedValue(undefined)
      await EquipmentService.updateEquipment({
        id: 'eq1',
        updatedBy: 'u1',
        relatedEquipmentIds: ['eq2', 'eq3'],
        boxContents: 'Camera, battery, charger',
        bufferTime: 4,
        bufferTimeUnit: 'days',
        vendorSubmissionStatus: 'approved',
        requiresDeposit: true,
        depositAmount: 200,
        translations: [{ locale: 'ar', name: 'موديل محدث' }],
      })
      expect(TranslationService.saveTranslations).toHaveBeenCalled()
      const updateData = mockTx.equipment.update.mock.calls[0][0]?.data
      expect(updateData?.customFields).toMatchObject({
        relatedEquipmentIds: ['eq2', 'eq3'],
        boxContents: 'Camera, battery, charger',
        bufferTime: 4,
        bufferTimeUnit: 'days',
        vendorSubmissionStatus: 'approved',
        requiresDeposit: true,
        depositAmount: 200,
      })
    })

    it('deletes translations when empty array passed', async () => {
      const existing = {
        id: 'eq1',
        sku: 'CAM-1',
        model: 'Old Model',
        categoryId: 'cat1',
        customFields: null,
      }
      const updated = {
        id: 'eq1',
        sku: 'CAM-1',
        model: 'Old Model',
        categoryId: 'cat1',
        customFields: null,
        category: { name: 'Cameras' },
        brand: { name: 'Sony' },
        vendor: null,
        media: [],
        bookings: [],
      }
      ;(mockPrisma.equipment.findFirst as jest.Mock)
        .mockResolvedValueOnce(existing)
        .mockResolvedValue(updated)
      mockTx.equipment.update.mockResolvedValue(updated)
      ;(mockPrisma.equipment.findMany as jest.Mock).mockResolvedValue([])
      const TranslationService = require('../translation.service').TranslationService
      TranslationService.getTranslationsByLocale.mockResolvedValue(null)
      TranslationService.deleteTranslations.mockResolvedValue(undefined)
      await EquipmentService.updateEquipment({
        id: 'eq1',
        updatedBy: 'u1',
        translations: [],
      })
      expect(TranslationService.deleteTranslations).toHaveBeenCalledWith(
        'equipment',
        'eq1',
        'u1'
      )
    })

    it('updates equipment with featuredImageUrl and galleryImageUrls', async () => {
      const existing = {
        id: 'eq1',
        sku: 'CAM-1',
        model: 'Old Model',
        categoryId: 'cat1',
        customFields: null,
      }
      const updated = {
        id: 'eq1',
        sku: 'CAM-1',
        model: 'Old Model',
        categoryId: 'cat1',
        customFields: null,
        category: { name: 'Cameras' },
        brand: { name: 'Sony' },
        vendor: null,
        media: [],
        bookings: [],
      }
      ;(mockPrisma.equipment.findFirst as jest.Mock)
        .mockResolvedValueOnce(existing)
        .mockResolvedValue(updated)
      mockTx.equipment.update.mockResolvedValue(updated)
      mockTx.media.findFirst.mockResolvedValue({ id: 'm1' })
      mockTx.media.update.mockResolvedValue({})
      mockTx.media.create.mockResolvedValue({})
      ;(mockPrisma.equipment.findMany as jest.Mock).mockResolvedValue([])
      const TranslationService = require('../translation.service').TranslationService
      TranslationService.getTranslationsByLocale.mockResolvedValue(null)
      await EquipmentService.updateEquipment({
        id: 'eq1',
        updatedBy: 'u1',
        featuredImageUrl: 'https://example.com/new-featured.jpg',
        galleryImageUrls: ['https://example.com/g1.jpg'],
      })
      expect(mockTx.media.update).toHaveBeenCalled()
      expect(mockTx.media.create).toHaveBeenCalled()
    })

    it('updates equipment with videoUrl', async () => {
      const existing = {
        id: 'eq1',
        sku: 'CAM-1',
        model: 'Old Model',
        categoryId: 'cat1',
        customFields: null,
      }
      const updated = {
        id: 'eq1',
        sku: 'CAM-1',
        model: 'Old Model',
        categoryId: 'cat1',
        customFields: null,
        category: { name: 'Cameras' },
        brand: { name: 'Sony' },
        vendor: null,
        media: [],
        bookings: [],
      }
      ;(mockPrisma.equipment.findFirst as jest.Mock)
        .mockResolvedValueOnce(existing)
        .mockResolvedValue(updated)
      mockTx.equipment.update.mockResolvedValue(updated)
      mockTx.media.updateMany.mockResolvedValue({ count: 0 })
      mockTx.media.create.mockResolvedValue({})
      ;(mockPrisma.equipment.findMany as jest.Mock).mockResolvedValue([])
      const TranslationService = require('../translation.service').TranslationService
      TranslationService.getTranslationsByLocale.mockResolvedValue(null)
      await EquipmentService.updateEquipment({
        id: 'eq1',
        updatedBy: 'u1',
        videoUrl: 'https://example.com/new-video.mp4',
      })
      expect(mockTx.media.updateMany).toHaveBeenCalled()
      expect(mockTx.media.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'video',
            url: 'https://example.com/new-video.mp4',
          }),
        })
      )
    })

    it('removes depositAmount when NaN passed', async () => {
      const existing = {
        id: 'eq1',
        sku: 'CAM-1',
        model: 'Old Model',
        categoryId: 'cat1',
        customFields: { depositAmount: 100 },
      }
      const updated = {
        id: 'eq1',
        sku: 'CAM-1',
        model: 'Old Model',
        categoryId: 'cat1',
        customFields: {},
        category: { name: 'Cameras' },
        brand: { name: 'Sony' },
        vendor: null,
        media: [],
        bookings: [],
      }
      ;(mockPrisma.equipment.findFirst as jest.Mock)
        .mockResolvedValueOnce(existing)
        .mockResolvedValue(updated)
      mockTx.equipment.update.mockResolvedValue(updated)
      ;(mockPrisma.equipment.findMany as jest.Mock).mockResolvedValue([])
      const TranslationService = require('../translation.service').TranslationService
      TranslationService.getTranslationsByLocale.mockResolvedValue(null)
      await EquipmentService.updateEquipment({
        id: 'eq1',
        updatedBy: 'u1',
        depositAmount: Number.NaN,
      })
      const updateData = mockTx.equipment.update.mock.calls[0][0]?.data
      expect(updateData?.customFields?.depositAmount).toBeUndefined()
    })
  })

  describe('deleteEquipment', () => {
    it('throws when equipment not found', async () => {
      ;(mockPrisma.equipment.findFirst as jest.Mock).mockResolvedValue(null)
      await expect(EquipmentService.deleteEquipment('missing', 'u1')).rejects.toThrow(
        'Equipment not found'
      )
    })

    it('throws when equipment in active bookings', async () => {
      ;(mockPrisma.equipment.findFirst as jest.Mock).mockResolvedValue({
        id: 'eq1',
        deletedAt: null,
      })
      ;((mockPrisma as any).bookingEquipment?.findFirst as jest.Mock)?.mockResolvedValue({
        equipmentId: 'eq1',
      })
      await expect(EquipmentService.deleteEquipment('eq1', 'u1')).rejects.toThrow(
        'Cannot delete equipment that is in active bookings'
      )
    })

    it('soft-deletes equipment when found', async () => {
      ;(mockPrisma.equipment.findFirst as jest.Mock).mockResolvedValue({
        id: 'eq1',
        deletedAt: null,
      })
      ;((mockPrisma as any).bookingEquipment?.findFirst as jest.Mock)?.mockResolvedValue(null)
      ;(mockPrisma.equipment.update as jest.Mock).mockResolvedValue({
        id: 'eq1',
        deletedAt: new Date(),
      })
      await EquipmentService.deleteEquipment('eq1', 'u1')
      expect(mockPrisma.equipment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'eq1' },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        })
      )
    })
  })

  describe('checkAvailability', () => {
    it('returns unavailable when equipment not found', async () => {
      ;(mockPrisma.equipment.findFirst as jest.Mock).mockResolvedValue(null)
      const result = await EquipmentService.checkAvailability(
        'missing',
        new Date('2026-06-01'),
        new Date('2026-06-05')
      )
      expect(result.available).toBe(false)
      expect(result.reason).toBe('Equipment not found or inactive')
    })

    it('returns unavailable when equipment in MAINTENANCE', async () => {
      ;(mockPrisma.equipment.findFirst as jest.Mock).mockResolvedValue({
        id: 'eq1',
        condition: 'MAINTENANCE',
        quantityTotal: 5,
        quantityAvailable: 0,
      })
      const result = await EquipmentService.checkAvailability(
        'eq1',
        new Date('2026-06-01'),
        new Date('2026-06-05')
      )
      expect(result.available).toBe(false)
      expect(result.reason).toBe('MAINTENANCE')
    })

    it('returns available when no conflicts', async () => {
      ;(mockPrisma.equipment.findFirst as jest.Mock).mockResolvedValue({
        id: 'eq1',
        condition: 'GOOD',
        quantityTotal: 5,
        quantityAvailable: 3,
      })
      ;((mockPrisma as any).maintenance?.findMany as jest.Mock)?.mockResolvedValue([])
      ;((mockPrisma as any).bookingEquipment?.findMany as jest.Mock)?.mockResolvedValue([])
      const result = await EquipmentService.checkAvailability(
        'eq1',
        new Date('2026-06-01'),
        new Date('2026-06-05')
      )
      expect(result.available).toBe(true)
      expect(result.availableQuantity).toBe(3)
    })

    it('returns unavailable when maintenance conflicts exist', async () => {
      ;(mockPrisma.equipment.findFirst as jest.Mock).mockResolvedValue({
        id: 'eq1',
        condition: 'GOOD',
        quantityTotal: 5,
        quantityAvailable: 3,
      })
      ;((mockPrisma as any).maintenance?.findMany as jest.Mock)?.mockResolvedValue([
        { id: 'm1', maintenanceNumber: 'M001', scheduledDate: new Date(), completedDate: null, status: 'SCHEDULED' },
      ])
      const result = await EquipmentService.checkAvailability(
        'eq1',
        new Date('2026-06-01'),
        new Date('2026-06-05')
      )
      expect(result.available).toBe(false)
      expect(result.reason).toBe('MAINTENANCE')
      expect(result.maintenanceConflicts ?? []).toHaveLength(1)
      expect((result.maintenanceConflicts ?? [])[0]).toMatchObject({ maintenanceNumber: 'M001' })
    })

    it('returns available with overlappingBookings when qty sufficient', async () => {
      ;(mockPrisma.equipment.findFirst as jest.Mock).mockResolvedValue({
        id: 'eq1',
        condition: 'GOOD',
        quantityTotal: 5,
        quantityAvailable: 5,
      })
      ;((mockPrisma as any).maintenance?.findMany as jest.Mock)?.mockResolvedValue([])
      ;((mockPrisma as any).bookingEquipment?.findMany as jest.Mock)?.mockResolvedValue([
        {
          quantity: 2,
          booking: {
            bookingNumber: 'BK-001',
            startDate: new Date('2026-06-01'),
            endDate: new Date('2026-06-05'),
          },
        },
      ])
      const result = await EquipmentService.checkAvailability(
        'eq1',
        new Date('2026-06-01'),
        new Date('2026-06-05')
      )
      expect(result.available).toBe(true)
      expect(result.availableQuantity).toBe(5)
      expect(result.rentedQuantity).toBe(2)
      expect(result.overlappingBookings ?? []).toHaveLength(1)
      expect((result.overlappingBookings ?? [])[0]).toMatchObject({
        bookingNumber: 'BK-001',
        quantity: 2,
      })
    })

    it('returns unavailable when overlapping bookings exceed available qty', async () => {
      ;(mockPrisma.equipment.findFirst as jest.Mock).mockResolvedValue({
        id: 'eq1',
        condition: 'GOOD',
        quantityTotal: 5,
        quantityAvailable: 5,
      })
      ;((mockPrisma as any).maintenance?.findMany as jest.Mock)?.mockResolvedValue([])
      ;((mockPrisma as any).bookingEquipment?.findMany as jest.Mock)?.mockResolvedValue([
        {
          quantity: 5,
          booking: {
            bookingNumber: 'BK-001',
            startDate: new Date('2026-06-01'),
            endDate: new Date('2026-06-05'),
          },
        },
      ])
      const result = await EquipmentService.checkAvailability(
        'eq1',
        new Date('2026-06-01'),
        new Date('2026-06-05')
      )
      expect(result.available).toBe(false)
      expect(result.rentedQuantity).toBe(5)
      expect(result.overlappingBookings).toHaveLength(1)
    })

    it('excludes booking when excludeBookingId provided', async () => {
      ;(mockPrisma.equipment.findFirst as jest.Mock).mockResolvedValue({
        id: 'eq1',
        condition: 'GOOD',
        quantityTotal: 5,
        quantityAvailable: 5,
      })
      ;((mockPrisma as any).maintenance?.findMany as jest.Mock)?.mockResolvedValue([])
      ;((mockPrisma as any).bookingEquipment?.findMany as jest.Mock).mockResolvedValue([])
      await EquipmentService.checkAvailability(
        'eq1',
        new Date('2026-06-01'),
        new Date('2026-06-05'),
        'bk-exclude'
      )
      expect((mockPrisma as any).bookingEquipment?.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            booking: expect.objectContaining({
              id: { not: 'bk-exclude' },
            }),
          }),
        })
      )
    })
  })

  describe('createEquipment SKU conflict', () => {
    it('throws when SKU already exists', async () => {
      ;(mockPrisma.equipment.findFirst as jest.Mock).mockResolvedValue({
        id: 'existing',
        sku: 'EQ-ABC-123',
      })
      await expect(
        EquipmentService.createEquipment({
          sku: 'EQ-ABC-123',
          model: 'Test',
          categoryId: 'cat1',
          dailyPrice: 100,
          createdBy: 'u1',
        })
      ).rejects.toThrow('Equipment with SKU')
    })
  })
})
