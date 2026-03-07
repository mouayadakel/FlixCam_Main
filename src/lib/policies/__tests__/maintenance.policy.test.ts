/**
 * Unit tests for maintenance.policy
 */

import { MaintenancePolicy } from '../maintenance.policy'

jest.mock('@/lib/auth/permissions', () => ({
  hasPermission: jest.fn(),
}))

const hasPermission = require('@/lib/auth/permissions').hasPermission as jest.Mock

describe('MaintenancePolicy', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('canCreate', () => {
    it('returns allowed when user has maintenance.create', async () => {
      hasPermission.mockResolvedValue(true)
      const result = await MaintenancePolicy.canCreate('user_1')
      expect(result.allowed).toBe(true)
    })
    it('returns denied when user lacks permission', async () => {
      hasPermission.mockResolvedValue(false)
      const result = await MaintenancePolicy.canCreate('user_1')
      expect(result.allowed).toBe(false)
      expect(result.reason).toBeDefined()
    })
  })

  describe('canView', () => {
    it('returns allowed when user has maintenance.read', async () => {
      hasPermission.mockResolvedValue(true)
      const result = await MaintenancePolicy.canView('user_1')
      expect(result.allowed).toBe(true)
    })
    it('returns denied when user lacks permission', async () => {
      hasPermission.mockResolvedValue(false)
      const result = await MaintenancePolicy.canView('user_1')
      expect(result.allowed).toBe(false)
    })
  })

  describe('canUpdate', () => {
    it('returns allowed when user has maintenance.update', async () => {
      hasPermission.mockResolvedValue(true)
      const result = await MaintenancePolicy.canUpdate('user_1', 'maint_1')
      expect(result.allowed).toBe(true)
    })
    it('returns denied when user lacks permission', async () => {
      hasPermission.mockResolvedValue(false)
      const result = await MaintenancePolicy.canUpdate('user_1', 'maint_1')
      expect(result.allowed).toBe(false)
    })
  })

  describe('canComplete', () => {
    it('returns allowed when user has maintenance.complete', async () => {
      hasPermission.mockResolvedValue(true)
      const result = await MaintenancePolicy.canComplete('user_1')
      expect(result.allowed).toBe(true)
    })
    it('returns denied when user lacks permission', async () => {
      hasPermission.mockResolvedValue(false)
      const result = await MaintenancePolicy.canComplete('user_1')
      expect(result.allowed).toBe(false)
    })
  })

  describe('canDelete', () => {
    it('returns allowed when user has maintenance.delete', async () => {
      hasPermission.mockResolvedValue(true)
      const result = await MaintenancePolicy.canDelete('user_1', 'maint_1')
      expect(result.allowed).toBe(true)
    })
    it('returns denied when user lacks permission', async () => {
      hasPermission.mockResolvedValue(false)
      const result = await MaintenancePolicy.canDelete('user_1', 'maint_1')
      expect(result.allowed).toBe(false)
    })
  })

  describe('hasMaintenancePermission (private)', () => {
    it('returns false when action is not in permissionMap', async () => {
      const fn = (MaintenancePolicy as any)['hasMaintenancePermission']
      expect(await fn('user_1', 'invalid' as any)).toBe(false)
    })
  })
})
