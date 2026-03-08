/**
 * Unit tests for bundle-recommendations.service
 */

import { bundleRecommendationsService } from '../bundle-recommendations.service'
import { prisma } from '@/lib/db/prisma'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    bookingEquipment: { findMany: jest.fn() },
    equipment: { findUnique: jest.fn(), findMany: jest.fn() },
  },
}))

const mockBookingEquipmentFindMany = prisma.bookingEquipment.findMany as jest.Mock
const mockEquipmentFindUnique = prisma.equipment.findUnique as jest.Mock
const mockEquipmentFindMany = prisma.equipment.findMany as jest.Mock

describe('bundleRecommendationsService', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('getFrequentlyRentedTogether', () => {
    it('returns category fallback when no co-occurrence', async () => {
      mockBookingEquipmentFindMany.mockResolvedValue([])
      mockEquipmentFindUnique.mockResolvedValue({ categoryId: 'c1' })
      mockEquipmentFindMany.mockResolvedValue([
        {
          id: 'e1',
          sku: 'CAM1',
          model: 'Sony FX6',
          dailyPrice: 100,
          quantityAvailable: 1,
          category: { id: 'c1', name: 'Cameras', slug: 'cameras' },
          brand: { id: 'b1', name: 'Sony', slug: 'sony' },
          media: [],
        },
      ])
      const result = await bundleRecommendationsService.getFrequentlyRentedTogether('eq_main', 3)
      expect(result.source).toBe('category-fallback')
      expect(Array.isArray(result.items)).toBe(true)
    })

    it('returns co-occurrence when bookings have other equipment', async () => {
      mockBookingEquipmentFindMany
        .mockResolvedValueOnce([{ bookingId: 'b1' }, { bookingId: 'b2' }])
        .mockResolvedValueOnce([
          {
            equipmentId: 'eq2',
            equipment: {
              id: 'eq2',
              sku: 'LENS1',
              model: 'Lens 24-70',
              dailyPrice: 50,
              quantityAvailable: 2,
              category: { id: 'c1', name: 'Lenses', slug: 'lenses' },
              brand: { id: 'b1', name: 'Sony', slug: 'sony' },
              media: [],
            },
          },
          {
            equipmentId: 'eq2',
            equipment: {
              id: 'eq2',
              sku: 'LENS1',
              model: 'Lens 24-70',
              dailyPrice: 50,
              quantityAvailable: 2,
              category: { id: 'c1', name: 'Lenses', slug: 'lenses' },
              brand: { id: 'b1', name: 'Sony', slug: 'sony' },
              media: [],
            },
          },
        ])
      const result = await bundleRecommendationsService.getFrequentlyRentedTogether('eq_main', 3)
      expect(result.source).toBe('co-occurrence')
      expect(result.items).toHaveLength(1)
      expect(result.items[0].id).toBe('eq2')
      expect(result.items[0].model).toBe('Lens 24-70')
    })

    it('returns category fallback on error', async () => {
      mockBookingEquipmentFindMany.mockRejectedValue(new Error('DB error'))
      const result = await bundleRecommendationsService.getFrequentlyRentedTogether('eq_main', 3)
      expect(result.source).toBe('category-fallback')
      expect(result.items).toEqual([])
    })
  })

  describe('getCategoryFallback', () => {
    it('returns empty when equipment has no category', async () => {
      mockEquipmentFindUnique.mockResolvedValue({ categoryId: null })
      const result = await bundleRecommendationsService.getCategoryFallback('eq_main', 3)
      expect(result.source).toBe('category-fallback')
      expect(result.items).toEqual([])
    })

    it('returns empty when equipment not found', async () => {
      mockEquipmentFindUnique.mockResolvedValue(null)
      const result = await bundleRecommendationsService.getCategoryFallback('eq_main', 3)
      expect(result.items).toEqual([])
    })

    it('returns featured items from same category', async () => {
      mockEquipmentFindUnique.mockResolvedValue({ categoryId: 'c1' })
      mockEquipmentFindMany.mockResolvedValue([
        {
          id: 'e1',
          sku: 'CAM1',
          model: 'Sony FX6',
          dailyPrice: 100,
          quantityAvailable: 1,
          category: { id: 'c1', name: 'Cameras', slug: 'cameras' },
          brand: { id: 'b1', name: 'Sony', slug: 'sony' },
          media: [],
        },
      ])
      const result = await bundleRecommendationsService.getCategoryFallback('eq_main', 3)
      expect(result.source).toBe('category-fallback')
      expect(result.items).toHaveLength(1)
      expect(result.items[0].id).toBe('e1')
    })
  })
})
