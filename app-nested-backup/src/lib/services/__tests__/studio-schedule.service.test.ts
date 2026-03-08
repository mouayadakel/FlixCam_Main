/**
 * Unit tests for studio-schedule.service
 */

import { StudioScheduleService } from '../studio-schedule.service'
import { prisma } from '@/lib/db/prisma'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    studioSchedule: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      upsert: jest.fn(),
    },
    $transaction: jest.fn((ops) => Promise.all(ops)),
  },
}))

const mockFindMany = prisma.studioSchedule.findMany as jest.Mock
const mockFindUnique = prisma.studioSchedule.findUnique as jest.Mock
const mockUpsert = prisma.studioSchedule.upsert as jest.Mock
const mockTransaction = prisma.$transaction as jest.Mock

describe('StudioScheduleService', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('getSchedule', () => {
    it('returns 7 days with defaults when no rows', async () => {
      mockFindMany.mockResolvedValue([])
      const result = await StudioScheduleService.getSchedule('studio_1')
      expect(result).toHaveLength(7)
      expect(result[0]).toMatchObject({ dayOfWeek: 0, openTime: '09:00', closeTime: '22:00', isClosed: false })
    })
    it('merges stored rows with defaults', async () => {
      mockFindMany.mockResolvedValue([
        { dayOfWeek: 1, openTime: '10:00', closeTime: '20:00', isClosed: false },
      ])
      const result = await StudioScheduleService.getSchedule('studio_1')
      expect(result[1]).toMatchObject({ openTime: '10:00', closeTime: '20:00' })
    })
  })

  describe('getForDay', () => {
    it('returns entry for day with defaults when not found', async () => {
      mockFindUnique.mockResolvedValue(null)
      const result = await StudioScheduleService.getForDay('studio_1', 2)
      expect(result).toMatchObject({ dayOfWeek: 2, openTime: '09:00', closeTime: '22:00', isClosed: false })
    })
    it('returns stored row when found', async () => {
      mockFindUnique.mockResolvedValue({ dayOfWeek: 2, openTime: '08:00', closeTime: '23:00', isClosed: false })
      const result = await StudioScheduleService.getForDay('studio_1', 2)
      expect(result.openTime).toBe('08:00')
      expect(result.closeTime).toBe('23:00')
    })
  })

  describe('saveSchedule', () => {
    it('upserts entries and returns getSchedule', async () => {
      mockUpsert.mockResolvedValue({})
      mockFindMany.mockResolvedValue([])
      mockTransaction.mockImplementation((ops) => Promise.all(ops))
      const entries = Array.from({ length: 7 }, (_, i) => ({
        dayOfWeek: i,
        openTime: '09:00',
        closeTime: '22:00',
        isClosed: false,
      }))
      const result = await StudioScheduleService.saveSchedule('studio_1', entries)
      expect(mockUpsert).toHaveBeenCalledTimes(7)
      expect(result).toHaveLength(7)
    })
  })
})
