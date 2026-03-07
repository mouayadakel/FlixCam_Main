/**
 * Unit tests for payment.policy
 */

import { PaymentPolicy } from '@/lib/policies/payment.policy'

jest.mock('@/lib/auth/permissions', () => ({
  hasPermission: jest.fn(),
}))

const { hasPermission } = require('@/lib/auth/permissions')

describe('PaymentPolicy', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('canView', () => {
    it('returns allowed when user has payment.read', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(true)
      const result = await PaymentPolicy.canView('user_1')
      expect(result.allowed).toBe(true)
    })
    it('returns denied when user lacks permission', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(false)
      const result = await PaymentPolicy.canView('user_1')
      expect(result.allowed).toBe(false)
    })
  })

  describe('canCreate', () => {
    it('returns allowed when user has payment.create', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(true)
      const result = await PaymentPolicy.canCreate('user_1')
      expect(result.allowed).toBe(true)
    })
    it('returns denied when user lacks permission', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(false)
      const result = await PaymentPolicy.canCreate('user_1')
      expect(result.allowed).toBe(false)
    })
  })

  describe('canUpdate', () => {
    it('returns allowed when user has payment.update', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(true)
      const result = await PaymentPolicy.canUpdate('user_1', 'pay_1')
      expect(result.allowed).toBe(true)
    })
    it('returns denied when user lacks permission', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(false)
      const result = await PaymentPolicy.canUpdate('user_1', 'pay_1')
      expect(result.allowed).toBe(false)
    })
  })

  describe('canRefund', () => {
    it('returns allowed when user has payment.refund', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(true)
      const result = await PaymentPolicy.canRefund('user_1')
      expect(result.allowed).toBe(true)
    })
    it('returns denied when user lacks payment.refund', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(false)
      const result = await PaymentPolicy.canRefund('user_1')
      expect(result.allowed).toBe(false)
    })
  })

  describe('canDelete', () => {
    it('returns allowed when user has payment.delete', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(true)
      const result = await PaymentPolicy.canDelete('user_1', 'pay_1')
      expect(result.allowed).toBe(true)
    })
    it('returns denied when user lacks permission', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(false)
      const result = await PaymentPolicy.canDelete('user_1', 'pay_1')
      expect(result.allowed).toBe(false)
    })
  })

  describe('hasPaymentPermission (private)', () => {
    it('returns false when action is not in permissionMap', async () => {
      const fn = (PaymentPolicy as any)['hasPaymentPermission']
      expect(await fn('user_1', 'invalid' as any)).toBe(false)
    })
  })
})
