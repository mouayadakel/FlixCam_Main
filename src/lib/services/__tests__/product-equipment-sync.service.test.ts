/**
 * Unit tests for product-equipment-sync.service
 * - syncProductToEquipment: create/update Equipment from Product, media, translations
 * - syncEquipmentToProduct: gallery padding and behavior
 */

import {
  syncProductToEquipment,
  syncEquipmentToProduct,
} from '../product-equipment-sync.service'
import { prisma } from '@/lib/db/prisma'
import { NotFoundError } from '@/lib/errors'

// Use var so mockTx is available when jest.mock factory runs (avoids TDZ)
 
var mockTx: {
  product: { upsert: jest.Mock }
  productTranslation: { upsert: jest.Mock; findUnique: jest.Mock }
  equipment: { findFirst: jest.Mock; create: jest.Mock; update: jest.Mock }
  media: { findFirst: jest.Mock; create: jest.Mock }
  translation: { upsert: jest.Mock }
}

jest.mock('@/lib/db/prisma', () => {
  mockTx = {
    product: { upsert: jest.fn().mockResolvedValue({}) },
    productTranslation: {
      upsert: jest.fn().mockResolvedValue({}),
      findUnique: jest.fn().mockResolvedValue(null),
    },
    equipment: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    media: { findFirst: jest.fn(), create: jest.fn() },
    translation: { upsert: jest.fn().mockResolvedValue({}) },
  }
  return {
    prisma: {
      product: { findFirst: jest.fn() },
      equipment: { findFirst: jest.fn() },
      translation: { findMany: jest.fn().mockResolvedValue([]) },
      $transaction: jest.fn((cb: (tx: typeof mockTx) => Promise<void>) => cb(mockTx)),
    },
  }
})

const { prisma } = require('@/lib/db/prisma')
const mockProductFindFirst = prisma.product.findFirst as jest.Mock
const mockFindFirst = prisma.equipment.findFirst as jest.Mock
const mockTranslationFindMany = prisma.translation.findMany as jest.Mock

function createMockProduct(overrides: Record<string, unknown> = {}) {
  return {
    id: 'prod-1',
    sku: 'SKU-001',
    deletedAt: null,
    categoryId: 'cat-1',
    brandId: 'brand-1',
    priceDaily: 100,
    priceWeekly: 500,
    priceMonthly: 1500,
    quantity: 5,
    featuredImage: 'https://example.com/featured.jpg',
    galleryImages: ['https://example.com/g1.jpg'],
    boxContents: null,
    tags: null,
    bufferTime: null,
    relatedProducts: null,
    translations: [
      {
        locale: 'en',
        name: 'English Name',
        shortDescription: 'Short',
        longDescription: 'Long',
        seoTitle: 'SEO',
        seoDescription: 'SEO Desc',
        seoKeywords: 'keywords',
        specifications: { resolution: '4K' },
        deletedAt: null,
      },
    ],
    brand: {},
    category: {},
    inventoryItems: [{ barcode: 'BAR-123', createdAt: new Date() }],
    ...overrides,
  }
}

describe('product-equipment-sync.service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockTx.product.upsert.mockResolvedValue({})
    mockTx.productTranslation.upsert.mockResolvedValue({})
    mockTx.equipment.findFirst.mockResolvedValue(null)
    mockTx.equipment.create.mockResolvedValue({ id: 'prod-1' })
    mockTx.equipment.update.mockResolvedValue({})
    mockTx.media.findFirst.mockResolvedValue(null)
    mockTx.media.create.mockResolvedValue({})
    mockTx.translation.upsert.mockResolvedValue({})
    mockTranslationFindMany.mockResolvedValue([])
  })

  describe('syncProductToEquipment', () => {
    it('throws NotFoundError when product not found', async () => {
      mockProductFindFirst.mockResolvedValue(null)
      await expect(syncProductToEquipment('missing-id')).rejects.toThrow(NotFoundError)
      await expect(syncProductToEquipment('missing-id')).rejects.toThrow('Product')
      expect(prisma.$transaction).not.toHaveBeenCalled()
    })

    it('creates new Equipment when no existing equipment found', async () => {
      mockProductFindFirst.mockResolvedValue(createMockProduct())
      mockTx.equipment.findFirst.mockResolvedValue(null)
      mockTx.equipment.create.mockResolvedValue({ id: 'prod-1' })

      await syncProductToEquipment('prod-1')

      expect(mockTx.equipment.create).toHaveBeenCalledTimes(1)
      const createData = mockTx.equipment.create.mock.calls[0][0].data
      expect(createData.id).toBe('prod-1')
      expect(createData.sku).toBe('SKU-001')
      expect(createData.barcode).toBe('BAR-123')
      expect(createData.model).toBe('English Name')
      expect(createData.specifications).toEqual({ resolution: '4K' })
    })

    it('updates existing Equipment when found by productId', async () => {
      mockProductFindFirst.mockResolvedValue(createMockProduct())
      mockTx.equipment.findFirst
        .mockResolvedValueOnce({ id: 'eq-1', productId: 'prod-1', deletedAt: null })
        .mockResolvedValue(null)

      await syncProductToEquipment('prod-1')

      expect(mockTx.equipment.update).toHaveBeenCalledTimes(1)
      expect(mockTx.equipment.create).not.toHaveBeenCalled()
      expect(mockTx.equipment.update).toHaveBeenCalledWith({
        where: { id: 'eq-1' },
        data: expect.objectContaining({
          sku: 'SKU-001',
          productId: 'prod-1',
          model: 'English Name',
        }),
      })
    })

    it('updates existing Equipment when found by id (fallback)', async () => {
      mockProductFindFirst.mockResolvedValue(createMockProduct())
      mockTx.equipment.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'prod-1', deletedAt: null })
        .mockResolvedValue(null)

      await syncProductToEquipment('prod-1')

      expect(mockTx.equipment.update).toHaveBeenCalledTimes(1)
      expect(mockTx.equipment.update).toHaveBeenCalledWith({
        where: { id: 'prod-1' },
        data: expect.any(Object),
      })
    })

    it('restores soft-deleted Equipment when found by barcode', async () => {
      mockProductFindFirst.mockResolvedValue(
        createMockProduct({ inventoryItems: [{ barcode: 'BAR-123', createdAt: new Date() }] })
      )
      mockTx.equipment.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'eq-old', barcode: 'BAR-123', deletedAt: new Date() })
        .mockResolvedValue(null)

      await syncProductToEquipment('prod-1')

      expect(mockTx.equipment.update).toHaveBeenCalledTimes(1)
      expect(mockTx.equipment.update).toHaveBeenCalledWith({
        where: { id: 'eq-old' },
        data: expect.objectContaining({
          deletedAt: null,
          deletedBy: null,
        }),
      })
    })

    it('handles enTranslation fallback to sku when no en translation', async () => {
      mockProductFindFirst.mockResolvedValue(
        createMockProduct({
          translations: [],
          sku: 'FALLBACK-SKU',
        })
      )
      mockTx.equipment.findFirst.mockResolvedValue(null)

      await syncProductToEquipment('prod-1')

      const createData = mockTx.equipment.create.mock.calls[0][0].data
      expect(createData.model).toBe('FALLBACK-SKU')
      expect(createData.nameEn).toBe('FALLBACK-SKU')
    })

    it('handles sku fallback to prod-{id} when product has no sku', async () => {
      mockProductFindFirst.mockResolvedValue(
        createMockProduct({ sku: null })
      )
      mockTx.equipment.findFirst.mockResolvedValue(null)

      await syncProductToEquipment('prod-1')

      const createData = mockTx.equipment.create.mock.calls[0][0].data
      expect(createData.sku).toBe('prod-prod-1')
    })

    it('handles barcode from inventoryItems', async () => {
      mockProductFindFirst.mockResolvedValue(
        createMockProduct({
          inventoryItems: [{ barcode: 'SCAN-ME', createdAt: new Date() }],
        })
      )
      mockTx.equipment.findFirst.mockResolvedValue(null)

      await syncProductToEquipment('prod-1')

      const createData = mockTx.equipment.create.mock.calls[0][0].data
      expect(createData.barcode).toBe('SCAN-ME')
    })

    it('handles empty inventoryItems (no barcode)', async () => {
      mockProductFindFirst.mockResolvedValue(
        createMockProduct({ inventoryItems: [] })
      )
      mockTx.equipment.findFirst.mockResolvedValue(null)

      await syncProductToEquipment('prod-1')

      const createData = mockTx.equipment.create.mock.calls[0][0].data
      expect(createData.barcode).toBeUndefined()
    })

    it('handles galleryImages as non-array (treats as empty)', async () => {
      mockProductFindFirst.mockResolvedValue(
        createMockProduct({
          galleryImages: null,
          featuredImage: 'https://example.com/only.jpg',
        })
      )
      mockTx.equipment.findFirst.mockResolvedValue(null)

      await syncProductToEquipment('prod-1')

      expect(mockTx.media.create).toHaveBeenCalledTimes(1)
      expect(mockTx.media.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          url: 'https://example.com/only.jpg',
          equipmentId: 'prod-1',
        }),
      })
    })

    it('handles specifications and customFields (boxContents, tags, bufferTime, relatedProducts)', async () => {
      mockProductFindFirst.mockResolvedValue(
        createMockProduct({
          boxContents: 'Cable, Case',
          tags: 'camera,4k',
          bufferTime: 2,
          relatedProducts: ['rel-1', 'rel-2'],
          translations: [
            {
              locale: 'en',
              name: 'Name',
              shortDescription: null,
              longDescription: null,
              seoTitle: null,
              seoDescription: null,
              seoKeywords: null,
              specifications: { weight: '1kg' },
              deletedAt: null,
            },
          ],
        })
      )
      mockTx.equipment.findFirst.mockResolvedValue(null)

      await syncProductToEquipment('prod-1')

      const createData = mockTx.equipment.create.mock.calls[0][0].data
      expect(createData.specifications).toEqual({ weight: '1kg' })
      expect(createData.customFields).toMatchObject({
        boxContents: 'Cable, Case',
        tags: 'camera,4k',
        bufferTime: 2,
        relatedEquipmentIds: ['rel-1', 'rel-2'],
      })
    })

    it('creates media for each image URL', async () => {
      mockProductFindFirst.mockResolvedValue(
        createMockProduct({
          featuredImage: 'https://example.com/f.jpg',
          galleryImages: ['https://example.com/g1.jpg', 'https://example.com/g2.jpg'],
        })
      )
      mockTx.equipment.findFirst.mockResolvedValue(null)
      mockTx.media.findFirst.mockResolvedValue(null)

      await syncProductToEquipment('prod-1')

      expect(mockTx.media.create).toHaveBeenCalledTimes(3)
      const urls = mockTx.media.create.mock.calls.map((c: unknown[]) => (c[0] as { data: { url: string } }).data.url)
      expect(urls).toContain('https://example.com/f.jpg')
      expect(urls).toContain('https://example.com/g1.jpg')
      expect(urls).toContain('https://example.com/g2.jpg')
    })

    it('skips creating media when media already exists for url+equipmentId', async () => {
      mockProductFindFirst.mockResolvedValue(
        createMockProduct({
          featuredImage: 'https://example.com/existing.jpg',
          galleryImages: [],
        })
      )
      mockTx.equipment.findFirst.mockResolvedValue(null)
      mockTx.media.findFirst.mockResolvedValue({ id: 'media-1' })

      await syncProductToEquipment('prod-1')

      expect(mockTx.media.create).not.toHaveBeenCalled()
    })

    it('upserts translations for each product translation', async () => {
      mockProductFindFirst.mockResolvedValue(
        createMockProduct({
          translations: [
            {
              locale: 'en',
              name: 'EN Name',
              shortDescription: 'EN Short',
              longDescription: 'EN Long',
              seoTitle: 'EN SEO',
              seoDescription: 'EN SEO Desc',
              seoKeywords: 'EN keys',
              specifications: null,
              deletedAt: null,
            },
          ],
        })
      )
      mockTx.equipment.findFirst.mockResolvedValue(null)

      await syncProductToEquipment('prod-1')

      expect(mockTx.translation.upsert).toHaveBeenCalled()
      const upsertCalls = mockTx.translation.upsert.mock.calls
      interface UpsertArg { where?: { entityType_entityId_field_language?: { field?: string; language?: string } }; create?: { value?: string } }
      const nameUpsert = upsertCalls.find(
        (c: unknown[]) => {
          const arg = (c as [UpsertArg])[0]
          return arg?.where?.entityType_entityId_field_language?.field === 'name' &&
            arg?.where?.entityType_entityId_field_language?.language === 'en'
        }
      )
      expect(nameUpsert).toBeDefined()
      expect(((nameUpsert as [UpsertArg])[0] as UpsertArg).create?.value).toBe('EN Name')
    })

    it('handles model fallback to product.id when no en translation and no sku', async () => {
      mockProductFindFirst.mockResolvedValue(
        createMockProduct({
          sku: null,
          translations: [],
        })
      )
      mockTx.equipment.findFirst.mockResolvedValue(null)

      await syncProductToEquipment('prod-1')

      const createData = mockTx.equipment.create.mock.calls[0][0].data
      expect(createData.model).toBe('prod-1')
    })

    it('retries with suffixed slug when base slug is taken (ensureUniqueSlug)', async () => {
      mockProductFindFirst.mockResolvedValue(createMockProduct())
      mockTx.equipment.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'other' })
        .mockResolvedValueOnce(null)

      await syncProductToEquipment('prod-1')

      const createData = mockTx.equipment.create.mock.calls[0][0].data
      expect(createData.slug).toBe('english-name-1')
    })

    it('returns slug on ensureUniqueSlug when findFirst throws', async () => {
      mockProductFindFirst.mockResolvedValue(createMockProduct())
      mockTx.equipment.findFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockRejectedValueOnce(new Error('db error'))
        .mockResolvedValue(null)

      await syncProductToEquipment('prod-1')

      const createData = mockTx.equipment.create.mock.calls[0][0].data
      expect(createData.slug).toBe('english-name')
    })

    it('uses timestamp suffix when slug exhausted after max attempts', async () => {
      mockProductFindFirst.mockResolvedValue(createMockProduct())
      const slugTaken = { id: 'other' }
      mockTx.equipment.findFirst.mockImplementation((opts: { where?: { slug?: string } }) => {
        const slug = opts?.where?.slug
        if (slug && slug.startsWith('english-name')) {
          return Promise.resolve(slugTaken)
        }
        return Promise.resolve(null)
      })

      await syncProductToEquipment('prod-1')

      const createData = mockTx.equipment.create.mock.calls[0][0].data
      expect(createData.slug).toMatch(/^english-name-\d+$/)
    })
  })

  describe('syncEquipmentToProduct', () => {
    it('throws NotFoundError when equipment not found', async () => {
      mockFindFirst.mockResolvedValue(null)
      await expect(syncEquipmentToProduct('missing-id')).rejects.toThrow(NotFoundError)
      await expect(syncEquipmentToProduct('missing-id')).rejects.toThrow('Equipment')
      expect(prisma.$transaction).not.toHaveBeenCalled()
    })

    it('throws when equipment has no brand', async () => {
      mockFindFirst.mockResolvedValue({
        id: 'eq-1',
        deletedAt: null,
        brandId: null,
        sku: 'SKU1',
        model: 'Model',
        categoryId: 'cat-1',
        dailyPrice: 10,
        weeklyPrice: null,
        monthlyPrice: null,
        media: [],
      } as any)
      await expect(syncEquipmentToProduct('eq-1')).rejects.toThrow('brand')
      expect(prisma.$transaction).not.toHaveBeenCalled()
    })

    it('uses only real gallery images when equipment has 0 media', async () => {
      mockFindFirst.mockResolvedValue({
        id: 'eq-1',
        deletedAt: null,
        brandId: 'brand-1',
        sku: 'SKU1',
        model: 'Model',
        categoryId: 'cat-1',
        dailyPrice: 10,
        weeklyPrice: null,
        monthlyPrice: null,
        media: [],
      } as any)
      await syncEquipmentToProduct('eq-1')
      expect(mockTx.product.upsert).toHaveBeenCalledTimes(1)
      const upsertCall = mockTx.product.upsert.mock.calls[0][0]
      const galleryImages = upsertCall.create.galleryImages as string[]
      expect(Array.isArray(galleryImages)).toBe(true)
      expect(galleryImages.length).toBe(0)
    })

    it('uses only real gallery images when equipment has 1 media', async () => {
      mockFindFirst.mockResolvedValue({
        id: 'eq-1',
        deletedAt: null,
        brandId: 'brand-1',
        sku: 'SKU1',
        model: 'Model',
        categoryId: 'cat-1',
        dailyPrice: 10,
        weeklyPrice: null,
        monthlyPrice: null,
        media: [{ url: 'https://example.com/1.jpg' }],
      } as any)
      await syncEquipmentToProduct('eq-1')
      expect(mockTx.product.upsert).toHaveBeenCalledTimes(1)
      const upsertCall = mockTx.product.upsert.mock.calls[0][0]
      const galleryImages = upsertCall.create.galleryImages as string[]
      expect(galleryImages.length).toBe(1)
    })

    it('preserves all gallery images when equipment has 4 media', async () => {
      mockFindFirst.mockResolvedValue({
        id: 'eq-1',
        deletedAt: null,
        brandId: 'brand-1',
        sku: 'SKU1',
        model: 'Model',
        categoryId: 'cat-1',
        dailyPrice: 10,
        weeklyPrice: null,
        monthlyPrice: null,
        media: [
          { url: 'https://example.com/1.jpg' },
          { url: 'https://example.com/2.jpg' },
          { url: 'https://example.com/3.jpg' },
          { url: 'https://example.com/4.jpg' },
        ],
      } as any)
      await syncEquipmentToProduct('eq-1')
      expect(mockTx.product.upsert).toHaveBeenCalledTimes(1)
      const upsertCall = mockTx.product.upsert.mock.calls[0][0]
      const galleryImages = upsertCall.create.galleryImages as string[]
      expect(galleryImages.length).toBe(4)
    })

    it('upserts product and 3 product translations', async () => {
      mockFindFirst.mockResolvedValue({
        id: 'eq-1',
        deletedAt: null,
        brandId: 'brand-1',
        sku: 'SKU1',
        model: 'Model',
        categoryId: 'cat-1',
        dailyPrice: 10,
        weeklyPrice: null,
        monthlyPrice: null,
        media: [{ url: 'https://example.com/1.jpg' }],
      } as any)
      await syncEquipmentToProduct('eq-1')
      expect(mockTx.product.upsert).toHaveBeenCalledTimes(1)
      expect(mockTx.productTranslation.upsert).toHaveBeenCalledTimes(3)
    })

    it('uses existing equipment translations from Translation table', async () => {
      mockFindFirst.mockResolvedValue({
        id: 'eq-1',
        deletedAt: null,
        brandId: 'brand-1',
        sku: 'SKU1',
        model: 'Model',
        categoryId: 'cat-1',
        dailyPrice: 10,
        weeklyPrice: null,
        monthlyPrice: null,
        media: [{ url: 'https://example.com/1.jpg' }],
      } as any)
      mockTranslationFindMany.mockResolvedValue([
        { language: 'en', field: 'name', value: 'AI Generated Name' },
        { language: 'en', field: 'shortDescription', value: 'AI Short' },
      ])
      await syncEquipmentToProduct('eq-1')
      expect(mockTranslationFindMany).toHaveBeenCalledWith({
        where: { entityType: 'equipment', entityId: 'eq-1', deletedAt: null },
      })
      expect(mockTx.productTranslation.upsert).toHaveBeenCalledTimes(3)
    })
  })
})
