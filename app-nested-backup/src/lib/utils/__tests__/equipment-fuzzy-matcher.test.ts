/**
 * Unit tests for equipment-fuzzy-matcher
 */

import {
  getEquipmentForFuzzyMatch,
  matchEquipmentNamesToIds,
} from '../equipment-fuzzy-matcher'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    equipment: {
      findMany: jest.fn(),
    },
  },
}))

const prisma = require('@/lib/db/prisma').prisma

describe('equipment-fuzzy-matcher', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('getEquipmentForFuzzyMatch', () => {
    it('returns mapped equipment list', async () => {
      prisma.equipment.findMany.mockResolvedValue([
        {
          id: 'eq_1',
          model: 'Sony FX6',
          sku: 'CAM-SONY-0001',
          brand: { name: 'Sony' },
          category: { name: 'Cameras' },
        },
      ])

      const result = await getEquipmentForFuzzyMatch(10)

      expect(result).toHaveLength(1)
      expect(result[0]).toEqual({
        id: 'eq_1',
        model: 'Sony FX6',
        sku: 'CAM-SONY-0001',
        brandName: 'Sony',
        categoryName: 'Cameras',
        searchText: 'sony fx6 cam-sony-0001 sony cameras',
      })
    })

    it('handles null model/sku/brand/category', async () => {
      prisma.equipment.findMany.mockResolvedValue([
        {
          id: 'eq_2',
          model: null,
          sku: null,
          brand: null,
          category: null,
        },
      ])

      const result = await getEquipmentForFuzzyMatch(5)

      expect(result[0].model).toBe('')
      expect(result[0].sku).toBe('')
      expect(result[0].brandName).toBe('')
      expect(result[0].categoryName).toBe('')
      expect(result[0].searchText).toBe('')
    })
  })

  describe('matchEquipmentNamesToIds', () => {
    it('returns empty when names empty', async () => {
      const result = await matchEquipmentNamesToIds([])
      expect(result).toEqual([])
      expect(prisma.equipment.findMany).not.toHaveBeenCalled()
    })

    it('returns empty when catalog empty', async () => {
      prisma.equipment.findMany.mockResolvedValue([])

      const result = await matchEquipmentNamesToIds(['Sony FX6'])

      expect(result).toEqual([])
    })

    it('matches names to catalog IDs', async () => {
      prisma.equipment.findMany.mockResolvedValue([
        {
          id: 'eq_1',
          model: 'Sony FX6',
          sku: 'CAM-SONY-0001',
          brand: { name: 'Sony' },
          category: { name: 'Cameras' },
        },
      ])

      const result = await matchEquipmentNamesToIds(['Sony FX6'])

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('eq_1')
      expect(result[0].name).toBe('Sony FX6')
      expect(result[0].score).toBeGreaterThan(0)
    })

    it('skips empty names', async () => {
      prisma.equipment.findMany.mockResolvedValue([
        {
          id: 'eq_1',
          model: 'X',
          sku: '',
          brand: null,
          category: null,
        },
      ])

      const result = await matchEquipmentNamesToIds(['   ', 'X'])

      expect(result).toHaveLength(1)
    })
  })
})
