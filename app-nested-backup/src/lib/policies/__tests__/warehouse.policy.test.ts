/**
 * Unit tests for warehouse.policy
 */

import { WarehousePolicy } from '../warehouse.policy'

jest.mock('@/lib/auth/permissions', () => ({
  hasPermission: jest.fn(),
}))

const hasPermission = require('@/lib/auth/permissions').hasPermission as jest.Mock

describe('WarehousePolicy', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('canCheckOut', () => {
    it('returns allowed when user has warehouse.check_out', async () => {
      hasPermission.mockResolvedValue(true)
      const result = await WarehousePolicy.canCheckOut('user_1')
      expect(result.allowed).toBe(true)
    })
    it('returns denied when user lacks permission', async () => {
      hasPermission.mockResolvedValue(false)
      const result = await WarehousePolicy.canCheckOut('user_1')
      expect(result.allowed).toBe(false)
    })
  })

  describe('canCheckIn', () => {
    it('returns allowed when user has warehouse.check_in', async () => {
      hasPermission.mockResolvedValue(true)
      const result = await WarehousePolicy.canCheckIn('user_1')
      expect(result.allowed).toBe(true)
    })
    it('returns denied when user lacks permission', async () => {
      hasPermission.mockResolvedValue(false)
      const result = await WarehousePolicy.canCheckIn('user_1')
      expect(result.allowed).toBe(false)
    })
  })

  describe('canViewInventory', () => {
    it('returns allowed when user has warehouse.read', async () => {
      hasPermission.mockResolvedValue(true)
      const result = await WarehousePolicy.canViewInventory('user_1')
      expect(result.allowed).toBe(true)
    })
    it('returns denied when user lacks permission', async () => {
      hasPermission.mockResolvedValue(false)
      const result = await WarehousePolicy.canViewInventory('user_1')
      expect(result.allowed).toBe(false)
    })
  })

  describe('canManage', () => {
    it('returns allowed when user has warehouse.manage', async () => {
      hasPermission.mockResolvedValue(true)
      const result = await WarehousePolicy.canManage('user_1')
      expect(result.allowed).toBe(true)
    })
    it('returns denied when user lacks permission', async () => {
      hasPermission.mockResolvedValue(false)
      const result = await WarehousePolicy.canManage('user_1')
      expect(result.allowed).toBe(false)
    })
  })

  describe('hasWarehousePermission (private)', () => {
    it('returns false when action is not in permissionMap', async () => {
      const fn = (WarehousePolicy as any)['hasWarehousePermission']
      expect(await fn('user_1', 'invalid' as any)).toBe(false)
    })
  })
})
