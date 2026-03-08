/**
 * Unit tests for dashboard.service (getKpis, getCachedKpis)
 */

import { getKpis, getCachedKpis } from '../dashboard.service'
import { prisma } from '@/lib/db/prisma'
import { getRedisClient } from '@/lib/queue/redis.client'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    payment: { findMany: jest.fn() },
    booking: { count: jest.fn(), findMany: jest.fn() },
    equipment: { count: jest.fn() },
    bookingEquipment: { findMany: jest.fn() },
  },
}))

const mockRedis = { get: jest.fn(), setex: jest.fn() }
jest.mock('@/lib/queue/redis.client', () => ({ getRedisClient: jest.fn(() => mockRedis) }))

const mockPaymentFindMany = prisma.payment.findMany as jest.Mock
const mockBookingCount = prisma.booking.count as jest.Mock
const mockEquipmentCount = prisma.equipment.count as jest.Mock
const mockBookingEquipmentFindMany = prisma.bookingEquipment.findMany as jest.Mock
const mockBookingFindMany = prisma.booking.findMany as jest.Mock

describe('dashboard.service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockRedis.get.mockResolvedValue(null)
    mockRedis.setex.mockResolvedValue(undefined)
    mockPaymentFindMany.mockResolvedValue([])
    mockBookingCount.mockResolvedValue(0)
    mockEquipmentCount.mockResolvedValue(10)
    mockBookingEquipmentFindMany.mockResolvedValue([])
    mockBookingFindMany.mockResolvedValue([])
  })

  describe('getKpis', () => {
    it('returns DashboardKpis with revenue, bookingCount, utilization, clientCount, revenueByDay', async () => {
      const result = await getKpis()
      expect(result).toMatchObject({
        revenue: expect.any(Number),
        bookingCount: expect.any(Number),
        utilization: expect.any(Number),
        clientCount: expect.any(Number),
        revenueByDay: expect.any(Array),
      })
      expect(result.revenueByDay.length).toBe(7)
    })

    it('aggregates revenue by day when payments exist', async () => {
      mockPaymentFindMany
        .mockResolvedValueOnce([{ amount: 1000 }, { amount: 500 }])
        .mockResolvedValueOnce([{ amount: 200 }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
      const result = await getKpis()
      expect(result.revenue).toBe(1500)
      expect(result.revenueByDay).toHaveLength(7)
      expect(result.revenueByDay.some((d) => d.revenue > 0)).toBe(true)
    })

    it('computes utilization when totalEquipment > 0 and activeBookingEquipment has quantity', async () => {
      mockPaymentFindMany.mockResolvedValue([])
      mockBookingCount.mockResolvedValue(5)
      mockEquipmentCount.mockResolvedValue(10)
      mockBookingEquipmentFindMany.mockResolvedValue([{ quantity: 3 }, { quantity: 2 }])
      mockBookingFindMany.mockResolvedValue([{ customerId: 'c1' }, { customerId: 'c2' }])
      const result = await getKpis()
      expect(result.utilization).toBe(50)
      expect(result.clientCount).toBe(2)
    })

    it('computes utilization 0 when totalEquipment is 0', async () => {
      mockPaymentFindMany.mockResolvedValue([])
      mockEquipmentCount.mockResolvedValue(0)
      mockBookingEquipmentFindMany.mockResolvedValue([{ quantity: 5 }])
      const result = await getKpis()
      expect(result.utilization).toBe(0)
    })
  })

  describe('getCachedKpis', () => {
    it('returns cached data when Redis has value', async () => {
      const cached = { revenue: 1000, bookingCount: 5, utilization: 20, clientCount: 3, revenueByDay: [] }
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
