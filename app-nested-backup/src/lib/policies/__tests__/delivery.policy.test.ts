/**
 * Unit tests for delivery.policy
 */

import { DeliveryPolicy } from '@/lib/policies/delivery.policy'

jest.mock('@/lib/auth/permissions', () => ({
  hasPermission: jest.fn(),
}))

const { hasPermission } = require('@/lib/auth/permissions')

describe('DeliveryPolicy', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('canSchedule', () => {
    it('returns allowed true when user has delivery.schedule', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(true)
      const result = await DeliveryPolicy.canSchedule('user_1')
      expect(result.allowed).toBe(true)
    })
    it('returns denied when user lacks permission', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(false)
      const result = await DeliveryPolicy.canSchedule('user_1')
      expect(result.allowed).toBe(false)
    })
  })

  describe('canUpdate', () => {
    it('returns allowed when user has delivery.update', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(true)
      const result = await DeliveryPolicy.canUpdate('user_1')
      expect(result.allowed).toBe(true)
    })
    it('returns denied when user lacks permission', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(false)
      const result = await DeliveryPolicy.canUpdate('user_1')
      expect(result.allowed).toBe(false)
    })
  })

  describe('canView', () => {
    it('returns allowed when user has delivery.read', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(true)
      const result = await DeliveryPolicy.canView('user_1')
      expect(result.allowed).toBe(true)
    })
    it('returns denied when user lacks delivery.read', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(false)
      const result = await DeliveryPolicy.canView('user_1')
      expect(result.allowed).toBe(false)
    })
  })

  describe('canManage', () => {
    it('returns allowed when user has delivery.manage', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(true)
      const result = await DeliveryPolicy.canManage('user_1')
      expect(result.allowed).toBe(true)
    })
    it('returns denied when user lacks permission', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(false)
      const result = await DeliveryPolicy.canManage('user_1')
      expect(result.allowed).toBe(false)
    })
  })

  describe('hasDeliveryPermission (private)', () => {
    it('returns false when action is not in permissionMap', async () => {
      const fn = (DeliveryPolicy as any)['hasDeliveryPermission']
      expect(await fn('user_1', 'invalid' as any)).toBe(false)
    })
  })
})
