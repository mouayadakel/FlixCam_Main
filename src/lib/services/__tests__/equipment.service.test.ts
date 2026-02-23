/**
 * Unit tests for EquipmentService
 */

import { EquipmentService } from '../equipment.service'
import { prisma } from '@/lib/db/prisma'

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
  },
}))

jest.mock('../translation.service', () => ({ TranslationService: { upsert: jest.fn() } }))
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
  })

  describe('getEquipmentById', () => {
    it('returns null when equipment not found', async () => {
      ;(mockPrisma.equipment.findFirst as jest.Mock).mockResolvedValue(null)
      const result = await EquipmentService.getEquipmentById('non-existent')
      expect(result).toBeNull()
    })
  })
})
