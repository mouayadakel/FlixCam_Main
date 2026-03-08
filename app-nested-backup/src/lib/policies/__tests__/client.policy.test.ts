/**
 * Unit tests for client.policy
 */

import { ClientPolicy } from '@/lib/policies/client.policy'

jest.mock('@/lib/auth/permissions', () => ({
  hasPermission: jest.fn(),
}))

const { hasPermission } = require('@/lib/auth/permissions')

describe('ClientPolicy', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('canView', () => {
    it('returns allowed false when user lacks client.read permission', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(false)
      const result = await ClientPolicy.canView('user_1')
      expect(result.allowed).toBe(false)
      expect(hasPermission).toHaveBeenCalledWith('user_1', 'client.read')
    })
    it('returns allowed true when user has client.read permission', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(true)
      const result = await ClientPolicy.canView('user_1')
      expect(result.allowed).toBe(true)
    })
  })

  describe('canCreate', () => {
    it('returns allowed false when user lacks client.create permission', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(false)
      const result = await ClientPolicy.canCreate('user_1')
      expect(result.allowed).toBe(false)
      expect(hasPermission).toHaveBeenCalledWith('user_1', 'client.create')
    })
    it('returns allowed true when user has client.create permission', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(true)
      const result = await ClientPolicy.canCreate('user_1')
      expect(result.allowed).toBe(true)
    })
  })

  describe('canUpdate', () => {
    it('returns allowed false when user lacks client.update permission', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(false)
      const result = await ClientPolicy.canUpdate('user_1', 'client_1')
      expect(result.allowed).toBe(false)
      expect(hasPermission).toHaveBeenCalledWith('user_1', 'client.update')
    })
    it('returns allowed true when user has client.update permission', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(true)
      const result = await ClientPolicy.canUpdate('user_1', 'client_1')
      expect(result.allowed).toBe(true)
    })
  })

  describe('canDelete', () => {
    it('returns allowed false when user lacks client.delete permission', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(false)
      const result = await ClientPolicy.canDelete('user_1', 'client_1')
      expect(result.allowed).toBe(false)
      expect(hasPermission).toHaveBeenCalledWith('user_1', 'client.delete')
    })
    it('returns allowed true when user has client.delete permission', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(true)
      const result = await ClientPolicy.canDelete('user_1', 'client_1')
      expect(result.allowed).toBe(true)
    })
  })

  describe('hasClientPermission (private)', () => {
    it('returns false when action is not in permissionMap', async () => {
      const hasClientPermission = (ClientPolicy as any)['hasClientPermission']
      const result = await hasClientPermission('user_1', 'invalid' as any)
      expect(result).toBe(false)
    })
  })
})
