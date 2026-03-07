/**
 * Unit tests for marketing.policy
 */

import { MarketingPolicy } from '../marketing.policy'

jest.mock('@/lib/auth/permissions', () => ({
  hasPermission: jest.fn(),
}))

const hasPermission = require('@/lib/auth/permissions').hasPermission as jest.Mock

describe('MarketingPolicy', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('canView', () => {
    it('returns allowed when user has marketing.read', async () => {
      hasPermission.mockResolvedValue(true)
      const result = await MarketingPolicy.canView('user_1')
      expect(result.allowed).toBe(true)
    })
    it('returns denied when user lacks permission', async () => {
      hasPermission.mockResolvedValue(false)
      const result = await MarketingPolicy.canView('user_1')
      expect(result.allowed).toBe(false)
    })
  })

  describe('canCreate', () => {
    it('returns allowed when user has marketing.create', async () => {
      hasPermission.mockResolvedValue(true)
      const result = await MarketingPolicy.canCreate('user_1')
      expect(result.allowed).toBe(true)
    })
    it('returns denied when user lacks permission', async () => {
      hasPermission.mockResolvedValue(false)
      const result = await MarketingPolicy.canCreate('user_1')
      expect(result.allowed).toBe(false)
    })
  })

  describe('canUpdate', () => {
    it('returns allowed when user has marketing.update', async () => {
      hasPermission.mockResolvedValue(true)
      const result = await MarketingPolicy.canUpdate('user_1', 'camp_1')
      expect(result.allowed).toBe(true)
    })
    it('returns denied when user lacks permission', async () => {
      hasPermission.mockResolvedValue(false)
      const result = await MarketingPolicy.canUpdate('user_1', 'camp_1')
      expect(result.allowed).toBe(false)
    })
  })

  describe('canSend', () => {
    it('returns allowed when user has marketing.send', async () => {
      hasPermission.mockResolvedValue(true)
      const result = await MarketingPolicy.canSend('user_1')
      expect(result.allowed).toBe(true)
    })
    it('returns denied when user lacks permission', async () => {
      hasPermission.mockResolvedValue(false)
      const result = await MarketingPolicy.canSend('user_1')
      expect(result.allowed).toBe(false)
    })
  })

  describe('canDelete', () => {
    it('returns allowed when user has marketing.delete', async () => {
      hasPermission.mockResolvedValue(true)
      const result = await MarketingPolicy.canDelete('user_1', 'camp_1')
      expect(result.allowed).toBe(true)
    })
    it('returns denied when user lacks permission', async () => {
      hasPermission.mockResolvedValue(false)
      const result = await MarketingPolicy.canDelete('user_1', 'camp_1')
      expect(result.allowed).toBe(false)
    })
  })

  describe('hasMarketingPermission (private)', () => {
    it('returns false when action is not in permissionMap', async () => {
      const fn = (MarketingPolicy as any)['hasMarketingPermission']
      expect(await fn('user_1', 'invalid' as any)).toBe(false)
    })
  })
})
