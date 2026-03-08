/**
 * ═══════════════════════════════════════════
 * SERVICE: column-mapper.service
 * ═══════════════════════════════════════════
 * METHODS:
 *   mapColumns(headers, options?)
 *     PATH 1: exact synonym match → mappedField, method 'synonym'
 *     PATH 2: history match when useHistory true → method 'history'
 *     PATH 3: fuzzy match score >= 60 → method 'fuzzy'
 *     PATH 4: no match → mappedField null, method 'skip'
 *     PATH 5: prisma throws → history empty, continue
 *   saveMappingHistory(mappings)
 *     PATH 1: mappedField empty or 'skip' → skip
 *     PATH 2: valid → upsert
 *   getFieldInfo(field)
 *     PATH 1: required field → isRequired true
 *     PATH 2: ai fillable → isAiFillable true
 *     PATH 3: neither → both false
 * DEPENDENCIES: prisma.columnMappingHistory (findMany, upsert)
 * ═══════════════════════════════════════════
 */

import { mapColumns, saveMappingHistory, getFieldInfo } from '../column-mapper.service'
import { prisma } from '@/lib/db/prisma'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    columnMappingHistory: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
  },
}))

const mockFindMany = prisma.columnMappingHistory.findMany as jest.Mock
const mockUpsert = prisma.columnMappingHistory.upsert as jest.Mock

describe('column-mapper.service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFindMany.mockResolvedValue([])
    mockUpsert.mockResolvedValue({})
  })

  describe('mapColumns', () => {
    it('returns synonym match for exact header "name"', async () => {
      const result = await mapColumns(['name'])
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        sourceHeader: 'name',
        mappedField: 'name',
        confidence: 98,
        method: 'synonym',
      })
    })

    it('returns synonym match for "Product Name"', async () => {
      const result = await mapColumns(['Product Name'])
      expect(result[0].mappedField).toBe('name')
      expect(result[0].method).toBe('synonym')
    })

    it('returns history match when history has entry', async () => {
      mockFindMany.mockResolvedValue([
        { sourceHeader: 'custom_col', mappedField: 'sku', frequency: 5 },
      ])
      const result = await mapColumns(['custom_col'])
      expect(result[0].mappedField).toBe('sku')
      expect(result[0].method).toBe('history')
    })

    it('returns skip when no match found', async () => {
      const result = await mapColumns(['UnknownColumn123'])
      expect(result[0]).toEqual({
        sourceHeader: 'UnknownColumn123',
        mappedField: null,
        confidence: 0,
        method: 'skip',
      })
    })

    it('returns fuzzy match when header closely matches synonym', async () => {
      const result = await mapColumns(['Product Nam'])
      expect(result[0].method).toBe('fuzzy')
      expect(result[0].mappedField).toBe('name')
      expect(result[0].confidence).toBeGreaterThanOrEqual(60)
    })

    it('returns multiple mappings for multiple headers', async () => {
      const result = await mapColumns(['name', 'sku', 'brand'])
      expect(result).toHaveLength(3)
      expect(result[0].mappedField).toBe('name')
      expect(result[1].mappedField).toBe('sku')
      expect(result[2].mappedField).toBe('brand')
    })

    it('skips history when useHistory is false', async () => {
      mockFindMany.mockResolvedValue([{ sourceHeader: 'x', mappedField: 'name', frequency: 1 }])
      const result = await mapColumns(['x'], { useHistory: false })
      expect(result[0].method).toBe('skip')
      expect(mockFindMany).not.toHaveBeenCalled()
    })

    it('continues when prisma findMany throws', async () => {
      mockFindMany.mockRejectedValue(new Error('DB'))
      const result = await mapColumns(['name'])
      expect(result[0].mappedField).toBe('name')
      expect(result[0].method).toBe('synonym')
    })

  })

  describe('saveMappingHistory', () => {
    it('skips entries with empty mappedField', async () => {
      await saveMappingHistory([{ sourceHeader: 'A', mappedField: '' }])
      expect(mockUpsert).not.toHaveBeenCalled()
    })

    it('skips entries with mappedField "skip"', async () => {
      await saveMappingHistory([{ sourceHeader: 'A', mappedField: 'skip' }])
      expect(mockUpsert).not.toHaveBeenCalled()
    })

    it('calls upsert for multiple valid mappings', async () => {
      await saveMappingHistory([
        { sourceHeader: 'Product Name', mappedField: 'name' },
        { sourceHeader: 'SKU', mappedField: 'sku' },
      ])
      expect(mockUpsert).toHaveBeenCalledTimes(2)
    })

    it('calls upsert for valid mapping', async () => {
      await saveMappingHistory([{ sourceHeader: 'Product Name', mappedField: 'name' }])
      expect(mockUpsert).toHaveBeenCalledWith({
        where: { sourceHeader_mappedField: { sourceHeader: 'product name', mappedField: 'name' } },
        create: { sourceHeader: 'product name', mappedField: 'name', frequency: 1 },
        update: { frequency: { increment: 1 }, lastUsedAt: expect.any(Date) },
      })
    })

    it('does not throw when upsert fails', async () => {
      mockUpsert.mockRejectedValue(new Error('DB'))
      await expect(saveMappingHistory([{ sourceHeader: 'A', mappedField: 'name' }])).resolves.toBeUndefined()
    })
  })

  describe('getFieldInfo', () => {
    it('returns isRequired true for name field', () => {
      const result = getFieldInfo('name')
      expect(result).toEqual({ isRequired: true, isAiFillable: false })
    })

    it('returns isAiFillable true for short_description', () => {
      const result = getFieldInfo('short_description')
      expect(result.isAiFillable).toBe(true)
    })

    it('returns both false for unknown field', () => {
      const result = getFieldInfo('unknown_field')
      expect(result).toEqual({ isRequired: false, isAiFillable: false })
    })
  })
})
