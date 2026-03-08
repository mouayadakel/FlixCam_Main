/**
 * Unit tests for import-worker processImportJob
 */

const mockGetJob = jest.fn()
const mockMarkComplete = jest.fn()
const mockMarkProcessing = jest.fn()
const mockMapColumns = jest.fn()
const mockSaveMappingHistory = jest.fn()
const mockBrandUpsert = jest.fn()
const mockCategoryFindUnique = jest.fn()
const mockGenerateUniqueSKU = jest.fn()

jest.mock('../import.service', () => ({
  ImportService: {
    getJob: (...args: unknown[]) => mockGetJob(...args),
    markComplete: (...args: unknown[]) => mockMarkComplete(...args),
    markProcessing: (...args: unknown[]) => mockMarkProcessing(...args),
    markRow: jest.fn().mockResolvedValue(undefined),
    bumpProgress: jest.fn().mockResolvedValue(undefined),
  },
}))

jest.mock('../column-mapper.service', () => ({
  mapColumns: (...args: unknown[]) => mockMapColumns(...args),
  saveMappingHistory: (...args: unknown[]) => mockSaveMappingHistory(...args),
}))

const mockInventoryItemFindFirst = jest.fn().mockResolvedValue(null)
const mockProductFindUnique = jest.fn().mockResolvedValue(null)
const mockProductUpdate = jest.fn().mockResolvedValue({})
const mockInventoryItemUpdate = jest.fn().mockResolvedValue({})
const mockImportJobRowFindMany = jest.fn().mockResolvedValue([])
const mockProductTranslationUpdateMany = jest.fn().mockResolvedValue({ count: 1 })
const mockBrandFindUnique = jest.fn().mockResolvedValue(null)

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    brand: {
      upsert: (...args: unknown[]) => mockBrandUpsert(...args),
      findUnique: (...args: unknown[]) => mockBrandFindUnique(...args),
    },
    category: { findUnique: (...args: unknown[]) => mockCategoryFindUnique(...args) },
    product: {
      create: jest.fn().mockResolvedValue({ id: 'prod1' }),
      findUnique: (...args: unknown[]) => mockProductFindUnique(...args),
      findMany: jest.fn().mockResolvedValue([]),
      update: (...args: unknown[]) => mockProductUpdate(...args),
    },
    inventoryItem: {
      findFirst: (...args: unknown[]) => mockInventoryItemFindFirst(...args),
      update: (...args: unknown[]) => mockInventoryItemUpdate(...args),
    },
    productTranslation: { updateMany: (...args: unknown[]) => mockProductTranslationUpdateMany(...args) },
    importJobRow: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findMany: (...args: unknown[]) => mockImportJobRowFindMany(...args),
    },
    importJob: { update: jest.fn().mockResolvedValue({}) },
  },
}))

jest.mock('@/lib/utils/sku-generator', () => ({
  generateUniqueSKU: (...args: unknown[]) => mockGenerateUniqueSKU(...args),
}))

const mockLookupDeepSpecs = jest.fn().mockReturnValue(null)
jest.mock('../specs-db.service', () => ({
  lookupDeepSpecs: (...args: unknown[]) => mockLookupDeepSpecs(...args),
}))

jest.mock('../product-catalog.service', () => ({
  ProductCatalogService: {
    create: jest.fn().mockResolvedValue({ id: 'prod1' }),
    update: jest.fn().mockResolvedValue({ id: 'prod1' }),
  },
}))

jest.mock('../product-equipment-sync.service', () => ({
  syncProductToEquipment: jest.fn().mockResolvedValue(undefined),
}))

const mockAddAIProcessingJob = jest.fn().mockRejectedValue(new Error('Redis down'))
const mockRunMasterFill = jest.fn().mockRejectedValue(new Error('AI unavailable'))
const mockInferMissingSpecs = jest.fn().mockResolvedValue({ specs: [] })
const mockAddImageProcessingJob = jest.fn().mockRejectedValue(new Error('Queue down'))
const mockRebuildRelatedProducts = jest.fn().mockRejectedValue(new Error('Rebuild failed'))

jest.mock('@/lib/queue/ai-processing.queue', () => ({
  addAIProcessingJob: (...args: unknown[]) => mockAddAIProcessingJob(...args),
}))

jest.mock('@/lib/services/ai-master-fill.service', () => ({
  runMasterFill: (...args: unknown[]) => mockRunMasterFill(...args),
}))

jest.mock('@/lib/services/ai-spec-parser.service', () => ({
  inferMissingSpecs: (...args: unknown[]) => mockInferMissingSpecs(...args),
}))

jest.mock('@/lib/queue/image-processing.queue', () => ({
  addImageProcessingJob: (...args: unknown[]) => mockAddImageProcessingJob(...args),
}))

jest.mock('@/lib/services/product-similarity.service', () => ({
  rebuildRelatedProducts: (...args: unknown[]) => mockRebuildRelatedProducts(...args),
}))

const { processImportJob } = require('../import-worker')

describe('processImportJob', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'info').mockImplementation(() => {})
    jest.spyOn(console, 'warn').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})
    mockMapColumns.mockResolvedValue([
      { sourceHeader: 'name', mappedField: 'name', confidence: 90 },
      { sourceHeader: 'brand', mappedField: 'brand', confidence: 90 },
      { sourceHeader: 'daily_price', mappedField: 'daily_price', confidence: 90 },
    ])
    mockSaveMappingHistory.mockResolvedValue(undefined)
    mockBrandUpsert.mockResolvedValue({ id: 'brand1' })
    mockBrandFindUnique.mockResolvedValue(null)
    mockCategoryFindUnique.mockResolvedValue({ name: 'Cameras' })
    mockGenerateUniqueSKU.mockResolvedValue('CAM-001')
    mockLookupDeepSpecs.mockReturnValue(null)
    mockInventoryItemFindFirst.mockResolvedValue(null)
  })

  afterEach(() => {
    ;(console.info as jest.Mock).mockRestore?.()
    ;(console.warn as jest.Mock).mockRestore?.()
    ;(console.error as jest.Mock).mockRestore?.()
  })

  it('throws when job not found', async () => {
    mockGetJob.mockResolvedValue(null)
    await expect(processImportJob('missing-job')).rejects.toThrow('Job not found')
    expect(mockMarkComplete).not.toHaveBeenCalled()
    expect(mockMarkProcessing).not.toHaveBeenCalled()
  })

  it('marks complete and returns early when job has no rows', async () => {
    mockGetJob.mockResolvedValue({
      id: 'job1',
      rows: [],
    })
    await processImportJob('job1')
    expect(mockMarkComplete).toHaveBeenCalledWith('job1')
    expect(mockMarkProcessing).not.toHaveBeenCalled()
  })

  it('calls markProcessing when job has rows', async () => {
    mockGetJob.mockResolvedValue({
      id: 'job1',
      rows: [
        {
          rowNumber: 1,
          payload: {
            sheetName: 'Sheet1',
            categoryId: 'cat1',
            row: {
              name: 'Test Product',
              brand: 'Sony',
              daily_price: 100,
            },
          },
        },
      ],
    })

    await processImportJob('job1')
    expect(mockMarkProcessing).toHaveBeenCalledWith('job1')
  })

  it('marks row as error when categoryId is missing', async () => {
    const ImportService = require('../import.service').ImportService
    mockGetJob.mockResolvedValue({
      id: 'job1',
      rows: [
        {
          rowNumber: 1,
          payload: {
            sheetName: 'Sheet1',
            categoryId: '',
            row: { name: 'Product', brand: 'Sony', daily_price: 100 },
          },
        },
      ],
    })
    await processImportJob('job1')
    expect(ImportService.markRow).toHaveBeenCalledWith(
      'job1',
      1,
      expect.anything(),
      expect.objectContaining({ error: expect.stringContaining('Category mapping missing') })
    )
  })

  it('marks row as error when name is missing', async () => {
    const ImportService = require('../import.service').ImportService
    mockGetJob.mockResolvedValue({
      id: 'job1',
      rows: [
        {
          rowNumber: 1,
          payload: {
            sheetName: 'Sheet1',
            categoryId: 'cat1',
            row: { brand: 'Sony', daily_price: 100 },
          },
        },
      ],
    })
    await processImportJob('job1')
    expect(ImportService.markRow).toHaveBeenCalledWith(
      'job1',
      1,
      expect.anything(),
      expect.objectContaining({ error: expect.stringContaining('Name is required') })
    )
  })

  it('uses firstSheetMappings fallback when rows have no sheetName', async () => {
    const ImportService = require('../import.service').ImportService
    mockGetJob.mockResolvedValue({
      id: 'job1',
      rows: [
        {
          rowNumber: 1,
          payload: {
            sheetName: '',
            categoryId: 'cat1',
            row: { name: 'Product', brand: 'Sony', daily_price: 100 },
          },
        },
      ],
    })
    await processImportJob('job1')
    expect(mockMarkProcessing).toHaveBeenCalledWith('job1')
    expect(ImportService.markRow).toHaveBeenCalled()
  })

  it('passes approvedSuggestions to processImportJob', async () => {
    mockGetJob.mockResolvedValue({
      id: 'job1',
      rows: [
        {
          rowNumber: 1,
          payload: {
            sheetName: 'Sheet1',
            categoryId: 'cat1',
            excelRowNumber: 1,
            row: { name: 'Product', brand: 'Sony', daily_price: 100 },
          },
        },
      ],
    })
    await processImportJob('job1', {
      approvedSuggestions: [
        {
          sheetName: 'Sheet1',
          excelRowNumber: 1,
          aiSuggestions: {
            translations: { en: { name: 'Product EN', shortDescription: 'Desc', longDescription: 'Long' } },
          },
        },
      ],
    })
    expect(mockMarkProcessing).toHaveBeenCalled()
  })

  it('successfully creates product and marks row as SUCCESS', async () => {
    const ImportService = require('../import.service').ImportService
    const ProductCatalogService = require('../product-catalog.service').ProductCatalogService
    mockGetJob.mockResolvedValue({
      id: 'job1',
      createdBy: 'user1',
      rows: [
        {
          rowNumber: 1,
          payload: {
            sheetName: 'Sheet1',
            categoryId: 'cat1',
            row: {
              name: 'Sony FX3',
              brand: 'Sony',
              daily_price: 500,
            },
          },
        },
      ],
    })
    ProductCatalogService.create.mockResolvedValue({ id: 'prod1' })
    mockImportJobRowFindMany.mockResolvedValue([{ productId: 'prod1' }])

    await processImportJob('job1')

    expect(ProductCatalogService.create).toHaveBeenCalled()
    expect(ImportService.markRow).toHaveBeenCalledWith(
      'job1',
      1,
      'SUCCESS',
      expect.objectContaining({ productId: 'prod1' })
    )
    expect(mockMarkComplete).toHaveBeenCalledWith('job1')
  })

  it('handles duplicate SKU within file by generating fallback', async () => {
    const ProductCatalogService = require('../product-catalog.service').ProductCatalogService
    mockMapColumns.mockResolvedValue([
      { sourceHeader: 'name', mappedField: 'name', confidence: 90 },
      { sourceHeader: 'brand', mappedField: 'brand', confidence: 90 },
      { sourceHeader: 'daily_price', mappedField: 'daily_price', confidence: 90 },
      { sourceHeader: 'sku', mappedField: 'sku', confidence: 90 },
    ])
    mockGetJob.mockResolvedValue({
      id: 'job1',
      createdBy: 'user1',
      rows: [
        {
          rowNumber: 1,
          payload: {
            sheetName: 'Sheet1',
            categoryId: 'cat1',
            row: { name: 'Product A', brand: 'Sony', daily_price: 100, sku: 'DUP-001' },
          },
        },
        {
          rowNumber: 2,
          payload: {
            sheetName: 'Sheet1',
            categoryId: 'cat1',
            row: { name: 'Product B', brand: 'Sony', daily_price: 200, sku: 'DUP-001' },
          },
        },
      ],
    })
    mockGenerateUniqueSKU.mockResolvedValue('CAM-FALLBACK-001')
    ProductCatalogService.create.mockResolvedValue({ id: 'prod1' })
    ProductCatalogService.create.mockResolvedValueOnce({ id: 'prod1' }).mockResolvedValueOnce({ id: 'prod2' })
    mockImportJobRowFindMany.mockResolvedValue([{ productId: 'prod1' }, { productId: 'prod2' }])

    await processImportJob('job1')

    expect(mockGenerateUniqueSKU).toHaveBeenCalledTimes(1)
    expect(ProductCatalogService.create).toHaveBeenCalledWith(
      expect.objectContaining({ sku: 'CAM-FALLBACK-001' })
    )
    expect(ProductCatalogService.create).toHaveBeenCalledTimes(2)
  })

  it('handles column mapping failure for sheet gracefully', async () => {
    mockGetJob.mockResolvedValue({
      id: 'job1',
      rows: [
        {
          rowNumber: 1,
          payload: {
            sheetName: 'BadSheet',
            categoryId: 'cat1',
            row: { name: 'Product', brand: 'Sony', daily_price: 100 },
          },
        },
      ],
    })
    mockMapColumns.mockRejectedValueOnce(new Error('Mapping failed'))
    mockMapColumns.mockResolvedValue([
      { sourceHeader: 'name', mappedField: 'name', confidence: 90 },
      { sourceHeader: 'brand', mappedField: 'brand', confidence: 90 },
      { sourceHeader: 'daily_price', mappedField: 'daily_price', confidence: 90 },
    ])

    const ProductCatalogService = require('../product-catalog.service').ProductCatalogService
    ProductCatalogService.create.mockResolvedValue({ id: 'prod1' })
    mockImportJobRowFindMany.mockResolvedValue([{ productId: 'prod1' }])

    await processImportJob('job1')

    expect(mockMarkComplete).toHaveBeenCalled()
  })

  it('marks row as error when row processing throws', async () => {
    const ImportService = require('../import.service').ImportService
    const ProductCatalogService = require('../product-catalog.service').ProductCatalogService
    mockGetJob.mockResolvedValue({
      id: 'job1',
      rows: [
        {
          rowNumber: 1,
          payload: {
            sheetName: 'Sheet1',
            categoryId: 'cat1',
            row: { name: 'Product', brand: 'Sony', daily_price: 100 },
          },
        },
      ],
    })
    ProductCatalogService.create.mockRejectedValue(new Error('DB constraint failed'))
    mockImportJobRowFindMany.mockResolvedValue([])

    await processImportJob('job1')

    expect(ImportService.markRow).toHaveBeenCalledWith(
      'job1',
      1,
      'ERROR',
      expect.objectContaining({ error: expect.any(String) })
    )
  })

  it('marks row error when ensureBrand upsert throws and findUnique returns null', async () => {
    const ImportService = require('../import.service').ImportService
    mockBrandUpsert.mockRejectedValue(new Error('DB error'))
    mockBrandFindUnique.mockResolvedValue(null)
    mockGetJob.mockResolvedValue({
      id: 'job1',
      createdBy: 'user1',
      rows: [
        {
          rowNumber: 1,
          payload: {
            sheetName: 'Sheet1',
            categoryId: 'cat1',
            row: { name: 'Product', brand: 'Sony', daily_price: 100 },
          },
        },
      ],
    })
    mockImportJobRowFindMany.mockResolvedValue([])

    await processImportJob('job1')

    expect(ImportService.markRow).toHaveBeenCalledWith(
      'job1',
      1,
      'ERROR',
      expect.objectContaining({ error: 'DB error' })
    )
  })

  it('uses ensureBrand fallback when upsert throws', async () => {
    const ProductCatalogService = require('../product-catalog.service').ProductCatalogService
    mockBrandUpsert.mockRejectedValueOnce(new Error('Unique constraint'))
    mockBrandFindUnique.mockResolvedValueOnce({ id: 'brand1' })
    mockGetJob.mockResolvedValue({
      id: 'job1',
      createdBy: 'user1',
      rows: [
        {
          rowNumber: 1,
          payload: {
            sheetName: 'Sheet1',
            categoryId: 'cat1',
            row: { name: 'Product', brand: 'Sony', daily_price: 100 },
          },
        },
      ],
    })
    ProductCatalogService.create.mockResolvedValue({ id: 'prod1' })
    mockImportJobRowFindMany.mockResolvedValue([{ productId: 'prod1' }])

    await processImportJob('job1')

    expect(ProductCatalogService.create).toHaveBeenCalled()
    expect(mockBrandFindUnique).toHaveBeenCalledWith({ where: { name: 'Sony' } })
  })

  it('uses curated specs when lookupDeepSpecs returns match', async () => {
    const ProductCatalogService = require('../product-catalog.service').ProductCatalogService
    mockLookupDeepSpecs.mockReturnValue({
      matchedModel: 'Sony FX3',
      confidence: 80,
      specs: { sensor: 'Full Frame', resolution: '4K' },
    })
    mockGetJob.mockResolvedValue({
      id: 'job1',
      createdBy: 'user1',
      rows: [
        {
          rowNumber: 1,
          payload: {
            sheetName: 'Sheet1',
            categoryId: 'cat1',
            row: { name: 'Sony FX3', brand: 'Sony', daily_price: 500 },
          },
        },
      ],
    })
    ProductCatalogService.create.mockResolvedValue({ id: 'prod1' })
    mockImportJobRowFindMany.mockResolvedValue([{ productId: 'prod1' }])

    await processImportJob('job1')

    expect(ProductCatalogService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        translations: expect.arrayContaining([
          expect.objectContaining({
            specifications: { sensor: 'Full Frame', resolution: '4K' },
          }),
        ]),
      })
    )
  })

  it('throws when specifications JSON is invalid', async () => {
    const ImportService = require('../import.service').ImportService
    mockMapColumns.mockResolvedValue([
      { sourceHeader: 'name', mappedField: 'name', confidence: 90 },
      { sourceHeader: 'brand', mappedField: 'brand', confidence: 90 },
      { sourceHeader: 'daily_price', mappedField: 'daily_price', confidence: 90 },
      { sourceHeader: 'specifications', mappedField: 'specifications', confidence: 90 },
    ])
    mockGetJob.mockResolvedValue({
      id: 'job1',
      rows: [
        {
          rowNumber: 1,
          payload: {
            sheetName: 'Sheet1',
            categoryId: 'cat1',
            row: {
              name: 'Product',
              brand: 'Sony',
              daily_price: 100,
              specifications: 'invalid json',
            },
          },
        },
      ],
    })

    await processImportJob('job1')

    expect(ImportService.markRow).toHaveBeenCalledWith(
      'job1',
      1,
      'ERROR',
      expect.objectContaining({ error: expect.stringContaining('Specifications JSON invalid') })
    )
  })

  it('uses specs from Excel when valid JSON', async () => {
    const ProductCatalogService = require('../product-catalog.service').ProductCatalogService
    mockMapColumns.mockResolvedValue([
      { sourceHeader: 'name', mappedField: 'name', confidence: 90 },
      { sourceHeader: 'brand', mappedField: 'brand', confidence: 90 },
      { sourceHeader: 'daily_price', mappedField: 'daily_price', confidence: 90 },
      { sourceHeader: 'specifications', mappedField: 'specifications', confidence: 90 },
    ])
    mockGetJob.mockResolvedValue({
      id: 'job1',
      createdBy: 'user1',
      rows: [
        {
          rowNumber: 1,
          payload: {
            sheetName: 'Sheet1',
            categoryId: 'cat1',
            row: {
              name: 'Product',
              brand: 'Sony',
              daily_price: 100,
              specifications: '{"sensor":"APS-C","weight":"500g"}',
            },
          },
        },
      ],
    })
    ProductCatalogService.create.mockResolvedValue({ id: 'prod1' })
    mockImportJobRowFindMany.mockResolvedValue([{ productId: 'prod1' }])

    await processImportJob('job1')

    expect(ProductCatalogService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        translations: expect.arrayContaining([
          expect.objectContaining({
            specifications: { sensor: 'APS-C', weight: '500g' },
          }),
        ]),
      })
    )
  })

  it('uses suggestion specifications, boxContents, tags', async () => {
    const ProductCatalogService = require('../product-catalog.service').ProductCatalogService
    mockGetJob.mockResolvedValue({
      id: 'job1',
      createdBy: 'user1',
      rows: [
        {
          rowNumber: 1,
          payload: {
            sheetName: 'Sheet1',
            categoryId: 'cat1',
            excelRowNumber: 1,
            row: { name: 'Product', brand: 'Sony', daily_price: 100 },
          },
        },
      ],
    })
    ProductCatalogService.create.mockResolvedValue({ id: 'prod1' })
    mockImportJobRowFindMany.mockResolvedValue([{ productId: 'prod1' }])

    await processImportJob('job1', {
      approvedSuggestions: [
        {
          sheetName: 'Sheet1',
          excelRowNumber: 1,
          aiSuggestions: {
            specifications: { resolution: '4K' },
            boxContents: 'Camera, battery, charger',
            tags: 'cinema,professional',
          },
        },
      ],
    })

    expect(ProductCatalogService.create).toHaveBeenCalled()
  })

  it('adds AR and ZH translations when name_ar and name_zh provided', async () => {
    const ProductCatalogService = require('../product-catalog.service').ProductCatalogService
    mockMapColumns.mockResolvedValue([
      { sourceHeader: 'name', mappedField: 'name', confidence: 90 },
      { sourceHeader: 'brand', mappedField: 'brand', confidence: 90 },
      { sourceHeader: 'daily_price', mappedField: 'daily_price', confidence: 90 },
      { sourceHeader: 'name_ar', mappedField: 'name_ar', confidence: 90 },
      { sourceHeader: 'name_zh', mappedField: 'name_zh', confidence: 90 },
    ])
    mockGetJob.mockResolvedValue({
      id: 'job1',
      createdBy: 'user1',
      rows: [
        {
          rowNumber: 1,
          payload: {
            sheetName: 'Sheet1',
            categoryId: 'cat1',
            row: {
              name: 'Product',
              brand: 'Sony',
              daily_price: 100,
              name_ar: 'منتج',
              name_zh: '产品',
            },
          },
        },
      ],
    })
    ProductCatalogService.create.mockResolvedValue({ id: 'prod1' })
    mockImportJobRowFindMany.mockResolvedValue([{ productId: 'prod1' }])

    await processImportJob('job1')

    const createCall = ProductCatalogService.create.mock.calls[0][0]
    expect(createCall.translations).toHaveLength(3)
    expect(createCall.translations.map((t: { locale: string }) => t.locale)).toContain('ar')
    expect(createCall.translations.map((t: { locale: string }) => t.locale)).toContain('zh')
  })

  it('uses barcode from Barcode key and updates existing product', async () => {
    const ImportService = require('../import.service').ImportService
    const ProductCatalogService = require('../product-catalog.service').ProductCatalogService
    mockMapColumns.mockResolvedValue([
      { sourceHeader: 'name', mappedField: 'name', confidence: 90 },
      { sourceHeader: 'brand', mappedField: 'brand', confidence: 90 },
      { sourceHeader: 'daily_price', mappedField: 'daily_price', confidence: 90 },
    ])
    mockGetJob.mockResolvedValue({
      id: 'job1',
      createdBy: 'user1',
      rows: [
        {
          rowNumber: 1,
          payload: {
            sheetName: 'Sheet1',
            categoryId: 'cat1',
            row: { name: 'Product', brand: 'Sony', daily_price: 100, Barcode: '123456789' },
          },
        },
      ],
    })
    mockInventoryItemFindFirst.mockResolvedValue({
      id: 'inv1',
      parentProductId: 'prod-existing',
      deletedAt: null,
    })
    mockProductFindUnique.mockResolvedValue({ id: 'prod-existing', deletedAt: null })
    ProductCatalogService.update.mockResolvedValue({ id: 'prod-existing' })
    mockImportJobRowFindMany.mockResolvedValue([{ productId: 'prod-existing' }])

    await processImportJob('job1')

    expect(ProductCatalogService.update).toHaveBeenCalledWith('prod-existing', expect.any(Object))
    expect(ImportService.markRow).toHaveBeenCalledWith(
      'job1',
      1,
      'SUCCESS',
      expect.objectContaining({ productId: 'prod-existing' })
    )
    expect(ProductCatalogService.create).not.toHaveBeenCalled()
  })

  it('restores soft-deleted product when barcode exists', async () => {
    const ProductCatalogService = require('../product-catalog.service').ProductCatalogService
    mockGetJob.mockResolvedValue({
      id: 'job1',
      createdBy: 'user1',
      rows: [
        {
          rowNumber: 1,
          payload: {
            sheetName: 'Sheet1',
            categoryId: 'cat1',
            row: { name: 'Product', brand: 'Sony', daily_price: 100, barcode: '999' },
          },
        },
      ],
    })
    mockInventoryItemFindFirst.mockResolvedValue({
      id: 'inv1',
      parentProductId: 'prod-deleted',
      deletedAt: null,
    })
    mockProductFindUnique.mockResolvedValue({ id: 'prod-deleted', deletedAt: new Date() })
    mockProductUpdate.mockResolvedValue({})
    ProductCatalogService.update.mockResolvedValue({ id: 'prod-deleted' })
    mockImportJobRowFindMany.mockResolvedValue([{ productId: 'prod-deleted' }])

    await processImportJob('job1')

    expect(mockProductUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'prod-deleted' },
        data: { deletedAt: null, deletedBy: null },
      })
    )
    expect(ProductCatalogService.update).toHaveBeenCalled()
  })

  it('handles SKU duplicate in DB by generating fallback', async () => {
    const ProductCatalogService = require('../product-catalog.service').ProductCatalogService
    const { ValidationError } = require('@/lib/errors')
    mockGetJob.mockResolvedValue({
      id: 'job1',
      createdBy: 'user1',
      rows: [
        {
          rowNumber: 1,
          payload: {
            sheetName: 'Sheet1',
            categoryId: 'cat1',
            row: { name: 'Product', brand: 'Sony', daily_price: 100, sku: 'EXISTING-SKU' },
          },
        },
      ],
    })
    ProductCatalogService.create
      .mockRejectedValueOnce(new ValidationError('SKU already exists'))
      .mockResolvedValueOnce({ id: 'prod1' })
    mockGenerateUniqueSKU.mockResolvedValue('CAM-FALLBACK-001')
    mockImportJobRowFindMany.mockResolvedValue([{ productId: 'prod1' }])

    await processImportJob('job1')

    expect(ProductCatalogService.create).toHaveBeenCalledTimes(2)
    expect(mockGenerateUniqueSKU).toHaveBeenCalled()
  })

  it('handles Barcode already exists on create by updating product', async () => {
    const ProductCatalogService = require('../product-catalog.service').ProductCatalogService
    const { ValidationError } = require('@/lib/errors')
    mockGetJob.mockResolvedValue({
      id: 'job1',
      createdBy: 'user1',
      rows: [
        {
          rowNumber: 1,
          payload: {
            sheetName: 'Sheet1',
            categoryId: 'cat1',
            row: { name: 'Product', brand: 'Sony', daily_price: 100, barcode: 'BARCODE-123' },
          },
        },
      ],
    })
    mockInventoryItemFindFirst.mockResolvedValue(null)
    ProductCatalogService.create.mockRejectedValueOnce(new ValidationError('Barcode already exists'))
    mockInventoryItemFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'inv1',
        parentProductId: 'prod-existing',
        deletedAt: null,
      })
    mockProductFindUnique.mockResolvedValue({ id: 'prod-existing', deletedAt: null })
    ProductCatalogService.update.mockResolvedValue({ id: 'prod-existing' })
    mockImportJobRowFindMany.mockResolvedValue([{ productId: 'prod-existing' }])

    await processImportJob('job1')

    expect(ProductCatalogService.update).toHaveBeenCalledWith('prod-existing', expect.any(Object))
    expect(ProductCatalogService.create).toHaveBeenCalledTimes(1)
  })

  it('restores product and inventory when Barcode exists and both were soft-deleted', async () => {
    const ProductCatalogService = require('../product-catalog.service').ProductCatalogService
    const { ValidationError } = require('@/lib/errors')
    mockGetJob.mockResolvedValue({
      id: 'job1',
      createdBy: 'user1',
      rows: [
        {
          rowNumber: 1,
          payload: {
            sheetName: 'Sheet1',
            categoryId: 'cat1',
            row: { name: 'Product', brand: 'Sony', daily_price: 100, barcode: 'RESTORE-ME' },
          },
        },
      ],
    })
    ProductCatalogService.create.mockRejectedValueOnce(new ValidationError('Barcode already exists'))
    mockInventoryItemFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'inv1',
        parentProductId: 'prod-deleted',
        deletedAt: new Date('2025-01-01'),
      })
    mockProductFindUnique.mockResolvedValue({ id: 'prod-deleted', deletedAt: new Date('2025-01-01') })
    mockProductUpdate.mockResolvedValue({})
    mockInventoryItemUpdate.mockResolvedValue({})
    ProductCatalogService.update.mockResolvedValue({ id: 'prod-deleted' })
    mockImportJobRowFindMany.mockResolvedValue([{ productId: 'prod-deleted' }])

    await processImportJob('job1')

    expect(mockProductUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'prod-deleted' },
        data: { deletedAt: null, deletedBy: null },
      })
    )
    expect(mockInventoryItemUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: 'inv1' }),
        data: { deletedAt: null, deletedBy: null },
      })
    )
    expect(ProductCatalogService.update).toHaveBeenCalled()
  })

  it('marks row error when Barcode already exists but existingItem not found', async () => {
    const ImportService = require('../import.service').ImportService
    const ProductCatalogService = require('../product-catalog.service').ProductCatalogService
    const { ValidationError } = require('@/lib/errors')
    mockGetJob.mockResolvedValue({
      id: 'job1',
      createdBy: 'user1',
      rows: [
        {
          rowNumber: 1,
          payload: {
            sheetName: 'Sheet1',
            categoryId: 'cat1',
            row: { name: 'Product', brand: 'Sony', daily_price: 100, barcode: 'ORPHAN-BARCODE' },
          },
        },
      ],
    })
    ProductCatalogService.create.mockRejectedValue(new ValidationError('Barcode already exists'))
    mockInventoryItemFindFirst.mockResolvedValue(null)
    mockImportJobRowFindMany.mockResolvedValue([])

    await processImportJob('job1')

    expect(ImportService.markRow).toHaveBeenCalledWith(
      'job1',
      1,
      'ERROR',
      expect.objectContaining({ error: 'Barcode already exists' })
    )
  })

  it('handles syncProductToEquipment failure gracefully', async () => {
    const syncProductToEquipment = require('../product-equipment-sync.service').syncProductToEquipment
    mockGetJob.mockResolvedValue({
      id: 'job1',
      createdBy: 'user1',
      rows: [
        {
          rowNumber: 1,
          payload: {
            sheetName: 'Sheet1',
            categoryId: 'cat1',
            row: { name: 'Product', brand: 'Sony', daily_price: 100 },
          },
        },
      ],
    })
    const ProductCatalogService = require('../product-catalog.service').ProductCatalogService
    ProductCatalogService.create.mockResolvedValue({ id: 'prod1' })
    mockImportJobRowFindMany.mockResolvedValue([{ productId: 'prod1' }])
    syncProductToEquipment.mockRejectedValueOnce(new Error('Sync failed'))

    await processImportJob('job1')

    expect(mockMarkComplete).toHaveBeenCalled()
  })

  it('uses gallery as array and boxContents as array', async () => {
    const ProductCatalogService = require('../product-catalog.service').ProductCatalogService
    mockMapColumns.mockResolvedValue([
      { sourceHeader: 'name', mappedField: 'name', confidence: 90 },
      { sourceHeader: 'brand', mappedField: 'brand', confidence: 90 },
      { sourceHeader: 'daily_price', mappedField: 'daily_price', confidence: 90 },
      { sourceHeader: 'gallery', mappedField: 'gallery', confidence: 90 },
      { sourceHeader: 'box_contents', mappedField: 'box_contents', confidence: 90 },
    ])
    mockGetJob.mockResolvedValue({
      id: 'job1',
      createdBy: 'user1',
      rows: [
        {
          rowNumber: 1,
          payload: {
            sheetName: 'Sheet1',
            categoryId: 'cat1',
            row: {
              name: 'Product',
              brand: 'Sony',
              daily_price: 100,
              gallery: ['img1.jpg', 'img2.jpg'],
              box_contents: ['item1', 'item2'],
            },
          },
        },
      ],
    })
    ProductCatalogService.create.mockResolvedValue({ id: 'prod1' })
    mockImportJobRowFindMany.mockResolvedValue([{ productId: 'prod1' }])

    await processImportJob('job1')

    const createCall = ProductCatalogService.create.mock.calls[0][0]
    expect(createCall.galleryImages).toEqual(['img1.jpg', 'img2.jpg'])
    expect(createCall.boxContents).toContain('item1')
  })

  it('uses gallery as comma-separated string', async () => {
    const ProductCatalogService = require('../product-catalog.service').ProductCatalogService
    mockMapColumns.mockResolvedValue([
      { sourceHeader: 'name', mappedField: 'name', confidence: 90 },
      { sourceHeader: 'brand', mappedField: 'brand', confidence: 90 },
      { sourceHeader: 'daily_price', mappedField: 'daily_price', confidence: 90 },
      { sourceHeader: 'gallery', mappedField: 'gallery', confidence: 90 },
    ])
    mockGetJob.mockResolvedValue({
      id: 'job1',
      createdBy: 'user1',
      rows: [
        {
          rowNumber: 1,
          payload: {
            sheetName: 'Sheet1',
            categoryId: 'cat1',
            row: {
              name: 'Product',
              brand: 'Sony',
              daily_price: 100,
              gallery: 'img1.jpg, img2.jpg',
            },
          },
        },
      ],
    })
    ProductCatalogService.create.mockResolvedValue({ id: 'prod1' })
    mockImportJobRowFindMany.mockResolvedValue([{ productId: 'prod1' }])

    await processImportJob('job1')

    const createCall = ProductCatalogService.create.mock.calls[0][0]
    expect(createCall.galleryImages).toEqual(['img1.jpg', 'img2.jpg'])
  })

  it('uses barcode from key containing barcode (ProductBarcode)', async () => {
    const ProductCatalogService = require('../product-catalog.service').ProductCatalogService
    mockMapColumns.mockResolvedValue([
      { sourceHeader: 'name', mappedField: 'name', confidence: 90 },
      { sourceHeader: 'brand', mappedField: 'brand', confidence: 90 },
      { sourceHeader: 'daily_price', mappedField: 'daily_price', confidence: 90 },
    ])
    mockGetJob.mockResolvedValue({
      id: 'job1',
      createdBy: 'user1',
      rows: [
        {
          rowNumber: 1,
          payload: {
            sheetName: 'Sheet1',
            categoryId: 'cat1',
            row: { name: 'Product', brand: 'Sony', daily_price: 100, ProductBarcode: 'BAR-999' },
          },
        },
      ],
    })
    ProductCatalogService.create.mockResolvedValue({ id: 'prod1' })
    mockImportJobRowFindMany.mockResolvedValue([{ productId: 'prod1' }])

    await processImportJob('job1')

    const createCall = ProductCatalogService.create.mock.calls[0][0]
    expect(createCall.inventoryItems).toHaveLength(1)
    expect(createCall.inventoryItems[0].barcode).toBe('BAR-999')
  })

  it('uses barcode from UPC key', async () => {
    const ProductCatalogService = require('../product-catalog.service').ProductCatalogService
    mockMapColumns.mockResolvedValue([
      { sourceHeader: 'name', mappedField: 'name', confidence: 90 },
      { sourceHeader: 'brand', mappedField: 'brand', confidence: 90 },
      { sourceHeader: 'daily_price', mappedField: 'daily_price', confidence: 90 },
    ])
    mockGetJob.mockResolvedValue({
      id: 'job1',
      createdBy: 'user1',
      rows: [
        {
          rowNumber: 1,
          payload: {
            sheetName: 'Sheet1',
            categoryId: 'cat1',
            row: { name: 'Product', brand: 'Sony', daily_price: 100, UPC: '123456789012' },
          },
        },
      ],
    })
    ProductCatalogService.create.mockResolvedValue({ id: 'prod1' })
    mockImportJobRowFindMany.mockResolvedValue([{ productId: 'prod1' }])

    await processImportJob('job1')

    const createCall = ProductCatalogService.create.mock.calls[0][0]
    expect(createCall.inventoryItems).toHaveLength(1)
    expect(createCall.inventoryItems[0].barcode).toBe('123456789012')
  })

  it('restores deleted inventory item when barcode exists', async () => {
    const ProductCatalogService = require('../product-catalog.service').ProductCatalogService
    mockGetJob.mockResolvedValue({
      id: 'job1',
      createdBy: 'user1',
      rows: [
        {
          rowNumber: 1,
          payload: {
            sheetName: 'Sheet1',
            categoryId: 'cat1',
            row: { name: 'Product', brand: 'Sony', daily_price: 100, barcode: 'DEL-123' },
          },
        },
      ],
    })
    mockInventoryItemFindFirst.mockResolvedValue({
      id: 'inv-deleted',
      parentProductId: 'prod1',
      deletedAt: new Date(),
    })
    mockProductFindUnique.mockResolvedValue({ id: 'prod1', deletedAt: null })
    mockInventoryItemUpdate.mockResolvedValue({})
    ProductCatalogService.update.mockResolvedValue({ id: 'prod1' })
    mockImportJobRowFindMany.mockResolvedValue([{ productId: 'prod1' }])

    await processImportJob('job1')

    expect(mockInventoryItemUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'inv-deleted' },
        data: { deletedAt: null, deletedBy: null },
      })
    )
  })

  it('runs AI queue successfully when Redis available', async () => {
    mockAddAIProcessingJob.mockResolvedValue(undefined)
    mockAddImageProcessingJob.mockResolvedValue(undefined)
    mockRebuildRelatedProducts.mockResolvedValue(undefined)

    mockGetJob.mockResolvedValue({
      id: 'job1',
      createdBy: 'user1',
      rows: [
        {
          rowNumber: 1,
          payload: {
            sheetName: 'Sheet1',
            categoryId: 'cat1',
            row: { name: 'Product', brand: 'Sony', daily_price: 100 },
          },
        },
      ],
    })
    const ProductCatalogService = require('../product-catalog.service').ProductCatalogService
    ProductCatalogService.create.mockResolvedValue({ id: 'prod1' })
    mockImportJobRowFindMany.mockResolvedValue([{ productId: 'prod1' }])

    await processImportJob('job1')

    expect(mockAddAIProcessingJob).toHaveBeenCalledWith('job1', ['prod1'])
    expect(mockRunMasterFill).not.toHaveBeenCalled()
  })

  it('runs AI queue and image queue when available', async () => {
    mockAddAIProcessingJob.mockResolvedValueOnce(undefined)
    mockAddImageProcessingJob.mockResolvedValueOnce(undefined)
    mockRebuildRelatedProducts.mockResolvedValueOnce(undefined)

    mockGetJob.mockResolvedValue({
      id: 'job1',
      createdBy: 'user1',
      rows: [
        {
          rowNumber: 1,
          payload: {
            sheetName: 'Sheet1',
            categoryId: 'cat1',
            row: { name: 'Product', brand: 'Sony', daily_price: 100 },
          },
        },
      ],
    })
    const ProductCatalogService = require('../product-catalog.service').ProductCatalogService
    ProductCatalogService.create.mockResolvedValue({ id: 'prod1' })
    mockImportJobRowFindMany.mockResolvedValue([{ productId: 'prod1' }])

    await processImportJob('job1')

    expect(mockAddAIProcessingJob).toHaveBeenCalledWith('job1', ['prod1'])
    expect(mockAddImageProcessingJob).toHaveBeenCalledWith('job1', ['prod1'])
    expect(mockRebuildRelatedProducts).toHaveBeenCalledWith(['prod1'], 5)
  })

  it('runs runMasterFill successfully when AI queue fails', async () => {
    mockAddAIProcessingJob.mockRejectedValue(new Error('Redis down'))
    mockRunMasterFill.mockResolvedValueOnce({
      fieldsGenerated: 5,
      photosFound: 2,
      score: 85,
    })

    mockGetJob.mockResolvedValue({
      id: 'job1',
      createdBy: 'user1',
      rows: [
        {
          rowNumber: 1,
          payload: {
            sheetName: 'Sheet1',
            categoryId: 'cat1',
            row: { name: 'Product', brand: 'Sony', daily_price: 100 },
          },
        },
      ],
    })
    const ProductCatalogService = require('../product-catalog.service').ProductCatalogService
    ProductCatalogService.create.mockResolvedValue({ id: 'prod1' })
    mockImportJobRowFindMany.mockResolvedValue([{ productId: 'prod1' }])

    await processImportJob('job1')

    expect(mockRunMasterFill).toHaveBeenCalledWith('prod1')
  })

  it('falls back to inferMissingSpecs when runMasterFill fails', async () => {
    mockAddAIProcessingJob.mockRejectedValue(new Error('Redis down'))
    mockRunMasterFill.mockRejectedValue(new Error('Master fill failed'))
    mockProductFindUnique.mockResolvedValue({
      id: 'prod1',
      sku: 'CAM-1',
      translations: [
        { locale: 'en', name: 'Product', specifications: {}, shortDescription: '', longDescription: '' },
      ],
      category: { name: 'Cameras' },
      brand: { name: 'Sony' },
      boxContents: null,
    })
    mockInferMissingSpecs.mockResolvedValueOnce({
      specs: [{ key: 'sensor', value: 'Full Frame' }],
    })

    mockGetJob.mockResolvedValue({
      id: 'job1',
      createdBy: 'user1',
      rows: [
        {
          rowNumber: 1,
          payload: {
            sheetName: 'Sheet1',
            categoryId: 'cat1',
            row: { name: 'Product', brand: 'Sony', daily_price: 100 },
          },
        },
      ],
    })
    const ProductCatalogService = require('../product-catalog.service').ProductCatalogService
    ProductCatalogService.create.mockResolvedValue({ id: 'prod1' })
    mockImportJobRowFindMany.mockResolvedValue([{ productId: 'prod1' }])

    await processImportJob('job1')

    expect(mockInferMissingSpecs).toHaveBeenCalled()
    expect(mockProductTranslationUpdateMany).toHaveBeenCalled()
  })

  it('uses boxContents from curatedMatch when not in row', async () => {
    const ProductCatalogService = require('../product-catalog.service').ProductCatalogService
    mockLookupDeepSpecs.mockReturnValue({
      matchedModel: 'Sony FX3',
      confidence: 80,
      specs: null,
      boxContents: ['Camera body', 'Battery', 'Charger'],
    })
    mockGetJob.mockResolvedValue({
      id: 'job1',
      createdBy: 'user1',
      rows: [
        {
          rowNumber: 1,
          payload: {
            sheetName: 'Sheet1',
            categoryId: 'cat1',
            row: { name: 'Sony FX3', brand: 'Sony', daily_price: 500 },
          },
        },
      ],
    })
    ProductCatalogService.create.mockResolvedValue({ id: 'prod1' })
    mockImportJobRowFindMany.mockResolvedValue([{ productId: 'prod1' }])

    await processImportJob('job1')

    const createCall = ProductCatalogService.create.mock.calls[0][0]
    expect(createCall.boxContents).toBe('Camera body, Battery, Charger')
  })

  it('uses resolveField trimmed key when exact match empty', async () => {
    const ProductCatalogService = require('../product-catalog.service').ProductCatalogService
    mockMapColumns.mockResolvedValue([
      { sourceHeader: 'name', mappedField: 'name', confidence: 90 },
      { sourceHeader: 'brand', mappedField: 'brand', confidence: 90 },
      { sourceHeader: '  Daily Price  ', mappedField: 'daily_price', confidence: 90 },
    ])
    mockGetJob.mockResolvedValue({
      id: 'job1',
      createdBy: 'user1',
      rows: [
        {
          rowNumber: 1,
          payload: {
            sheetName: 'Sheet1',
            categoryId: 'cat1',
            row: { name: 'Product', brand: 'Sony', 'Daily Price': 150 },
          },
        },
      ],
    })
    ProductCatalogService.create.mockResolvedValue({ id: 'prod1' })
    mockImportJobRowFindMany.mockResolvedValue([{ productId: 'prod1' }])

    await processImportJob('job1')

    const createCall = ProductCatalogService.create.mock.calls[0][0]
    expect(createCall.priceDaily).toBe(150)
  })

  it('uses custom column header for daily_price', async () => {
    const ProductCatalogService = require('../product-catalog.service').ProductCatalogService
    mockMapColumns.mockResolvedValue([
      { sourceHeader: 'Daily Price', mappedField: 'daily_price', confidence: 90 },
      { sourceHeader: 'name', mappedField: 'name', confidence: 90 },
      { sourceHeader: 'brand', mappedField: 'brand', confidence: 90 },
    ])
    mockGetJob.mockResolvedValue({
      id: 'job1',
      createdBy: 'user1',
      rows: [
        {
          rowNumber: 1,
          payload: {
            sheetName: 'Sheet1',
            categoryId: 'cat1',
            row: {
              name: 'Product',
              brand: 'Sony',
              'Daily Price': 150,
            },
          },
        },
      ],
    })
    ProductCatalogService.create.mockResolvedValue({ id: 'prod1' })
    mockImportJobRowFindMany.mockResolvedValue([{ productId: 'prod1' }])

    await processImportJob('job1')

    const createCall = ProductCatalogService.create.mock.calls[0][0]
    expect(createCall.priceDaily).toBe(150)
  })
})

export {}
