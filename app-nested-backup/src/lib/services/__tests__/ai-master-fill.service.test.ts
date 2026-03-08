/**
 * Unit tests for ai-master-fill.service
 * PATHS: runMasterFill (product not found → throw; product found → generateMasterFill, sourceImages, persist, sync, return AiFillResult)
 */

import { runMasterFill } from '../ai-master-fill.service'
import { prisma } from '@/lib/db/prisma'

const mockTx = {
  product: { update: jest.fn().mockResolvedValue({}) },
  productTranslation: { upsert: jest.fn().mockResolvedValue({}) },
}

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    product: { findUnique: jest.fn() },
    brand: { upsert: jest.fn(), findFirst: jest.fn(), create: jest.fn() },
    category: { findFirst: jest.fn() },
    $transaction: jest.fn((cb: (tx: unknown) => Promise<unknown>) =>
      Promise.resolve(cb(mockTx))
    ),
  },
}))

const mockGenerateMasterFill = jest.fn()
jest.mock('../ai-content-generation.service', () => ({
  generateMasterFill: (...args: unknown[]) => mockGenerateMasterFill(...args),
}))

const mockSourceImages = jest.fn()
jest.mock('../image-sourcing.service', () => ({
  sourceImages: (...args: unknown[]) => mockSourceImages(...args),
}))

const mockSyncProductToEquipment = jest.fn()
jest.mock('../product-equipment-sync.service', () => ({
  syncProductToEquipment: (...args: unknown[]) => mockSyncProductToEquipment(...args),
}))

const mockFindUnique = prisma.product.findUnique as jest.Mock
const mockCategoryFindFirst = prisma.category.findFirst as jest.Mock
const mockBrandUpsert = prisma.brand.upsert as jest.Mock
const mockBrandFindFirst = prisma.brand.findFirst as jest.Mock
const mockBrandCreate = prisma.brand.create as jest.Mock

const baseProduct = {
  id: 'prod-1',
  sku: 'SKU1',
  boxContents: null as string | null,
  tags: null as string | null,
  featuredImage: null as string | null,
  galleryImages: null as string[] | null,
  priceDaily: 100,
  translations: [
    { locale: 'en', name: 'Camera', shortDescription: null, longDescription: null, seoTitle: null, seoDescription: null, seoKeywords: null, specifications: null },
    { locale: 'ar', name: null, shortDescription: null, longDescription: null, seoTitle: null, seoDescription: null, seoKeywords: null, specifications: null },
    { locale: 'zh', name: null, shortDescription: null, longDescription: null, seoTitle: null, seoDescription: null, seoKeywords: null, specifications: null },
  ],
  category: { id: 'cat-1', name: 'Cameras' },
  brand: { id: 'brand-1', name: 'Sony' },
}

const baseAiContent = {
  name: 'Product',
  short_desc_en: 'Short desc',
  long_desc_en: 'Long description over 100 chars for validation to pass correctly and ensure quality content.',
  seo_title_en: 'SEO Title',
  seo_desc_en: 'SEO description for the product page.',
  seo_keywords_en: 'camera, rental, cinema',
  name_ar: 'منتج',
  short_desc_ar: 'وصف قصير',
  long_desc_ar: 'وصف طويل يتجاوز 80 حرفاً للتحقق من صحة المحتوى.',
  seo_title_ar: 'عنوان',
  seo_desc_ar: 'وصف',
  seo_keywords_ar: 'كاميرا',
  name_zh: '产品',
  short_desc_zh: '短描述',
  long_desc_zh: '长描述',
  seo_title_zh: '标题',
  seo_desc_zh: '描述',
  seo_keywords_zh: '相机',
  specifications: { resolution: '4K', sensor: 'Super 35' },
  tags: 'tag1,tag2,tag3,tag4,tag5',
  _needs_review: false,
}

describe('ai-master-fill.service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGenerateMasterFill.mockResolvedValue(baseAiContent)
    mockSourceImages.mockResolvedValue([])
    mockSyncProductToEquipment.mockResolvedValue(undefined)
    mockCategoryFindFirst.mockResolvedValue({ id: 'cat-1', name: 'Cameras' })
    mockBrandUpsert.mockResolvedValue({ id: 'brand-1', name: 'Sony' })
  })

  describe('runMasterFill', () => {
    it('throws when product not found', async () => {
      mockFindUnique.mockResolvedValue(null)
      await expect(runMasterFill('missing-id')).rejects.toThrow(/Product not found/)
    })

    it('returns AiFillResult when product exists and pipeline runs', async () => {
      mockFindUnique.mockResolvedValue(baseProduct)
      const result = await runMasterFill('prod-1')
      expect(result).toMatchObject({
        productId: 'prod-1',
        fieldsGenerated: expect.any(Number),
        needsReview: false,
        brand: 'Sony',
        category: 'Cameras',
        score: expect.any(Number),
      })
    })

    it('uses fallback category when no categorySuggestion', async () => {
      mockFindUnique.mockResolvedValue(baseProduct)
      mockGenerateMasterFill.mockResolvedValue({ ...baseAiContent, category_suggestion: null })
      mockCategoryFindFirst.mockResolvedValueOnce({ id: 'fallback-1', name: 'Default' })
      const result = await runMasterFill('prod-1')
      expect(result.category).toBe('Default')
    })

    it('uses exactMatch when category leaf matches', async () => {
      mockFindUnique.mockResolvedValue(baseProduct)
      mockGenerateMasterFill.mockResolvedValue({ ...baseAiContent, category_suggestion: 'Parent > Cameras' })
      mockCategoryFindFirst.mockResolvedValueOnce({ id: 'exact-1', name: 'Cameras' })
      const result = await runMasterFill('prod-1')
      expect(result.category).toBe('Cameras')
    })

    it('uses fuzzyMatch when exact fails', async () => {
      mockFindUnique.mockResolvedValue(baseProduct)
      mockGenerateMasterFill.mockResolvedValue({ ...baseAiContent, category_suggestion: 'Parent > Cam' })
      mockCategoryFindFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'fuzzy-1', name: 'Cameras' })
      const result = await runMasterFill('prod-1')
      expect(result.category).toBe('Cameras')
    })

    it('uses ensureBrand fallback when upsert throws', async () => {
      mockFindUnique.mockResolvedValue(baseProduct)
      mockBrandUpsert.mockRejectedValueOnce(new Error('Unique constraint'))
      mockBrandFindFirst.mockResolvedValueOnce({ id: 'found-1', name: 'Sony' })
      const result = await runMasterFill('prod-1')
      expect(result.brand).toBe('Sony')
    })

    it('creates brand with slug+timestamp when findFirst returns null', async () => {
      mockFindUnique.mockResolvedValue(baseProduct)
      mockGenerateMasterFill.mockResolvedValue({ ...baseAiContent, brand: 'NewBrand' })
      mockBrandUpsert.mockRejectedValueOnce(new Error('Conflict'))
      mockBrandFindFirst.mockResolvedValueOnce(null)
      mockBrandCreate.mockResolvedValueOnce({ id: 'new-1', name: 'NewBrand' })
      const result = await runMasterFill('prod-1')
      expect(result.brand).toBe('NewBrand')
    })

    it('returns Unknown brand when brandName is empty', async () => {
      mockFindUnique.mockResolvedValue({ ...baseProduct, brand: null })
      mockGenerateMasterFill.mockResolvedValue({ ...baseAiContent, brand: null })
      const result = await runMasterFill('prod-1')
      expect(result.brand).toBe('Unknown')
    })

    it('handles photo sourcing failure', async () => {
      mockFindUnique.mockResolvedValue(baseProduct)
      mockSourceImages.mockRejectedValueOnce(new Error('Sourcing failed'))
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation()
      const result = await runMasterFill('prod-1')
      expect(result.photosFound).toBe(0)
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Photo sourcing failed'), expect.any(String))
      warnSpy.mockRestore()
    })

    it('sets featuredImage and gallery when photos returned', async () => {
      mockFindUnique.mockResolvedValue({ ...baseProduct, featuredImage: '/images/placeholder.jpg' })
      mockSourceImages.mockResolvedValue([
        { cloudinaryUrl: 'https://url1.jpg', url: 'https://url1.jpg' },
        { cloudinaryUrl: 'https://url2.jpg', url: 'https://url2.jpg' },
      ])
      const result = await runMasterFill('prod-1')
      expect(result.photosFound).toBe(2)
      expect(mockTx.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'prod-1' },
          data: expect.objectContaining({
            featuredImage: 'https://url1.jpg',
            galleryImages: ['https://url2.jpg'],
            photoStatus: 'sourced',
          }),
        })
      )
    })

    it('handles equipment sync failure', async () => {
      mockFindUnique.mockResolvedValue(baseProduct)
      mockSyncProductToEquipment.mockRejectedValueOnce(new Error('Sync failed'))
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation()
      const result = await runMasterFill('prod-1')
      expect(result).toMatchObject({ productId: 'prod-1' })
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Equipment sync failed'), expect.any(String))
      warnSpy.mockRestore()
    })

    it('uses photo_search_queries from aiContent when provided', async () => {
      mockFindUnique.mockResolvedValue(baseProduct)
      mockGenerateMasterFill.mockResolvedValue({
        ...baseAiContent,
        photo_search_queries: ['custom query 1', 'custom query 2'],
      })
      await runMasterFill('prod-1')
      expect(mockSourceImages).toHaveBeenCalledWith(
        expect.anything(),
        5,
        ['custom query 1', 'custom query 2']
      )
    })

    it('uses parentMatch when leaf and fuzzy fail', async () => {
      mockFindUnique.mockResolvedValue(baseProduct)
      mockGenerateMasterFill.mockResolvedValue({ ...baseAiContent, category_suggestion: 'Lights > LED Panel' })
      mockCategoryFindFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'parent-1', name: 'Lights' })
      const result = await runMasterFill('prod-1')
      expect(result.category).toBe('Lights')
    })

    it('uses anyCategory fallback when no match', async () => {
      mockFindUnique.mockResolvedValue(baseProduct)
      mockGenerateMasterFill.mockResolvedValue({ ...baseAiContent, category_suggestion: 'UnknownCategory' })
      let callCount = 0
      mockCategoryFindFirst.mockImplementation(() => {
        callCount++
        if (callCount <= 2) return Promise.resolve(null)
        return Promise.resolve({ id: 'any-1', name: 'Misc' })
      })
      const result = await runMasterFill('prod-1')
      expect(result.category).toBe('Misc')
    })

    it('sets boxContents and tags when product has none', async () => {
      mockGenerateMasterFill.mockResolvedValue({ ...baseAiContent, box_contents: 'Battery, charger, cable' })
      mockFindUnique.mockResolvedValue({ ...baseProduct, boxContents: null, tags: null })
      await runMasterFill('prod-1')
      expect(mockTx.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            boxContents: 'Battery, charger, cable',
            tags: 'tag1,tag2,tag3,tag4,tag5',
          }),
        })
      )
    })

    it('uses aiContent when existing translation is placeholder (equals productName)', async () => {
      mockFindUnique.mockResolvedValue({
        ...baseProduct,
        translations: [
          { locale: 'en', name: 'Camera', shortDescription: 'Camera', longDescription: 'Camera', seoTitle: 'Camera', seoDescription: 'Camera', seoKeywords: 'Camera', specifications: null },
          { locale: 'ar', name: null, shortDescription: null, longDescription: null, seoTitle: null, seoDescription: null, seoKeywords: null, specifications: null },
          { locale: 'zh', name: null, shortDescription: null, longDescription: null, seoTitle: null, seoDescription: null, seoKeywords: null, specifications: null },
        ],
      })
      await runMasterFill('prod-1')
      expect(mockTx.productTranslation.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            shortDescription: baseAiContent.short_desc_en,
          }),
        })
      )
    })

    it('uses aiContent when existing translation equals product.sku', async () => {
      mockFindUnique.mockResolvedValue({
        ...baseProduct,
        translations: [
          { locale: 'en', name: 'Camera', shortDescription: 'SKU1', longDescription: 'SKU1', seoTitle: 'SKU1', seoDescription: 'SKU1', seoKeywords: 'SKU1', specifications: null },
          { locale: 'ar', name: null, shortDescription: null, longDescription: null, seoTitle: null, seoDescription: null, seoKeywords: null, specifications: null },
          { locale: 'zh', name: null, shortDescription: null, longDescription: null, seoTitle: null, seoDescription: null, seoKeywords: null, specifications: null },
        ],
      })
      await runMasterFill('prod-1')
      expect(mockTx.productTranslation.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            shortDescription: baseAiContent.short_desc_en,
          }),
        })
      )
    })

    it('uses product.sku when en name is missing', async () => {
      mockFindUnique.mockResolvedValue({
        ...baseProduct,
        translations: [
          { locale: 'en', name: null, shortDescription: null, longDescription: null, seoTitle: null, seoDescription: null, seoKeywords: null, specifications: null },
          { locale: 'ar', name: null, shortDescription: null, longDescription: null, seoTitle: null, seoDescription: null, seoKeywords: null, specifications: null },
          { locale: 'zh', name: null, shortDescription: null, longDescription: null, seoTitle: null, seoDescription: null, seoKeywords: null, specifications: null },
        ],
      })
      await runMasterFill('prod-1')
      expect(mockGenerateMasterFill).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ name: 'SKU1' })
      )
    })

    it('sets brandId when brand has id', async () => {
      mockFindUnique.mockResolvedValue(baseProduct)
      mockBrandUpsert.mockResolvedValue({ id: 'brand-123', name: 'Sony' })
      await runMasterFill('prod-1')
      expect(mockTx.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            brandId: 'brand-123',
          }),
        })
      )
    })

    it('skips brandId when brand is Unknown', async () => {
      mockFindUnique.mockResolvedValue({ ...baseProduct, brand: null })
      mockGenerateMasterFill.mockResolvedValue({ ...baseAiContent, brand: null })
      await runMasterFill('prod-1')
      const updateCall = mockTx.product.update.mock.calls[0]
      const data = updateCall[0]?.data as Record<string, unknown>
      expect(data.brandId).toBeUndefined()
    })

    it('sets categoryId when category has id', async () => {
      mockFindUnique.mockResolvedValue(baseProduct)
      mockCategoryFindFirst.mockResolvedValue({ id: 'cat-123', name: 'Cameras' })
      await runMasterFill('prod-1')
      expect(mockTx.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            categoryId: 'cat-123',
          }),
        })
      )
    })

    it('uses photo url when cloudinaryUrl is missing', async () => {
      mockFindUnique.mockResolvedValue({ ...baseProduct, featuredImage: '/images/placeholder.jpg' })
      mockSourceImages.mockResolvedValue([
        { cloudinaryUrl: undefined, url: 'https://fallback-url.jpg' },
      ])
      await runMasterFill('prod-1')
      expect(mockTx.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            featuredImage: 'https://fallback-url.jpg',
          }),
        })
      )
    })

    it('sets photoStatus pending when no photos', async () => {
      mockFindUnique.mockResolvedValue(baseProduct)
      mockSourceImages.mockResolvedValue([])
      await runMasterFill('prod-1')
      expect(mockTx.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            photoStatus: 'pending',
          }),
        })
      )
    })

    it('skips featuredImage when product already has non-placeholder image', async () => {
      mockFindUnique.mockResolvedValue({ ...baseProduct, featuredImage: '/images/real.jpg' })
      mockSourceImages.mockResolvedValue([
        { cloudinaryUrl: 'https://new.jpg', url: 'https://new.jpg' },
      ])
      await runMasterFill('prod-1')
      const updateCall = mockTx.product.update.mock.calls[0]
      const data = updateCall[0]?.data as Record<string, unknown>
      expect(data.featuredImage).toBeUndefined()
    })

    it('handles photo sourcing with non-Error throw', async () => {
      mockFindUnique.mockResolvedValue(baseProduct)
      mockSourceImages.mockRejectedValueOnce('string error')
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation()
      const result = await runMasterFill('prod-1')
      expect(result.photosFound).toBe(0)
      expect(warnSpy).toHaveBeenCalled()
      warnSpy.mockRestore()
    })

    it('uses Uncategorized when category fallback returns null', async () => {
      mockFindUnique.mockResolvedValue(baseProduct)
      mockGenerateMasterFill.mockResolvedValue({ ...baseAiContent, category_suggestion: null })
      mockCategoryFindFirst.mockResolvedValue(null)
      const result = await runMasterFill('prod-1')
      expect(result.category).toBe('Uncategorized')
    })

    it('uses aiContent.slug when provided', async () => {
      mockFindUnique.mockResolvedValue(baseProduct)
      mockGenerateMasterFill.mockResolvedValue({ ...baseAiContent, slug: 'custom-slug' })
      await runMasterFill('prod-1')
      expect(mockTx.productTranslation.upsert).toHaveBeenCalled()
    })

    it('handles product without category', async () => {
      mockFindUnique.mockResolvedValue({ ...baseProduct, category: null })
      const result = await runMasterFill('prod-1')
      expect(result).toMatchObject({ productId: 'prod-1' })
      expect(mockGenerateMasterFill).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ category: 'Equipment' })
      )
    })

    it('handles product without brand', async () => {
      mockFindUnique.mockResolvedValue({ ...baseProduct, brand: null })
      const result = await runMasterFill('prod-1')
      expect(result).toMatchObject({ productId: 'prod-1' })
      expect(mockGenerateMasterFill).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ brand: 'Unknown' })
      )
    })

    it('sets needsReview when _needs_review is true', async () => {
      mockFindUnique.mockResolvedValue(baseProduct)
      mockGenerateMasterFill.mockResolvedValue({ ...baseAiContent, _needs_review: true })
      const result = await runMasterFill('prod-1')
      expect(result.needsReview).toBe(true)
    })

    it('handles aiContent without specifications', async () => {
      mockFindUnique.mockResolvedValue(baseProduct)
      mockGenerateMasterFill.mockResolvedValue({
        ...baseAiContent,
        specifications: undefined,
      })
      const result = await runMasterFill('prod-1')
      expect(result).toMatchObject({ productId: 'prod-1' })
    })

    it('handles aiContent with array keywords', async () => {
      mockFindUnique.mockResolvedValue(baseProduct)
      mockGenerateMasterFill.mockResolvedValue({
        ...baseAiContent,
        seo_keywords_en: ['kw1', 'kw2', 'kw3'],
        seo_keywords_ar: ['ar1', 'ar2'],
        seo_keywords_zh: ['zh1'],
      })
      const result = await runMasterFill('prod-1')
      expect(result).toMatchObject({ productId: 'prod-1' })
      expect(mockTx.productTranslation.upsert).toHaveBeenCalledTimes(3)
    })

    it('handles aiContent with array tags', async () => {
      mockFindUnique.mockResolvedValue(baseProduct)
      mockGenerateMasterFill.mockResolvedValue({
        ...baseAiContent,
        tags: ['t1', 't2', 't3', 't4', 't5'],
      })
      await runMasterFill('prod-1')
      expect(mockTx.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tags: 't1, t2, t3, t4, t5',
          }),
        })
      )
    })

    it('skips categoryId when category has no id', async () => {
      mockFindUnique.mockResolvedValue(baseProduct)
      mockGenerateMasterFill.mockResolvedValue({ ...baseAiContent, category_suggestion: null })
      mockCategoryFindFirst.mockResolvedValue(null)
      await runMasterFill('prod-1')
      const updateCall = mockTx.product.update.mock.calls[0]
      const data = updateCall[0]?.data as Record<string, unknown>
      expect(data.categoryId).toBeUndefined()
    })

    it('sets gallery when multiple photos', async () => {
      mockFindUnique.mockResolvedValue({ ...baseProduct, featuredImage: null })
      mockSourceImages.mockResolvedValue([
        { cloudinaryUrl: 'https://1.jpg', url: 'https://1.jpg' },
        { cloudinaryUrl: 'https://2.jpg', url: 'https://2.jpg' },
        { cloudinaryUrl: 'https://3.jpg', url: 'https://3.jpg' },
      ])
      await runMasterFill('prod-1')
      expect(mockTx.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            featuredImage: 'https://1.jpg',
            galleryImages: ['https://2.jpg', 'https://3.jpg'],
          }),
        })
      )
    })

    it('uses default searchQueries when photo_search_queries is null', async () => {
      mockFindUnique.mockResolvedValue(baseProduct)
      mockGenerateMasterFill.mockResolvedValue({ ...baseAiContent, photo_search_queries: null })
      await runMasterFill('prod-1')
      expect(mockSourceImages).toHaveBeenCalledWith(
        expect.anything(),
        5,
        expect.arrayContaining([
          expect.stringContaining('Camera'),
          expect.stringContaining('product photo'),
        ])
      )
    })

    it('returns Unknown when ensureBrand receives empty string', async () => {
      mockFindUnique.mockResolvedValue({ ...baseProduct, brand: null })
      mockGenerateMasterFill.mockResolvedValue({ ...baseAiContent, brand: '   ' })
      const result = await runMasterFill('prod-1')
      expect(result.brand).toBe('Unknown')
    })

    it('handles single-part categorySuggestion (no parent)', async () => {
      mockFindUnique.mockResolvedValue(baseProduct)
      mockGenerateMasterFill.mockResolvedValue({ ...baseAiContent, category_suggestion: 'Lenses' })
      mockCategoryFindFirst
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ id: 'lens-1', name: 'Lenses' })
      const result = await runMasterFill('prod-1')
      expect(result.category).toBe('Lenses')
    })

    it('uses existing translation when not placeholder', async () => {
      mockFindUnique.mockResolvedValue({
        ...baseProduct,
        translations: [
          { locale: 'en', name: 'Camera', shortDescription: 'Real desc', longDescription: 'Real long', seoTitle: 'Real', seoDescription: 'Real', seoKeywords: 'Real', specifications: null },
          { locale: 'ar', name: null, shortDescription: null, longDescription: null, seoTitle: null, seoDescription: null, seoKeywords: null, specifications: null },
          { locale: 'zh', name: null, shortDescription: null, longDescription: null, seoTitle: null, seoDescription: null, seoKeywords: null, specifications: null },
        ],
      })
      await runMasterFill('prod-1')
      const enUpsert = mockTx.productTranslation.upsert.mock.calls[0]?.[0]
      expect(enUpsert?.update?.shortDescription).toBe('Real desc')
    })

    it('returns Uncategorized when anyCategory returns null', async () => {
      mockFindUnique.mockResolvedValue(baseProduct)
      mockGenerateMasterFill.mockResolvedValue({ ...baseAiContent, category_suggestion: 'X > Y > Z' })
      mockCategoryFindFirst.mockResolvedValue(null)
      const result = await runMasterFill('prod-1')
      expect(result.category).toBe('Uncategorized')
    })

    it('handles equipment sync with non-Error throw', async () => {
      mockFindUnique.mockResolvedValue(baseProduct)
      mockSyncProductToEquipment.mockRejectedValueOnce('string error')
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation()
      const result = await runMasterFill('prod-1')
      expect(result).toMatchObject({ productId: 'prod-1' })
      expect(warnSpy).toHaveBeenCalled()
      warnSpy.mockRestore()
    })

    it('uses zh fallback seo when aiContent has no zh seo', async () => {
      mockFindUnique.mockResolvedValue(baseProduct)
      mockGenerateMasterFill.mockResolvedValue({
        ...baseAiContent,
        seo_title_zh: undefined,
        seo_desc_zh: undefined,
        seo_keywords_zh: undefined,
      })
      const result = await runMasterFill('prod-1')
      expect(result).toMatchObject({ productId: 'prod-1' })
      const zhUpsert = mockTx.productTranslation.upsert.mock.calls[2]?.[0]
      expect(zhUpsert?.create?.seoTitle).toContain('租赁')
      expect(zhUpsert?.create?.seoDescription).toContain('利雅得')
    })

    it('uses orExisting with empty aiValue', async () => {
      mockFindUnique.mockResolvedValue({
        ...baseProduct,
        translations: [
          { locale: 'en', name: 'Camera', shortDescription: null, longDescription: null, seoTitle: null, seoDescription: null, seoKeywords: null, specifications: null },
          { locale: 'ar', name: null, shortDescription: null, longDescription: null, seoTitle: null, seoDescription: null, seoKeywords: null, specifications: null },
          { locale: 'zh', name: null, shortDescription: null, longDescription: null, seoTitle: null, seoDescription: null, seoKeywords: null, specifications: null },
        ],
      })
      mockGenerateMasterFill.mockResolvedValue({
        ...baseAiContent,
        short_desc_en: undefined,
        long_desc_en: undefined,
      })
      await runMasterFill('prod-1')
      const enUpsert = mockTx.productTranslation.upsert.mock.calls[0]?.[0]
      expect(enUpsert?.update?.shortDescription).toBe('')
    })

    it('handles product with no sku for isPlaceholderContent', async () => {
      mockFindUnique.mockResolvedValue({
        ...baseProduct,
        sku: null,
        translations: [
          { locale: 'en', name: 'Camera', shortDescription: 'Camera', longDescription: 'Camera', seoTitle: null, seoDescription: null, seoKeywords: null, specifications: null },
          { locale: 'ar', name: null, shortDescription: null, longDescription: null, seoTitle: null, seoDescription: null, seoKeywords: null, specifications: null },
          { locale: 'zh', name: null, shortDescription: null, longDescription: null, seoTitle: null, seoDescription: null, seoKeywords: null, specifications: null },
        ],
      })
      await runMasterFill('prod-1')
      expect(mockTx.productTranslation.upsert).toHaveBeenCalled()
    })

    it('skips boxContents when product already has it', async () => {
      mockFindUnique.mockResolvedValue({ ...baseProduct, boxContents: 'Existing' })
      mockGenerateMasterFill.mockResolvedValue({ ...baseAiContent, box_contents: 'New contents' })
      await runMasterFill('prod-1')
      const updateCall = mockTx.product.update.mock.calls[0]
      const data = updateCall[0]?.data as Record<string, unknown>
      expect(data.boxContents).toBeUndefined()
    })

    it('skips tags when product already has them', async () => {
      mockFindUnique.mockResolvedValue({ ...baseProduct, tags: 'existing,tags' })
      await runMasterFill('prod-1')
      const updateCall = mockTx.product.update.mock.calls[0]
      const data = updateCall[0]?.data as Record<string, unknown>
      expect(data.tags).toBeUndefined()
    })

    it('uses AI_PROVIDER when set', async () => {
      const orig = process.env.AI_PROVIDER
      process.env.AI_PROVIDER = 'openai'
      mockFindUnique.mockResolvedValue(baseProduct)
      await runMasterFill('prod-1')
      expect(mockGenerateMasterFill).toHaveBeenCalledWith('openai', expect.any(Object))
      process.env.AI_PROVIDER = orig
    })

    it('handles product with no en translation', async () => {
      mockFindUnique.mockResolvedValue({
        ...baseProduct,
        translations: [
          { locale: 'ar', name: null, shortDescription: null, longDescription: null, seoTitle: null, seoDescription: null, seoKeywords: null, specifications: null },
          { locale: 'zh', name: null, shortDescription: null, longDescription: null, seoTitle: null, seoDescription: null, seoKeywords: null, specifications: null },
        ],
      })
      const result = await runMasterFill('prod-1')
      expect(result).toMatchObject({ productId: 'prod-1' })
      expect(mockGenerateMasterFill).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ name: 'SKU1' })
      )
    })

    it('handles aiContent with empty specifications in update', async () => {
      mockFindUnique.mockResolvedValue(baseProduct)
      mockGenerateMasterFill.mockResolvedValue({
        ...baseAiContent,
        specifications: undefined,
      })
      await runMasterFill('prod-1')
      const enUpsert = mockTx.productTranslation.upsert.mock.calls[0]?.[0]
      expect(enUpsert?.update?.specifications).toBeUndefined()
    })

    it('creates ar translation when missing', async () => {
      mockFindUnique.mockResolvedValue({
        ...baseProduct,
        translations: [
          { locale: 'en', name: 'Camera', shortDescription: null, longDescription: null, seoTitle: null, seoDescription: null, seoKeywords: null, specifications: null },
          { locale: 'zh', name: null, shortDescription: null, longDescription: null, seoTitle: null, seoDescription: null, seoKeywords: null, specifications: null },
        ],
      })
      await runMasterFill('prod-1')
      const arUpsert = mockTx.productTranslation.upsert.mock.calls[1]?.[0]
      expect(arUpsert?.where?.productId_locale?.locale).toBe('ar')
      expect(arUpsert?.create?.name).toBe(baseAiContent.name_ar)
    })

    it('updates zh translation when exists', async () => {
      mockFindUnique.mockResolvedValue({
        ...baseProduct,
        translations: [
          { locale: 'en', name: 'Camera', shortDescription: null, longDescription: null, seoTitle: null, seoDescription: null, seoKeywords: null, specifications: null },
          { locale: 'ar', name: null, shortDescription: null, longDescription: null, seoTitle: null, seoDescription: null, seoKeywords: null, specifications: null },
          { locale: 'zh', name: '产品', shortDescription: '短', longDescription: '长', seoTitle: '标', seoDescription: '述', seoKeywords: '相', specifications: null },
        ],
      })
      await runMasterFill('prod-1')
      const zhUpsert = mockTx.productTranslation.upsert.mock.calls[2]?.[0]
      expect(zhUpsert?.update?.name).toBe('产品')
    })

    it('calculates score with minimal aiContent', async () => {
      mockFindUnique.mockResolvedValue(baseProduct)
      mockGenerateMasterFill.mockResolvedValue({
        ...baseAiContent,
        short_desc_en: '',
        long_desc_en: '',
        name_ar: '',
        long_desc_ar: '',
        name_zh: '',
        seo_title_en: '',
        seo_desc_en: '',
        specifications: {},
        tags: '',
      })
      const result = await runMasterFill('prod-1')
      expect(result.score).toBe(0)
    })

    it('calculates score 100 when all checks pass', async () => {
      mockFindUnique.mockResolvedValue(baseProduct)
      mockSourceImages.mockResolvedValue([{ cloudinaryUrl: 'x', url: 'x' }])
      mockGenerateMasterFill.mockResolvedValue({
        ...baseAiContent,
        long_desc_en: 'A'.repeat(100),
        long_desc_ar: 'ب'.repeat(80),
      })
      const result = await runMasterFill('prod-1')
      expect(result.score).toBe(100)
    })

    it('passes enTranslation specifications to generateMasterFill', async () => {
      mockFindUnique.mockResolvedValue({
        ...baseProduct,
        translations: [
          { locale: 'en', name: 'Camera', shortDescription: null, longDescription: null, seoTitle: null, seoDescription: null, seoKeywords: null, specifications: { res: '4K' } },
          { locale: 'ar', name: null, shortDescription: null, longDescription: null, seoTitle: null, seoDescription: null, seoKeywords: null, specifications: null },
          { locale: 'zh', name: null, shortDescription: null, longDescription: null, seoTitle: null, seoDescription: null, seoKeywords: null, specifications: null },
        ],
      })
      await runMasterFill('prod-1')
      expect(mockGenerateMasterFill).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ specifications: { res: '4K' } })
      )
    })

    it('uses productName when aiContent.name_ar is empty for ar create', async () => {
      mockFindUnique.mockResolvedValue({
        ...baseProduct,
        translations: [
          { locale: 'en', name: 'Camera', shortDescription: null, longDescription: null, seoTitle: null, seoDescription: null, seoKeywords: null, specifications: null },
          { locale: 'zh', name: null, shortDescription: null, longDescription: null, seoTitle: null, seoDescription: null, seoKeywords: null, specifications: null },
        ],
      })
      mockGenerateMasterFill.mockResolvedValue({
        ...baseAiContent,
        name_ar: undefined,
      })
      await runMasterFill('prod-1')
      const arUpsert = mockTx.productTranslation.upsert.mock.calls[1]?.[0]
      expect(arUpsert?.create?.name).toBe('Camera')
    })

    it('uses url when cloudinaryUrl is empty string', async () => {
      mockFindUnique.mockResolvedValue({ ...baseProduct, featuredImage: '/images/placeholder.jpg' })
      mockSourceImages.mockResolvedValue([
        { cloudinaryUrl: '', url: 'https://url-fallback.jpg' },
      ])
      await runMasterFill('prod-1')
      expect(mockTx.product.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            featuredImage: 'https://url-fallback.jpg',
          }),
        })
      )
    })
  })
})
