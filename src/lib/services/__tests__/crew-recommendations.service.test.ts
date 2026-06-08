/**
 * Unit tests for crew-recommendations.service.ts
 */

const mockCategoryFindFirst = jest.fn()
const mockEquipmentFindMany = jest.fn()

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    category: { findFirst: (...args: unknown[]) => mockCategoryFindFirst(...args) },
    equipment: { findMany: (...args: unknown[]) => mockEquipmentFindMany(...args) },
  },
}))

import {
  getCrewRolesForEquipment,
  getCrewEquipmentBySkus,
  LARGE_CREW_KIT_SKUS,
} from '../crew-recommendations.service'

describe('crew-recommendations.service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getCrewRolesForEquipment', () => {
    it('returns crew items that link to the given equipment id', async () => {
      mockCategoryFindFirst.mockResolvedValue({ id: 'cat-crew' })
      mockEquipmentFindMany.mockResolvedValue([
        {
          id: 'crew-1',
          sku: 'CREW-DOP',
          model: 'DOP',
          slug: 'dop',
          dailyPrice: 5000,
          quantityAvailable: 10,
          customFields: { relatedEquipmentIds: ['eq-cam', 'eq-other'] },
          category: { id: 'cat-crew', name: 'Crew', slug: 'crew' },
          brand: null,
          media: [],
        },
        {
          id: 'crew-2',
          sku: 'CREW-GRIP',
          model: 'Grip',
          slug: 'grip',
          dailyPrice: 1000,
          quantityAvailable: 10,
          customFields: { relatedEquipmentIds: ['eq-other'] },
          category: { id: 'cat-crew', name: 'Crew', slug: 'crew' },
          brand: null,
          media: [],
        },
      ])

      const result = await getCrewRolesForEquipment('eq-cam')
      expect(result).toHaveLength(1)
      expect(result[0].sku).toBe('CREW-DOP')
    })

    it('returns empty when crew category is missing', async () => {
      mockCategoryFindFirst.mockResolvedValue(null)
      const result = await getCrewRolesForEquipment('eq-cam')
      expect(result).toEqual([])
      expect(mockEquipmentFindMany).not.toHaveBeenCalled()
    })
  })

  describe('getCrewEquipmentBySkus', () => {
    it('queries by SKU list and preserves SKU order in results', async () => {
      mockEquipmentFindMany.mockResolvedValue([
        {
          id: 'crew-snd',
          sku: 'CREW-SOUND-MIX',
          model: 'Sound',
          slug: 'sound',
          dailyPrice: 2000,
          quantityAvailable: 5,
          customFields: {},
          category: { id: 'c1', name: 'Crew', slug: 'crew' },
          brand: null,
          media: [],
        },
        {
          id: 'crew-ac',
          sku: 'CREW-1ST-AC',
          model: '1st AC',
          slug: 'ac',
          dailyPrice: 1500,
          quantityAvailable: 5,
          customFields: {},
          category: { id: 'c1', name: 'Crew', slug: 'crew' },
          brand: null,
          media: [],
        },
      ])

      const result = await getCrewEquipmentBySkus(LARGE_CREW_KIT_SKUS)
      expect(result.map((r) => r.sku)).toEqual([...LARGE_CREW_KIT_SKUS])
      expect(mockEquipmentFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            sku: { in: [...LARGE_CREW_KIT_SKUS] },
          }),
        })
      )
    })
  })
})
