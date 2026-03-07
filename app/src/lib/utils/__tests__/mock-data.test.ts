/**
 * Unit tests for mock-data - verifies all exports exist and have expected structure
 */

import {
  mockEquipment,
  mockBookings,
  mockCategories,
  mockStats,
  mockActivities,
  mockUsers,
  mockOrders,
  mockInvoices,
  mockWalletTransactions,
  mockStudios,
  mockTechnicians,
  mockCoupons,
  type MockEquipment,
  type MockBooking,
  type MockCategory,
  type MockUser,
  type MockOrder,
  type MockInvoice,
  type MockWalletTx,
  type MockStudio,
  type MockTechnician,
  type MockCoupon,
  type MockStat,
  type MockActivity,
} from '../mock-data'

describe('mock-data', () => {
  describe('mockEquipment', () => {
    it('exports array with items', () => {
      expect(Array.isArray(mockEquipment)).toBe(true)
      expect(mockEquipment.length).toBeGreaterThan(0)
    })
    it('items have required MockEquipment fields', () => {
      const item = mockEquipment[0] as MockEquipment
      expect(item).toHaveProperty('id')
      expect(item).toHaveProperty('name')
      expect(item).toHaveProperty('sku')
      expect(item).toHaveProperty('category')
      expect(item).toHaveProperty('brand')
      expect(item).toHaveProperty('status')
      expect(item).toHaveProperty('stock')
      expect(item).toHaveProperty('updatedAt')
    })
  })

  describe('mockBookings', () => {
    it('exports array with items', () => {
      expect(Array.isArray(mockBookings)).toBe(true)
      expect(mockBookings.length).toBeGreaterThan(0)
    })
    it('items have required MockBooking fields', () => {
      const item = mockBookings[0] as MockBooking
      expect(item).toHaveProperty('id')
      expect(item).toHaveProperty('bookingNumber')
      expect(item).toHaveProperty('customer')
      expect(item).toHaveProperty('status')
      expect(item).toHaveProperty('totalAmount')
      expect(item).toHaveProperty('startDate')
      expect(item).toHaveProperty('endDate')
      expect(item).toHaveProperty('createdAt')
    })
  })

  describe('mockCategories', () => {
    it('exports array with items', () => {
      expect(Array.isArray(mockCategories)).toBe(true)
      const item = mockCategories[0] as MockCategory
      expect(item).toHaveProperty('id')
      expect(item).toHaveProperty('name')
      expect(item).toHaveProperty('slug')
      expect(item).toHaveProperty('equipmentCount')
    })
  })

  describe('mockStats', () => {
    it('exports array with items', () => {
      expect(Array.isArray(mockStats)).toBe(true)
      const item = mockStats[0] as MockStat
      expect(item).toHaveProperty('label')
      expect(item).toHaveProperty('value')
    })
  })

  describe('mockActivities', () => {
    it('exports array with items', () => {
      expect(Array.isArray(mockActivities)).toBe(true)
      const item = mockActivities[0] as MockActivity
      expect(item).toHaveProperty('id')
      expect(item).toHaveProperty('action')
      expect(item).toHaveProperty('user')
      expect(item).toHaveProperty('resource')
      expect(item).toHaveProperty('timestamp')
    })
  })

  describe('mockUsers', () => {
    it('exports array with items', () => {
      expect(Array.isArray(mockUsers)).toBe(true)
      const item = mockUsers[0] as MockUser
      expect(item).toHaveProperty('id')
      expect(item).toHaveProperty('name')
      expect(item).toHaveProperty('email')
      expect(item).toHaveProperty('role')
      expect(item).toHaveProperty('status')
    })
  })

  describe('mockOrders', () => {
    it('exports array with items', () => {
      expect(Array.isArray(mockOrders)).toBe(true)
      const item = mockOrders[0] as MockOrder
      expect(item).toHaveProperty('id')
      expect(item).toHaveProperty('orderNumber')
      expect(item).toHaveProperty('customer')
      expect(item).toHaveProperty('status')
      expect(item).toHaveProperty('totalAmount')
      expect(item).toHaveProperty('createdAt')
    })
  })

  describe('mockInvoices', () => {
    it('exports array with items', () => {
      expect(Array.isArray(mockInvoices)).toBe(true)
      const item = mockInvoices[0] as MockInvoice
      expect(item).toHaveProperty('id')
      expect(item).toHaveProperty('invoiceNumber')
      expect(item).toHaveProperty('orderNumber')
      expect(item).toHaveProperty('amount')
      expect(item).toHaveProperty('status')
      expect(item).toHaveProperty('dueDate')
      expect(item).toHaveProperty('createdAt')
    })
  })

  describe('mockWalletTransactions', () => {
    it('exports array with items', () => {
      expect(Array.isArray(mockWalletTransactions)).toBe(true)
      const item = mockWalletTransactions[0] as MockWalletTx
      expect(item).toHaveProperty('id')
      expect(item).toHaveProperty('user')
      expect(item).toHaveProperty('type')
      expect(item).toHaveProperty('amount')
      expect(item).toHaveProperty('balance')
      expect(item).toHaveProperty('createdAt')
    })
  })

  describe('mockStudios', () => {
    it('exports array with items', () => {
      expect(Array.isArray(mockStudios)).toBe(true)
      const item = mockStudios[0] as MockStudio
      expect(item).toHaveProperty('id')
      expect(item).toHaveProperty('name')
      expect(item).toHaveProperty('location')
      expect(item).toHaveProperty('status')
      expect(item).toHaveProperty('rate')
      expect(item).toHaveProperty('capacity')
    })
  })

  describe('mockTechnicians', () => {
    it('exports array with items', () => {
      expect(Array.isArray(mockTechnicians)).toBe(true)
      const item = mockTechnicians[0] as MockTechnician
      expect(item).toHaveProperty('id')
      expect(item).toHaveProperty('name')
      expect(item).toHaveProperty('phone')
      expect(item).toHaveProperty('specialty')
      expect(item).toHaveProperty('status')
      expect(item).toHaveProperty('jobs')
    })
  })

  describe('mockCoupons', () => {
    it('exports array with items', () => {
      expect(Array.isArray(mockCoupons)).toBe(true)
      const item = mockCoupons[0] as MockCoupon
      expect(item).toHaveProperty('id')
      expect(item).toHaveProperty('code')
      expect(item).toHaveProperty('type')
      expect(item).toHaveProperty('value')
      expect(item).toHaveProperty('usage')
      expect(item).toHaveProperty('status')
      expect(item).toHaveProperty('expiresAt')
    })
  })
})
