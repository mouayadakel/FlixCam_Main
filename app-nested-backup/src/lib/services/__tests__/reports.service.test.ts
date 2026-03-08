/**
 * ═══════════════════════════════════════════
 * SERVICE: reports.service
 * ═══════════════════════════════════════════
 * METHODS: generateRevenueReport, generateBookingReport, getDashboardStats, ...
 * DEPENDENCIES: prisma.booking, hasPermission
 * ═══════════════════════════════════════════
 */

import { ReportsService, calcGrowthPercent, sumBookingRevenue } from '../reports.service'
import { prisma } from '@/lib/db/prisma'
import { ForbiddenError } from '@/lib/errors'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    booking: { findMany: jest.fn(), count: jest.fn() },
    equipment: { findMany: jest.fn(), count: jest.fn() },
    product: { findMany: jest.fn(), count: jest.fn() },
    user: { findMany: jest.fn(), count: jest.fn() },
    inventoryItem: { findMany: jest.fn(), count: jest.fn() },
  },
}))

jest.mock('@/lib/auth/permissions', () => ({ hasPermission: jest.fn().mockResolvedValue(true) }))

const mockBookingFindMany = prisma.booking.findMany as jest.Mock
const mockBookingCount = prisma.booking.count as jest.Mock
const mockEquipmentFindMany = prisma.equipment.findMany as jest.Mock
const mockEquipmentCount = prisma.equipment.count as jest.Mock
const mockUserFindMany = prisma.user.findMany as jest.Mock
const mockUserCount = prisma.user.count as jest.Mock
const hasPermission = require('@/lib/auth/permissions').hasPermission as jest.Mock

const validFilter = {
  dateFrom: new Date('2025-01-01'),
  dateTo: new Date('2025-01-31'),
}

const sampleBooking = {
  id: 'bkg_1',
  totalAmount: 10000,
  status: 'CONFIRMED',
  equipment: [],
  customerId: 'usr_01',
  customer: { id: 'usr_01', name: 'Sarah Mitchell', email: 'sarah@example.com' },
  createdAt: new Date('2025-01-15'),
  startDate: new Date('2025-01-15'),
  endDate: new Date('2025-01-20'),
}

describe('sumBookingRevenue', () => {
  it('returns 0 for empty array', () => expect(sumBookingRevenue([])).toBe(0))
  it('sums totalAmount from bookings', () => {
    expect(sumBookingRevenue([{ totalAmount: 100 }, { totalAmount: 200 }])).toBe(300)
    expect(sumBookingRevenue([{ totalAmount: null }, { totalAmount: undefined }])).toBe(0)
  })
})

describe('calcGrowthPercent', () => {
  it('returns 0 when previous is 0', () => {
    expect(calcGrowthPercent(100, 0)).toBe(0)
    expect(calcGrowthPercent(0, 0)).toBe(0)
  })
  it('returns percentage when previous > 0', () => {
    expect(calcGrowthPercent(200, 100)).toBe(100)
    expect(calcGrowthPercent(50, 100)).toBe(-50)
  })
})

describe('ReportsService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    hasPermission.mockResolvedValue(true)
    mockBookingFindMany.mockResolvedValue([])
    mockBookingCount.mockResolvedValue(0)
    mockEquipmentFindMany.mockResolvedValue([])
    mockEquipmentCount.mockResolvedValue(0)
    mockUserFindMany.mockResolvedValue([])
    mockUserCount.mockResolvedValue(0)
  })

  describe('generateRevenueReport', () => {
    it('throws ForbiddenError when user lacks permission', async () => {
      hasPermission.mockResolvedValue(false)
      await expect(
        ReportsService.generateRevenueReport(validFilter, 'usr_01HX4K2M8P')
      ).rejects.toThrow(ForbiddenError)
    })

    it('returns report with totals when bookings exist', async () => {
      mockBookingFindMany.mockResolvedValue([sampleBooking])
      const result = await ReportsService.generateRevenueReport(validFilter, 'usr_01HX4K2M8P')
      expect(result).toHaveProperty('totalRevenue', 10000)
      expect(result).toHaveProperty('totalBookings', 1)
      expect(result.averageBookingValue).toBe(10000)
    })

    it('includes revenue by equipment when bookings have equipment', async () => {
      mockBookingFindMany.mockResolvedValue([
        {
          ...sampleBooking,
          equipment: [
            { equipmentId: 'eq_1', equipment: { id: 'eq_1', sku: 'SKU-1', model: 'Cam A' } },
            { equipmentId: 'eq_2', equipment: { id: 'eq_2', sku: null, model: 'Cam B' } },
          ],
        },
      ])
      const result = await ReportsService.generateRevenueReport(validFilter, 'usr_01')
      expect(result.revenueByEquipment).toHaveLength(2)
      expect(result.revenueByEquipment[0]).toMatchObject({
        equipmentId: 'eq_1',
        equipmentName: 'SKU-1',
        revenue: 5000,
        bookings: 1,
      })
    })

    it('includes revenue by customer sorted by revenue', async () => {
      mockBookingFindMany.mockResolvedValue([
        { ...sampleBooking, customerId: 'u1', customer: { id: 'u1', name: 'Alice', email: 'a@x.com' }, totalAmount: 5000 },
        { ...sampleBooking, id: 'b2', customerId: 'u2', customer: { id: 'u2', name: null, email: 'b@x.com' }, totalAmount: 3000 },
      ])
      const result = await ReportsService.generateRevenueReport(validFilter, 'usr_01')
      expect(result.revenueByCustomer).toHaveLength(2)
      expect(result.revenueByCustomer[0].revenue).toBeGreaterThanOrEqual(result.revenueByCustomer[1].revenue)
      expect(result.revenueByCustomer.find((c) => c.customerName === 'b@x.com')).toBeDefined()
    })

    it('includes revenue by status for ACTIVE, CLOSED, CANCELLED', async () => {
      mockBookingFindMany.mockResolvedValue([
        { ...sampleBooking, status: 'ACTIVE', totalAmount: 2000 },
        { ...sampleBooking, id: 'b2', status: 'CLOSED', totalAmount: 3000 },
        { ...sampleBooking, id: 'b3', status: 'CANCELLED', totalAmount: 500 },
      ])
      const result = await ReportsService.generateRevenueReport(
        { ...validFilter, includeCancelled: true },
        'usr_01'
      )
      expect(result.revenueByStatus.active).toBe(2000)
      expect(result.revenueByStatus.completed).toBe(3000)
      expect(result.revenueByStatus.cancelled).toBe(500)
    })

    it('filters by bookingStatuses when provided', async () => {
      mockBookingFindMany.mockResolvedValue([])
      await ReportsService.generateRevenueReport(
        { ...validFilter, bookingStatuses: ['CONFIRMED', 'ACTIVE'] },
        'usr_01'
      )
      expect(mockBookingFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: { in: ['CONFIRMED', 'ACTIVE'] } }),
        })
      )
    })

    it('excludes cancelled when includeCancelled is false', async () => {
      mockBookingFindMany.mockResolvedValue([])
      await ReportsService.generateRevenueReport(
        { ...validFilter, includeCancelled: false },
        'usr_01'
      )
      expect(mockBookingFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: { not: 'CANCELLED' } }),
        })
      )
    })
  })

  describe('generateBookingReport', () => {
    it('throws ForbiddenError when user lacks permission', async () => {
      hasPermission.mockResolvedValue(false)
      await expect(
        ReportsService.generateBookingReport(validFilter, 'usr_01')
      ).rejects.toThrow(ForbiddenError)
    })

    it('returns booking report with totals', async () => {
      mockBookingFindMany.mockResolvedValue([
        {
          ...sampleBooking,
          equipment: [{ equipmentId: 'eq_1', equipment: { sku: 'SKU-1', model: 'Model 1' } }],
        },
      ])
      const result = await ReportsService.generateBookingReport(validFilter, 'usr_01')
      expect(result).toHaveProperty('totalBookings', 1)
      expect(result).toHaveProperty('bookingsByStatus')
      expect(result).toHaveProperty('topCustomers')
      expect(result).toHaveProperty('topEquipment')
    })

    it('calculates average booking duration when bookings have dates', async () => {
      mockBookingFindMany.mockResolvedValue([
        {
          ...sampleBooking,
          startDate: new Date('2025-01-15'),
          endDate: new Date('2025-01-20'),
          equipment: [],
          customer: { id: 'u1', name: 'A', email: 'a@x.com' },
        },
      ])
      const result = await ReportsService.generateBookingReport(validFilter, 'usr_01')
      expect(result.averageBookingDuration).toBe(5)
    })

    it('calculates cancellation rate when some bookings cancelled', async () => {
      mockBookingFindMany.mockResolvedValue([
        { ...sampleBooking, status: 'CONFIRMED' },
        { ...sampleBooking, id: 'b2', status: 'CANCELLED' },
      ])
      const result = await ReportsService.generateBookingReport(
        { ...validFilter, includeCancelled: true },
        'usr_01'
      )
      expect(result.cancellationRate).toBe(50)
    })

    it('uses equipmentId as name when sku and model are null', async () => {
      mockBookingFindMany.mockResolvedValue([
        {
          ...sampleBooking,
          equipment: [{ equipmentId: 'eq_99', equipment: { id: 'eq_99', sku: null, model: null } }],
          customer: { id: 'u1', name: null, email: 'a@x.com' },
        },
      ])
      const result = await ReportsService.generateBookingReport(validFilter, 'usr_01')
      expect(result.topEquipment[0].equipmentName).toBe('eq_99')
    })

    it('uses model as equipment name when sku is null', async () => {
      mockBookingFindMany.mockResolvedValue([
        {
          ...sampleBooking,
          equipment: [{ equipmentId: 'eq_x', equipment: { id: 'eq_x', sku: null, model: 'Fallback Model' } }],
          customer: { id: 'u1', name: 'User', email: 'u@x.com' },
        },
      ])
      const result = await ReportsService.generateBookingReport(validFilter, 'usr_01')
      expect(result.topEquipment[0].equipmentName).toBe('Fallback Model')
    })

    it('uses email as customer name when name is null', async () => {
      mockBookingFindMany.mockResolvedValue([
        {
          ...sampleBooking,
          equipment: [],
          customer: { id: 'u1', name: null, email: 'fallback@example.com' },
        },
      ])
      const result = await ReportsService.generateBookingReport(validFilter, 'usr_01')
      expect(result.topCustomers[0].customerName).toBe('fallback@example.com')
    })

    it('sorts top customers by bookings descending', async () => {
      mockBookingFindMany.mockResolvedValue([
        { ...sampleBooking, customerId: 'u1', customer: { id: 'u1', name: 'Alice', email: 'a@x.com' } },
        { ...sampleBooking, id: 'b2', customerId: 'u1', customer: { id: 'u1', name: 'Alice', email: 'a@x.com' } },
        { ...sampleBooking, id: 'b3', customerId: 'u2', customer: { id: 'u2', name: 'Bob', email: 'b@x.com' } },
      ])
      const result = await ReportsService.generateBookingReport(validFilter, 'usr_01')
      expect(result.topCustomers[0].bookings).toBe(2)
      expect(result.topCustomers[1].bookings).toBe(1)
    })

    it('sorts top equipment by bookings descending', async () => {
      mockBookingFindMany.mockResolvedValue([
        { ...sampleBooking, equipment: [{ equipmentId: 'eq_1', equipment: { id: 'eq_1', sku: 'S1', model: 'M1' } }] },
        { ...sampleBooking, id: 'b2', equipment: [{ equipmentId: 'eq_1', equipment: { id: 'eq_1', sku: 'S1', model: 'M1' } }] },
        { ...sampleBooking, id: 'b3', equipment: [{ equipmentId: 'eq_2', equipment: { id: 'eq_2', sku: 'S2', model: 'M2' } }] },
      ])
      const result = await ReportsService.generateBookingReport(validFilter, 'usr_01')
      expect(result.topEquipment[0].bookings).toBe(2)
      expect(result.topEquipment[1].bookings).toBe(1)
    })
  })

  describe('generateEquipmentReport', () => {
    it('throws ForbiddenError when user lacks permission', async () => {
      hasPermission.mockResolvedValue(false)
      await expect(
        ReportsService.generateEquipmentReport(validFilter, 'usr_01')
      ).rejects.toThrow(ForbiddenError)
    })

    it('returns equipment report', async () => {
      mockEquipmentFindMany.mockResolvedValue([
        {
          id: 'eq_1',
          sku: 'SKU-1',
          model: 'Model 1',
          quantityTotal: 5,
          quantityAvailable: 3,
          condition: 'GOOD',
        },
      ])
      mockBookingFindMany.mockResolvedValue([])
      const result = await ReportsService.generateEquipmentReport(validFilter, 'usr_01')
      expect(result).toHaveProperty('totalEquipment', 1)
      expect(result).toHaveProperty('utilizationRate')
      expect(result).toHaveProperty('equipmentUtilization')
    })

    it('calculates utilization when equipment has bookings', async () => {
      const eq = {
        id: 'eq_1',
        sku: 'SKU-1',
        model: 'Model 1',
        quantityTotal: 5,
        quantityAvailable: 2,
        condition: 'GOOD',
      }
      mockEquipmentFindMany.mockResolvedValue([eq])
      mockBookingFindMany.mockResolvedValue([
        {
          id: 'b1',
          equipment: [{ equipmentId: 'eq_1', equipment: eq }],
          startDate: new Date('2025-01-10'),
          endDate: new Date('2025-01-15'),
          totalAmount: 5000,
        },
      ])
      const result = await ReportsService.generateEquipmentReport(validFilter, 'usr_01')
      expect(result.utilizationRate).toBeGreaterThanOrEqual(0)
      expect(result.equipmentUtilization[0].rentedDays).toBe(5)
      expect(result.equipmentUtilization[0].revenue).toBe(5000)
    })

    it('includes maintenance equipment count', async () => {
      mockEquipmentFindMany.mockResolvedValue([
        { id: 'eq_1', sku: 'S1', model: 'M1', quantityTotal: 1, quantityAvailable: 0, condition: 'MAINTENANCE' },
      ])
      mockBookingFindMany.mockResolvedValue([])
      const result = await ReportsService.generateEquipmentReport(validFilter, 'usr_01')
      expect(result.maintenanceEquipment).toBe(1)
    })

    it('returns 0 bookings for equipment with no bookings in period', async () => {
      const eq1 = { id: 'eq_1', sku: 'S1', model: 'M1', quantityTotal: 5, quantityAvailable: 3, condition: 'GOOD' }
      const eq2 = { id: 'eq_2', sku: 'S2', model: 'M2', quantityTotal: 5, quantityAvailable: 5, condition: 'GOOD' }
      mockEquipmentFindMany.mockResolvedValue([eq1, eq2])
      mockBookingFindMany.mockResolvedValue([
        {
          id: 'b1',
          equipment: [{ equipmentId: 'eq_1', equipment: eq1 }],
          startDate: new Date('2025-01-10'),
          endDate: new Date('2025-01-15'),
          totalAmount: 5000,
        },
      ])
      const result = await ReportsService.generateEquipmentReport(validFilter, 'usr_01')
      const eq1Util = result.topPerformingEquipment.find((e) => e.equipmentId === 'eq_1')
      const eq2Util = result.topPerformingEquipment.find((e) => e.equipmentId === 'eq_2')
      expect(eq1Util?.bookings).toBe(1)
      expect(eq2Util?.bookings).toBe(0)
    })
  })

  describe('generateCustomerReport', () => {
    it('throws ForbiddenError when user lacks permission', async () => {
      hasPermission.mockResolvedValue(false)
      await expect(
        ReportsService.generateCustomerReport(validFilter, 'usr_01')
      ).rejects.toThrow(ForbiddenError)
    })

    it('returns customer report', async () => {
      mockUserFindMany.mockResolvedValue([
        { id: 'usr_1', name: 'John', email: 'john@example.com', createdAt: new Date('2025-01-01') },
      ])
      mockBookingFindMany.mockResolvedValue([])
      const result = await ReportsService.generateCustomerReport(validFilter, 'usr_01')
      expect(result).toHaveProperty('totalCustomers', 1)
      expect(result).toHaveProperty('topCustomers')
      expect(result).toHaveProperty('customerRetention')
    })

    it('includes top customers with revenue when customers have bookings', async () => {
      const user = { id: 'usr_1', name: 'John', email: 'john@example.com', createdAt: new Date('2024-06-01') }
      mockUserFindMany.mockResolvedValue([user])
      mockBookingFindMany.mockResolvedValue([
        {
          id: 'b1',
          customerId: 'usr_1',
          totalAmount: 5000,
          createdAt: new Date('2025-01-10'),
          customer: { id: 'usr_1', name: 'John', email: 'john@example.com' },
        },
      ])
      const result = await ReportsService.generateCustomerReport(validFilter, 'usr_01')
      expect(result.topCustomers[0]).toMatchObject({
        customerId: 'usr_1',
        customerName: 'John',
        bookings: 1,
        revenue: 5000,
      })
    })

    it('calculates retention for returning customers', async () => {
      mockUserFindMany.mockResolvedValue([
        { id: 'u1', name: 'A', email: 'a@x.com', createdAt: new Date('2024-01-01') },
        { id: 'u2', name: 'B', email: 'b@x.com', createdAt: new Date('2024-01-01') },
      ])
      mockBookingFindMany.mockResolvedValue([
        { id: 'b1', customerId: 'u1', totalAmount: 100, createdAt: new Date('2025-01-01') },
        { id: 'b2', customerId: 'u1', totalAmount: 200, createdAt: new Date('2025-01-15') },
      ])
      const result = await ReportsService.generateCustomerReport(validFilter, 'usr_01')
      expect(result.customerRetention.returningCustomers).toBe(1)
    })
  })

  describe('generateFinancialReport', () => {
    it('throws ForbiddenError when user lacks permission', async () => {
      hasPermission.mockResolvedValue(false)
      await expect(
        ReportsService.generateFinancialReport(validFilter, 'usr_01')
      ).rejects.toThrow(ForbiddenError)
    })

    it('returns financial report', async () => {
      mockBookingFindMany.mockResolvedValue([sampleBooking])
      const result = await ReportsService.generateFinancialReport(validFilter, 'usr_01')
      expect(result).toHaveProperty('revenue')
      expect(result.revenue.total).toBe(10000)
      expect(result).toHaveProperty('profit')
      expect(result).toHaveProperty('vat')
    })
  })

  describe('generateInventoryReport', () => {
    it('throws ForbiddenError when user lacks permission', async () => {
      hasPermission.mockResolvedValue(false)
      await expect(
        ReportsService.generateInventoryReport(validFilter, 'usr_01')
      ).rejects.toThrow(ForbiddenError)
    })

    it('returns inventory report', async () => {
      mockEquipmentFindMany.mockResolvedValue([
        {
          id: 'eq_1',
          sku: 'SKU-1',
          model: 'Model 1',
          quantityTotal: 5,
          quantityAvailable: 3,
          condition: 'GOOD',
          category: { id: 'cat_1', name: 'Cameras' },
        },
      ])
      const result = await ReportsService.generateInventoryReport(validFilter, 'usr_01')
      expect(result).toHaveProperty('totalItems', 5)
      expect(result).toHaveProperty('availableItems', 3)
      expect(result).toHaveProperty('byCategory')
      expect(result).toHaveProperty('byCondition')
    })

    it('includes byCondition for all conditions and lowStockItems', async () => {
      mockEquipmentFindMany.mockResolvedValue([
        { id: 'e1', sku: 'S1', model: 'M1', quantityTotal: 10, quantityAvailable: 1, condition: 'EXCELLENT', category: { id: 'c1', name: null } },
        { id: 'e2', sku: 'S2', model: 'M2', quantityTotal: 5, quantityAvailable: 4, condition: 'GOOD', category: { id: 'c1', name: 'Cat' } },
        { id: 'e3', sku: 'S3', model: 'M3', quantityTotal: 3, quantityAvailable: 2, condition: 'FAIR', category: { id: 'c2', name: 'Cat2' } },
        { id: 'e4', sku: 'S4', model: 'M4', quantityTotal: 2, quantityAvailable: 0, condition: 'POOR', category: { id: 'c2', name: 'Cat2' } },
        { id: 'e5', sku: 'S5', model: 'M5', quantityTotal: 1, quantityAvailable: 0, condition: 'MAINTENANCE', category: { id: 'c3', name: 'Maint' } },
      ])
      const result = await ReportsService.generateInventoryReport(validFilter, 'usr_01')
      expect(result.byCondition.excellent).toBe(10)
      expect(result.byCondition.good).toBe(5)
      expect(result.byCondition.fair).toBe(3)
      expect(result.byCondition.poor).toBe(2)
      expect(result.byCondition.maintenance).toBe(1)
      expect(result.lowStockItems.length).toBeGreaterThan(0)
      expect(result.byCategory.length).toBeGreaterThan(0)
    })

    it('calculates utilization in byCategory when items > 0', async () => {
      mockEquipmentFindMany.mockResolvedValue([
        { id: 'e1', sku: 'S1', model: 'M1', quantityTotal: 10, quantityAvailable: 2, condition: 'GOOD', category: { id: 'c1', name: 'Cat' } },
      ])
      const result = await ReportsService.generateInventoryReport(validFilter, 'usr_01')
      expect(result.byCategory[0].utilization).toBe(80)
    })
  })

  describe('getDashboardStats', () => {
    it('throws ForbiddenError when user lacks permission', async () => {
      hasPermission.mockResolvedValue(false)
      await expect(ReportsService.getDashboardStats('usr_01HX4K2M8P')).rejects.toThrow(ForbiddenError)
    })

    it('returns dashboard stats when user has permission', async () => {
      mockBookingFindMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
      mockBookingCount.mockResolvedValue(0)
      mockEquipmentFindMany.mockResolvedValue([
        { quantityAvailable: 3, quantityTotal: 5, condition: 'GOOD' },
      ])
      mockEquipmentCount
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(0)
      mockUserCount
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)
        .mockResolvedValueOnce(0)

      const result = await ReportsService.getDashboardStats('usr_01')
      expect(result).toHaveProperty('revenue')
      expect(result).toHaveProperty('bookings')
      expect(result).toHaveProperty('equipment')
      expect(result).toHaveProperty('customers')
    })

    it('calculates revenue and bookings growth when prior period has data', async () => {
      const now = new Date()
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      mockBookingFindMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ totalAmount: 2000 }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([{ totalAmount: 1000 }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
      mockBookingCount.mockResolvedValue(0)
      mockEquipmentFindMany.mockResolvedValue([
        { quantityAvailable: 2, quantityTotal: 5, condition: 'GOOD' },
      ])
      mockEquipmentCount.mockResolvedValue(1)
      mockUserCount.mockResolvedValue(0)

      const result = await ReportsService.getDashboardStats('usr_01')
      expect(result.revenue.growth).toBeDefined()
      expect(result.bookings.growth).toBeDefined()
    })

    it('returns zero growth when both months have no bookings', async () => {
      mockBookingFindMany
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
      mockBookingCount.mockResolvedValue(0)
      mockEquipmentFindMany.mockResolvedValue([
        { quantityAvailable: 2, quantityTotal: 5, condition: 'GOOD' },
      ])
      mockEquipmentCount.mockResolvedValue(1)
      mockUserCount.mockResolvedValue(0)

      const result = await ReportsService.getDashboardStats('usr_01')
      expect(result.revenue.growth).toBe(0)
      expect(result.bookings.growth).toBe(0)
    })
  })
})
