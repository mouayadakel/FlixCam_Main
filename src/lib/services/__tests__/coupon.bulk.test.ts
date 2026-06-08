/**
 * @file coupon.bulk.test.ts
 * @description Unit tests for Coupon validation rules and combinations
 * @module lib/services/__tests__/coupon.bulk.test
 */

import { CouponService } from '../coupon.service'
import { prisma } from '@/lib/db/prisma'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    coupon: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  },
}))

jest.mock('@/lib/auth/permissions', () => ({
  ...jest.requireActual('@/lib/auth/permissions'),
  hasPermission: jest.fn().mockResolvedValue(true),
}))

describe('CouponService - Marketing & Exclusions Audit', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('validate', () => {
    it('should correctly round fractional discount values to 2 decimal places', async () => {
      ;(prisma.coupon.findFirst as jest.Mock).mockResolvedValue({
        id: 'coupon_percent',
        code: 'SAVE15',
        name: 'Save 15%',
        type: 'PERCENT',
        discountPercentage: 15.00,
        discountValue: null,
        minimumAmount: null,
        maximumDiscount: null,
        validFrom: new Date(Date.now() - 3600000), // 1 hour ago
        validUntil: new Date(Date.now() + 3600000), // 1 hour from now
        usedCount: 0,
        usageLimit: 10,
        status: 'ACTIVE',
        applicableEquipmentIds: null,
        canCombineWithOtherOffers: true,
      })

      // 423.45 * 15% = 63.5175, which rounds up to 63.52
      const result = await CouponService.validate('SAVE15', 423.45)
      expect(result.valid).toBe(true)
      expect(result.discountAmount).toBe(63.52)
    })

    it('should return stackability metadata parameter for combine exclusions', async () => {
      ;(prisma.coupon.findFirst as jest.Mock).mockResolvedValue({
        id: 'coupon_exclusive',
        code: 'EXCL30',
        name: 'Exclusive discount',
        type: 'FIXED',
        discountValue: 30.00,
        discountPercentage: null,
        minimumAmount: null,
        maximumDiscount: null,
        validFrom: new Date(Date.now() - 3600000),
        validUntil: new Date(Date.now() + 3600000),
        usedCount: 0,
        usageLimit: 100,
        status: 'ACTIVE',
        applicableEquipmentIds: null,
        canCombineWithOtherOffers: false, // Strict exclusivity
      })

      const result = await CouponService.validate('EXCL30', 200.00)
      expect(result.valid).toBe(true)
      expect(result.discountAmount).toBe(30.00)
      expect(result.metadata?.canCombineWithOtherOffers).toBe(false)
    })
  })
})
