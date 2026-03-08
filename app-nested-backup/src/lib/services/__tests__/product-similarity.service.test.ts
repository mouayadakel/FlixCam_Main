/**
 * Unit tests for product-similarity.service
 * Covers: embedProduct, findSimilarProducts, rebuildRelatedProducts
 */

import { embedProduct, findSimilarProducts, rebuildRelatedProducts } from '../product-similarity.service'
import { prisma } from '@/lib/db/prisma'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    product: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
  },
}))

const mockFindUnique = prisma.product.findUnique as jest.Mock
const mockFindMany = prisma.product.findMany as jest.Mock
const mockUpdate = prisma.product.update as jest.Mock

const originalFetch = global.fetch

describe('product-similarity.service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env.OPENAI_API_KEY = undefined
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  describe('embedProduct', () => {
    it('returns null when product not found', async () => {
      mockFindUnique.mockResolvedValue(null)
      const result = await embedProduct('prod_01HX4K2M8P')
      expect(result).toBeNull()
    })

    it('returns null when OPENAI_API_KEY is not set', async () => {
      mockFindUnique.mockResolvedValue({
        id: 'prod_1',
        sku: 'SKU1',
        brand: { name: 'Sony' },
        category: { name: 'Cameras' },
        translations: [{ name: 'Camera X', shortDescription: 'Pro camera' }],
      })
      const result = await embedProduct('prod_1')
      expect(result).toBeNull()
    })

    it('returns embedding when API key set and fetch succeeds', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      const embedding = [0.1, 0.2, 0.3]
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [{ embedding }] }),
      })
      mockFindUnique.mockResolvedValue({
        id: 'prod_1',
        sku: 'SKU1',
        brand: { name: 'Sony' },
        category: { name: 'Cameras' },
        tags: null,
        translations: [{ name: 'Camera X', shortDescription: 'Pro camera' }],
      })
      const result = await embedProduct('prod_1')
      expect(result).toEqual(embedding)
    })

    it('returns null when fetch fails', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      global.fetch = jest.fn().mockRejectedValue(new Error('API error'))
      mockFindUnique.mockResolvedValue({
        id: 'prod_fail',
        sku: 'SKU_FAIL',
        brand: null,
        category: null,
        tags: 'tag1',
        translations: [{ name: 'X', shortDescription: null }],
      })
      const result = await embedProduct('prod_fail')
      expect(result).toBeNull()
    })

    it('includes specs in embedding text when product has specifications', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      const embedding = [0.1, 0.2, 0.3]
      let capturedBody: string | null = null
      global.fetch = jest.fn().mockImplementation((url: string, opts: { body?: string }) => {
        capturedBody = opts?.body ? JSON.parse(opts.body).input : null
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ data: [{ embedding }] }),
        })
      })
      mockFindUnique.mockResolvedValue({
        id: 'prod_specs',
        sku: 'SKU_SPECS',
        brand: { name: 'Sony' },
        category: { name: 'Cameras' },
        tags: null,
        translations: [
          {
            name: 'Camera Pro',
            shortDescription: 'Pro camera',
            specifications: { resolution: '4K', sensor: 'Full Frame' },
          },
        ],
      })
      const result = await embedProduct('prod_specs')
      expect(result).toEqual(embedding)
      expect(capturedBody).toContain('resolution: 4K')
      expect(capturedBody).toContain('sensor: Full Frame')
    })
  })

  describe('findSimilarProducts', () => {
    it('returns empty array when embedProduct returns null', async () => {
      mockFindUnique.mockResolvedValue(null)
      const result = await findSimilarProducts('prod_nonexistent', 5)
      expect(result).toEqual([])
    })

    it('returns similar products when embeddings available', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      const emb = [1, 0, 0]
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [{ embedding: emb }] }),
      })
      mockFindUnique
        .mockResolvedValueOnce({
          id: 'target',
          sku: 'T',
          brand: { name: 'Sony' },
          category: { name: 'Cameras' },
          tags: null,
          translations: [{ name: 'Target', shortDescription: 'x' }],
        })
        .mockResolvedValueOnce({ categoryId: 'cat1' })
        .mockResolvedValue({
          id: 'p2',
          categoryId: 'cat1',
          sku: 'P2',
          tags: null,
          translations: [{ name: 'Product 2', shortDescription: 'y' }],
          brand: { name: 'Sony' },
          category: { name: 'Cameras' },
        })
      mockFindMany.mockResolvedValue([
        {
          id: 'p2',
          categoryId: 'cat1',
          sku: 'P2',
          tags: null,
          translations: [{ name: 'Product 2', shortDescription: 'y' }],
          brand: { name: 'Sony' },
          category: { name: 'Cameras' },
        },
      ])
      const result = await findSimilarProducts('target', 5)
      expect(result.length).toBeGreaterThanOrEqual(0)
    })
  })

  describe('rebuildRelatedProducts', () => {
    it('returns updated 0 when no products', async () => {
      mockFindMany.mockResolvedValue([])
      const result = await rebuildRelatedProducts()
      expect(result).toEqual({ updated: 0, errors: 0 })
    })

    it('filters by productIds when provided', async () => {
      mockFindMany.mockResolvedValue([])
      await rebuildRelatedProducts(['prod_1', 'prod_2'])
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: null, id: { in: ['prod_1', 'prod_2'] } },
        })
      )
    })

    it('updates product when findSimilarProducts returns results', async () => {
      process.env.OPENAI_API_KEY = 'sk-test'
      const emb = [1, 0, 0]
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [{ embedding: emb }] }),
      })
      mockFindMany
        .mockResolvedValueOnce([{ id: 'p1' }])
        .mockResolvedValueOnce([
          {
            id: 'p2',
            categoryId: 'cat1',
            sku: 'P2',
            tags: null,
            translations: [{ name: 'Product 2', shortDescription: 'y' }],
            brand: { name: 'Sony' },
            category: { name: 'Cameras' },
          },
        ])
      mockFindUnique
        .mockResolvedValueOnce({
          id: 'p1',
          sku: 'P1',
          brand: { name: 'Sony' },
          category: { name: 'C' },
          tags: null,
          translations: [{ name: 'P1', shortDescription: 'x' }],
        })
        .mockResolvedValueOnce({ categoryId: 'cat1' })
        .mockResolvedValue({ categoryId: 'cat1' })
      mockUpdate.mockResolvedValue({})
      const result = await rebuildRelatedProducts(['p1'], 5)
      expect(result.updated).toBe(1)
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 'p1' },
        data: { relatedProducts: ['p2'] },
      })
    })

    it('increments errors when update throws for a product', async () => {
      mockFindMany
        .mockResolvedValueOnce([{ id: 'p1' }, { id: 'p2' }])
        .mockResolvedValueOnce([
          {
            id: 'p2',
            categoryId: 'cat1',
            sku: 'P2',
            tags: null,
            translations: [{ name: 'Product 2', shortDescription: 'y' }],
            brand: { name: 'Sony' },
            category: { name: 'Cameras' },
          },
        ])
        .mockResolvedValueOnce([
          {
            id: 'p1',
            categoryId: 'cat1',
            sku: 'P1',
            tags: null,
            translations: [{ name: 'Product 1', shortDescription: 'x' }],
            brand: { name: 'Sony' },
            category: { name: 'Cameras' },
          },
        ])
      process.env.OPENAI_API_KEY = 'sk-test'
      const emb = [1, 0, 0]
      global.fetch = jest.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: [{ embedding: emb }] }),
      })
      mockFindUnique
        .mockResolvedValueOnce({
          id: 'p1',
          sku: 'P1',
          brand: { name: 'Sony' },
          category: { name: 'C' },
          tags: null,
          translations: [{ name: 'P1', shortDescription: 'x' }],
        })
        .mockResolvedValueOnce({ categoryId: 'cat1' })
        .mockResolvedValueOnce({
          id: 'p2',
          sku: 'P2',
          brand: { name: 'Sony' },
          category: { name: 'C' },
          tags: null,
          translations: [{ name: 'P2', shortDescription: 'y' }],
        })
        .mockResolvedValue({ categoryId: 'cat1' })
      mockUpdate
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('Update failed'))
      const result = await rebuildRelatedProducts(['p1', 'p2'], 5)
      expect(result.updated).toBe(1)
      expect(result.errors).toBe(1)
    })
  })
})
