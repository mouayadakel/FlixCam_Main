/**
 * Unit tests for reports.policy
 */

import { ReportsPolicy } from '../reports.policy'

jest.mock('@/lib/auth/permissions', () => ({
  hasPermission: jest.fn(),
}))

const hasPermission = require('@/lib/auth/permissions').hasPermission as jest.Mock

describe('ReportsPolicy', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('canView', () => {
    it('returns allowed when user has reports.read', async () => {
      hasPermission.mockResolvedValue(true)
      const result = await ReportsPolicy.canView('user_1')
      expect(result.allowed).toBe(true)
    })
    it('returns denied when user lacks permission', async () => {
      hasPermission.mockResolvedValue(false)
      const result = await ReportsPolicy.canView('user_1')
      expect(result.allowed).toBe(false)
    })
  })

  describe('canExport', () => {
    it('returns allowed when user has reports.export', async () => {
      hasPermission.mockResolvedValue(true)
      const result = await ReportsPolicy.canExport('user_1')
      expect(result.allowed).toBe(true)
    })
    it('returns denied when user lacks permission', async () => {
      hasPermission.mockResolvedValue(false)
      const result = await ReportsPolicy.canExport('user_1')
      expect(result.allowed).toBe(false)
    })
  })

  describe('hasReportsPermission (private)', () => {
    it('returns false when action is not in permissionMap', async () => {
      const fn = (ReportsPolicy as any)['hasReportsPermission']
      expect(await fn('user_1', 'invalid' as any)).toBe(false)
    })
  })
})
