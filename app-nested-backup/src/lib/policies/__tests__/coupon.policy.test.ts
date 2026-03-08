/**
 * Unit tests for coupon.policy
 */

import { CouponPolicy } from '@/lib/policies/coupon.policy'

jest.mock('@/lib/auth/permissions', () => ({
  hasPermission: jest.fn(),
}))

const { hasPermission } = require('@/lib/auth/permissions')

describe('CouponPolicy', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('canView', () => {
    it('returns allowed true when user has coupon.read', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(true)
      const result = await CouponPolicy.canView('user_1')
      expect(result.allowed).toBe(true)
    })
    it('returns allowed false when user lacks coupon.read', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(false)
      const result = await CouponPolicy.canView('user_1')
      expect(result.allowed).toBe(false)
      expect(result.reason).toBeDefined()
    })
  })

  describe('hasCouponPermission (private)', () => {
    it('returns false when action is not in permissionMap', async () => {
      const hasCouponPermission = (CouponPolicy as any)['hasCouponPermission']
      const result = await hasCouponPermission('user_1', 'invalid' as any)
      expect(result).toBe(false)
    })
  })

  describe('canCreate', () => {
    it('returns allowed true when user has coupon.create', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(true)
      const result = await CouponPolicy.canCreate('user_1')
      expect(result.allowed).toBe(true)
    })
    it('returns allowed false when user lacks coupon.create', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(false)
      const result = await CouponPolicy.canCreate('user_1')
      expect(result.allowed).toBe(false)
    })
  })

  describe('canUpdate', () => {
    it('returns allowed when user has coupon.update', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(true)
      const result = await CouponPolicy.canUpdate('user_1', 'coupon_1')
      expect(result.allowed).toBe(true)
    })
    it('returns denied when user lacks permission', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(false)
      const result = await CouponPolicy.canUpdate('user_1', 'coupon_1')
      expect(result.allowed).toBe(false)
    })
  })

  describe('canDelete', () => {
    it('returns allowed when user has coupon.delete', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(true)
      const result = await CouponPolicy.canDelete('user_1', 'coupon_1')
      expect(result.allowed).toBe(true)
    })
    it('returns denied when user lacks permission', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(false)
      const result = await CouponPolicy.canDelete('user_1', 'coupon_1')
      expect(result.allowed).toBe(false)
    })
  })
})
