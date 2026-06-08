/**
 * Unit tests for dashboard.service (getKpis, getCachedKpis)
 */

import { getKpis, getCachedKpis } from '../dashboard.service'
import { prisma } from '@/lib/db/prisma'
import { getRedisClient } from '@/lib/queue/redis.client'
import { getDailyEarningsSeries, getEarningsSummary } from '../earnings.service'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    booking: { count: jest.fn(), findMany: jest.fn() },
    equipment: { count: jest.fn() },
    bookingEquipment: { findMany: jest.fn(), aggregate: jest.fn() },
  },
}))

jest.mock('../earnings.service', () => ({
  getEarningsSummary: jest.fn(),
  getDailyEarningsSeries: jest.fn(),
}))

const mockRedis = { get: jest.fn(), setex: jest.fn(), del: jest.fn(), keys: jest.fn() }
jest.mock('@/lib/queue/redis.client', () => ({ getRedisClient: jest.fn(() => mockRedis) }))

const mockBookingCount = prisma.booking.count as jest.Mock
const mockEquipmentCount = prisma.equipment.count as jest.Mock
const mockBookingEquipmentFindMany = prisma.bookingEquipment.findMany as jest.Mock
const mockBookingEquipmentAggregate = prisma.bookingEquipment.aggregate as jest.Mock
const mockBookingFindMany = prisma.booking.findMany as jest.Mock
const mockGetEarningsSummary = getEarningsSummary as jest.Mock
const mockGetDailyEarningsSeries = getDailyEarningsSeries as jest.Mock

describe('dashboard.service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRedis.get.mockResolvedValue(null)
    mockRedis.setex.mockResolvedValue(undefined)
    mockRedis.del.mockResolvedValue(1)
    mockRedis.keys.mockResolvedValue(['dashboard:kpis:month'])
    mockBookingCount.mockResolvedValue(0)
    mockEquipmentCount.mockResolvedValue(10)
    mockBookingEquipmentFindMany.mockResolvedValue([])
    mockBookingEquipmentAggregate.mockResolvedValue({ _sum: { quantity: 4 } })
    mockBookingFindMany.mockResolvedValue([])
    mockGetEarningsSummary
      .mockResolvedValueOnce({ amount: 1500, orderCount: 3 })
      .mockResolvedValueOnce({ amount: 200, orderCount: 1 })
    mockGetDailyEarningsSeries.mockResolvedValue(
      Array.from({ length: 30 }, (_, index) => ({
        date: `2026-01-${String(index + 1).padStart(2, '0')}T00:00:00.000Z`,
        revenue: index === 0 ? 200 : 0,
      }))
    )
  })

  describe('getKpis', () => {
    it('returns DashboardKpis with revenue, bookingCount, utilization, clientCount, revenueByDay', async () => {
      const result = await getKpis()
      expect(result).toMatchObject({
        period: 'month',
        revenue: expect.any(Number),
        revenueToday: expect.any(Number),
        bookingCount: expect.any(Number),
        paidOrderCount: expect.any(Number),
        utilization: expect.any(Number),
        clientCount: expect.any(Number),
        equipmentOut: expect.any(Number),
        overdueReturns: expect.any(Number),
        lowStockCount: expect.any(Number),
        revenueByDay: expect.any(Array),
      })
      expect(result.revenueByDay.length).toBe(30)
    })

    it('aggregates revenue by day when payments exist', async () => {
      const result = await getKpis()
      expect(result.revenue).toBe(1500)
      expect(result.revenueToday).toBe(200)
      expect(result.paidOrderCount).toBe(3)
      expect(result.revenueByDay).toHaveLength(30)
      expect(result.revenueByDay.some((d) => d.revenue > 0)).toBe(true)
    })

    it('computes utilization when totalEquipment > 0 and activeBookingEquipment has quantity', async () => {
      mockBookingCount.mockResolvedValue(5)
      mockEquipmentCount.mockResolvedValue(10)
      mockBookingEquipmentFindMany.mockResolvedValue([{ quantity: 3 }, { quantity: 2 }])
      mockBookingFindMany.mockResolvedValue([{ customerId: 'c1' }, { customerId: 'c2' }])
      const result = await getKpis()
      expect(result.utilization).toBe(50)
      expect(result.clientCount).toBe(2)
      expect(result.equipmentOut).toBe(4)
    })

    it('computes utilization 0 when totalEquipment is 0', async () => {
      mockEquipmentCount.mockResolvedValue(0)
      mockBookingEquipmentFindMany.mockResolvedValue([{ quantity: 5 }])
      const result = await getKpis()
      expect(result.utilization).toBe(0)
    })
  })

  describe('getCachedKpis', () => {
    it('returns cached data when Redis has value', async () => {
      const cached = {
        period: 'month',
        revenue: 1000,
        revenueToday: 100,
        bookingCount: 5,
        paidOrderCount: 4,
        utilization: 20,
        clientCount: 3,
        equipmentOut: 2,
        overdueReturns: 1,
        lowStockCount: 0,
        revenueByDay: [],
      }
      mockRedis.get.mockResolvedValueOnce(JSON.stringify(cached))
      const result = await getCachedKpis()
      expect(result).toMatchObject(cached)
    })

    it('calls getKpis and returns when cache miss', async () => {
      const result = await getCachedKpis()
      expect(result.revenue).toBeDefined()
      expect(result.bookingCount).toBeDefined()
    })

    it('falls back to getKpis when Redis get throws', async () => {
      mockRedis.get.mockRejectedValueOnce(new Error('Redis down'))
      const result = await getCachedKpis()
      expect(result.revenue).toBeDefined()
      expect(result.bookingCount).toBeDefined()
    })

    it('returns data when Redis setex throws after getKpis', async () => {
      mockRedis.get.mockResolvedValueOnce(null)
      mockRedis.setex.mockRejectedValueOnce(new Error('Redis write fail'))
      const result = await getCachedKpis()
      expect(result.revenue).toBeDefined()
    })
  })
})
