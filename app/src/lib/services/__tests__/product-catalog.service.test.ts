/**
 * ═══════════════════════════════════════════
 * SERVICE: product-catalog.service
 * ═══════════════════════════════════════════
 */

import { ProductCatalogService, pricingDefaults } from '../product-catalog.service'
import { prisma } from '@/lib/db/prisma'
import { NotFoundError, ValidationError } from '@/lib/errors'
import { ProductStatus } from '@prisma/client'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    product: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    category: { findFirst: jest.fn() },
    brand: { findFirst: jest.fn() },
    inventoryItem: { findFirst: jest.fn(), createMany: jest.fn(), deleteMany: jest.fn() },
    productTranslation: { createMany: jest.fn(), findUnique: jest.fn(), update: jest.fn(), create: jest.fn() },
    $transaction: jest.fn(),
  },
}))

const mockProductFindFirst = prisma.product.findFirst as jest.Mock
const mockCategoryFindFirst = prisma.category.findFirst as jest.Mock
const mockBrandFindFirst = prisma.brand.findFirst as jest.Mock
const mockInventoryFindFirst = prisma.inventoryItem.findFirst as jest.Mock
const mockTransaction = prisma.$transaction as jest.Mock

const baseTranslation = {
  locale: 'en' as const,
  name: 'Sony FX3',
  shortDescription: 'Pro camera',
  longDescription: 'Full description',
  seoTitle: 'Sony FX3',
  seoDescription: 'Rent Sony FX3',
  seoKeywords: 'camera, sony',
}

const validCreateInput = {
  brandId: 'brd_01',
  categoryId: 'cat_01',
  featuredImage: 'https://example.com/img.jpg',
  translations: [baseTranslation],
  createdBy: 'usr_01',
  priceDaily: 14999,
  boxContents: 'Camera, battery, charger',
}

describe('ProductCatalogService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockProductFindFirst.mockResolvedValue(null)
    mockCategoryFindFirst.mockResolvedValue({ id: 'cat_01', parentId: null })
    mockBrandFindFirst.mockResolvedValue({ id: 'brd_01' })
    mockInventoryFindFirst.mockResolvedValue(null)
    mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
      const tx = {
        product: { create: jest.fn().mockResolvedValue({ id: 'prod_01' }), update: jest.fn().mockResolvedValue({ id: 'prod_01' }) },
        productTranslation: { createMany: jest.fn().mockResolvedValue({}), findUnique: jest.fn().mockResolvedValue(null), update: jest.fn().mockResolvedValue({}), create: jest.fn().mockResolvedValue({}) },
        inventoryItem: { createMany: jest.fn().mockResolvedValue({}), deleteMany: jest.fn().mockResolvedValue({}) },
      }
      return fn(tx)
    })
  })

  describe('create', () => {
    it('throws ValidationError when SKU already exists', async () => {
      mockProductFindFirst.mockResolvedValue({ id: 'existing' })
      await expect(
        ProductCatalogService.create({ ...validCreateInput, sku: 'SKU-001' })
      ).rejects.toThrow(ValidationError)
    })

    it('throws NotFoundError when brand not found', async () => {
      mockBrandFindFirst.mockResolvedValue(null)
      await expect(ProductCatalogService.create(validCreateInput)).rejects.toThrow(NotFoundError)
    })

    it('throws NotFoundError when category not found', async () => {
      mockCategoryFindFirst.mockResolvedValue(null)
      await expect(ProductCatalogService.create(validCreateInput)).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError when subCategory not found', async () => {
      mockCategoryFindFirst.mockResolvedValueOnce({ id: 'cat_01', parentId: null }).mockResolvedValueOnce(null)
      await expect(
        ProductCatalogService.create({ ...validCreateInput, subCategoryId: 'sub_01' })
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError when subCategory parent mismatch', async () => {
      mockCategoryFindFirst.mockResolvedValueOnce({ id: 'cat_01', parentId: null }).mockResolvedValueOnce({ id: 'sub_01', parentId: 'other_cat' })
      await expect(
        ProductCatalogService.create({ ...validCreateInput, subCategoryId: 'sub_01' })
      ).rejects.toThrow('Sub-category must belong to the selected category')
    })

    it('throws ValidationError when duplicate locale in translations', async () => {
      await expect(
        ProductCatalogService.create({
          ...validCreateInput,
          translations: [
            { ...baseTranslation, locale: 'en' },
            { ...baseTranslation, locale: 'en', name: 'Other' },
          ],
        })
      ).rejects.toThrow(ValidationError)
    })

    it('throws ValidationError when quantity is invalid', async () => {
      await expect(
        ProductCatalogService.create({ ...validCreateInput, quantity: -1 })
      ).rejects.toThrow('Quantity must be a non-negative integer')
    })

    it('throws ValidationError when duplicate serial number in inventoryItems', async () => {
      await expect(
        ProductCatalogService.create({
          ...validCreateInput,
          inventoryItems: [
            { serialNumber: 'SN1', barcode: 'BC1' },
            { serialNumber: 'SN1', barcode: 'BC2' },
          ],
        })
      ).rejects.toThrow('Duplicate serial number')
    })

    it('throws ValidationError when duplicate barcode in inventoryItems', async () => {
      await expect(
        ProductCatalogService.create({
          ...validCreateInput,
          inventoryItems: [
            { serialNumber: 'SN1', barcode: 'BC1' },
            { serialNumber: 'SN2', barcode: 'BC1' },
          ],
        })
      ).rejects.toThrow('Duplicate barcode')
    })

    it('throws ValidationError when serial number already exists globally', async () => {
      mockInventoryFindFirst.mockResolvedValue({ id: 'existing' })
      await expect(
        ProductCatalogService.create({
          ...validCreateInput,
          inventoryItems: [{ serialNumber: 'SN1', barcode: 'BC1' }],
        })
      ).rejects.toThrow('Serial number already exists')
    })

    it('throws ValidationError when barcode already exists globally', async () => {
      mockInventoryFindFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'existing' })
      await expect(
        ProductCatalogService.create({
          ...validCreateInput,
          inventoryItems: [{ serialNumber: 'SN1', barcode: 'BC1' }],
        })
      ).rejects.toThrow('Barcode already exists')
    })

    it('creates product when input is valid', async () => {
      const result = await ProductCatalogService.create(validCreateInput)
      expect(result).toMatchObject({ id: 'prod_01' })
      expect(mockTransaction).toHaveBeenCalled()
    })

    it('creates product with inventoryItems', async () => {
      const result = await ProductCatalogService.create({
        ...validCreateInput,
        inventoryItems: [{ serialNumber: 'SN1', barcode: 'BC1' }],
      })
      expect(result).toMatchObject({ id: 'prod_01' })
      const tx = mockTransaction.mock.calls[0][0]
      const mockTx = { product: { create: jest.fn().mockResolvedValue({ id: 'prod_01' }) }, productTranslation: { createMany: jest.fn().mockResolvedValue({}) }, inventoryItem: { createMany: jest.fn().mockResolvedValue({}) } }
      await tx(mockTx)
      expect(mockTx.inventoryItem.createMany).toHaveBeenCalled()
    })

    it('forces DRAFT when priceDaily is 0', async () => {
      const txCreate = jest.fn().mockResolvedValue({ id: 'prod_01' })
      mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          product: { create: txCreate },
          productTranslation: { createMany: jest.fn().mockResolvedValue({}) },
          inventoryItem: { createMany: jest.fn().mockResolvedValue({}) },
        }
        return fn(tx)
      })
      await ProductCatalogService.create({ ...validCreateInput, priceDaily: 0 })
      expect(txCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: ProductStatus.DRAFT }) }))
    })

    it('forces DRAFT when boxContents empty', async () => {
      const txCreate = jest.fn().mockResolvedValue({ id: 'prod_01' })
      mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          product: { create: txCreate },
          productTranslation: { createMany: jest.fn().mockResolvedValue({}) },
          inventoryItem: { createMany: jest.fn().mockResolvedValue({}) },
        }
        return fn(tx)
      })
      await ProductCatalogService.create({ ...validCreateInput, boxContents: '' })
      expect(txCreate).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: ProductStatus.DRAFT }) }))
    })

  })

  describe('update', () => {
    const existingProduct = {
      id: 'prod_01',
      categoryId: 'cat_01',
      subCategoryId: null,
      priceDaily: 100,
      priceWeekly: 400,
      priceMonthly: 1200,
      boxContents: 'Box',
      status: 'ACTIVE',
      productType: 'RENTAL',
      sku: 'SKU1',
      brandId: 'brd_01',
      featuredImage: 'img.jpg',
      galleryImages: null,
      videoUrl: null,
      relatedProducts: null,
      tags: null,
      quantity: 1,
      bufferTime: 0,
      depositAmount: null,
    }

    it('throws NotFoundError when product not found', async () => {
      mockProductFindFirst.mockResolvedValue(null)
      await expect(
        ProductCatalogService.update('prod_missing', { updatedBy: 'usr_01' })
      ).rejects.toThrow(NotFoundError)
    })

    it('throws ValidationError when new SKU already exists', async () => {
      mockProductFindFirst.mockResolvedValueOnce(existingProduct).mockResolvedValueOnce({ id: 'other' })
      await expect(
        ProductCatalogService.update('prod_01', { updatedBy: 'usr_01', sku: 'TAKEN' })
      ).rejects.toThrow('SKU already exists')
    })

    it('updates product when found', async () => {
      mockProductFindFirst.mockResolvedValue(existingProduct)
      const txUpdate = jest.fn().mockResolvedValue({ id: 'prod_01' })
      mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          product: { update: txUpdate },
          productTranslation: { findUnique: jest.fn().mockResolvedValue(null), update: jest.fn(), create: jest.fn() },
          inventoryItem: { deleteMany: jest.fn().mockResolvedValue({}), createMany: jest.fn().mockResolvedValue({}) },
        }
        return fn(tx)
      })
      const result = await ProductCatalogService.update('prod_01', { updatedBy: 'usr_01' })
      expect(result).toMatchObject({ id: 'prod_01' })
    })

    it('updates translation when existing', async () => {
      mockProductFindFirst.mockResolvedValue(existingProduct)
      const mockFindUnique = jest.fn().mockResolvedValue({ id: 't1' })
      const mockUpdate = jest.fn().mockResolvedValue({})
      mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          product: { update: jest.fn().mockResolvedValue({ id: 'prod_01' }) },
          productTranslation: { findUnique: mockFindUnique, update: mockUpdate, create: jest.fn() },
          inventoryItem: { deleteMany: jest.fn(), createMany: jest.fn() },
        }
        return fn(tx)
      })
      await ProductCatalogService.update('prod_01', {
        updatedBy: 'usr_01',
        translations: [{ ...baseTranslation }],
      })
      expect(mockUpdate).toHaveBeenCalled()
    })

    it('creates translation when not existing', async () => {
      mockProductFindFirst.mockResolvedValue(existingProduct)
      const mockFindUnique = jest.fn().mockResolvedValue(null)
      const mockCreate = jest.fn().mockResolvedValue({})
      mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          product: { update: jest.fn().mockResolvedValue({ id: 'prod_01' }) },
          productTranslation: { findUnique: mockFindUnique, update: jest.fn(), create: mockCreate },
          inventoryItem: { deleteMany: jest.fn(), createMany: jest.fn() },
        }
        return fn(tx)
      })
      await ProductCatalogService.update('prod_01', {
        updatedBy: 'usr_01',
        translations: [{ ...baseTranslation, locale: 'ar' }],
      })
      expect(mockCreate).toHaveBeenCalled()
    })

    it('replaces inventoryItems when provided', async () => {
      mockProductFindFirst.mockResolvedValue(existingProduct)
      const mockDeleteMany = jest.fn().mockResolvedValue({})
      const mockCreateMany = jest.fn().mockResolvedValue({})
      mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          product: { update: jest.fn().mockResolvedValue({ id: 'prod_01' }) },
          productTranslation: { findUnique: jest.fn(), update: jest.fn(), create: jest.fn() },
          inventoryItem: { deleteMany: mockDeleteMany, createMany: mockCreateMany },
        }
        return fn(tx)
      })
      await ProductCatalogService.update('prod_01', {
        updatedBy: 'usr_01',
        inventoryItems: [{ serialNumber: 'SN2', barcode: 'BC2' }],
      })
      expect(mockDeleteMany).toHaveBeenCalled()
      expect(mockCreateMany).toHaveBeenCalled()
    })

    it('validates category hierarchy when categoryId or subCategoryId changed', async () => {
      mockProductFindFirst.mockResolvedValue({ ...existingProduct })
      mockCategoryFindFirst.mockResolvedValueOnce({ id: 'cat_02', parentId: null }).mockResolvedValueOnce({ id: 'sub_01', parentId: 'cat_02' })
      mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          product: { update: jest.fn().mockResolvedValue({ id: 'prod_01' }) },
          productTranslation: { findUnique: jest.fn(), update: jest.fn(), create: jest.fn() },
          inventoryItem: { deleteMany: jest.fn(), createMany: jest.fn() },
        }
        return fn(tx)
      })
      const result = await ProductCatalogService.update('prod_01', {
        updatedBy: 'usr_01',
        categoryId: 'cat_02',
        subCategoryId: 'sub_01',
      })
      expect(result).toMatchObject({ id: 'prod_01' })
      expect(mockCategoryFindFirst).toHaveBeenCalledTimes(2)
    })

    it('sets depositAmount to null when explicitly passed', async () => {
      mockProductFindFirst.mockResolvedValue({ ...existingProduct, depositAmount: 100 })
      const txUpdate = jest.fn().mockResolvedValue({ id: 'prod_01' })
      mockTransaction.mockImplementation(async (fn: (tx: unknown) => Promise<unknown>) => {
        const tx = {
          product: { update: txUpdate },
          productTranslation: { findUnique: jest.fn(), update: jest.fn(), create: jest.fn() },
          inventoryItem: { deleteMany: jest.fn(), createMany: jest.fn() },
        }
        return fn(tx)
      })
      await ProductCatalogService.update('prod_01', { updatedBy: 'usr_01', depositAmount: null })
      expect(txUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            depositAmount: null,
          }),
        })
      )
    })
  })

  describe('pricingDefaults', () => {
    it('exports weeklyFactor and monthlyFactor', () => {
      expect(pricingDefaults.weeklyFactor).toBeDefined()
      expect(pricingDefaults.monthlyFactor).toBeDefined()
    })
  })
})
