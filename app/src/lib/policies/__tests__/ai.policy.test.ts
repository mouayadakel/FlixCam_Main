/**
 * Unit tests for ai.policy
 */

import { AIPolicy } from '@/lib/policies/ai.policy'

jest.mock('@/lib/auth/permissions', () => ({
  hasPermission: jest.fn(),
  PERMISSIONS: {
    AI_RISK_ASSESSMENT: 'ai.risk_assessment',
    BOOKING_READ: 'booking.read',
    AI_KIT_BUILDER: 'ai.kit_builder',
    BOOKING_CREATE: 'booking.create',
  },
}))

const { hasPermission } = require('@/lib/auth/permissions')

describe('AIPolicy', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('canUseAI', () => {
    it('returns allowed false when user lacks ai.use permission', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(false)
      const result = await AIPolicy.canUseAI('user_1')
      expect(result.allowed).toBe(false)
      expect(result.reason).toContain('permission')
      expect(hasPermission).toHaveBeenCalledWith('user_1', 'ai.use')
    })
    it('returns allowed true when user has ai.use permission', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(true)
      const result = await AIPolicy.canUseAI('user_1')
      expect(result.allowed).toBe(true)
    })
  })

  describe('canViewRiskAssessment', () => {
    it('returns allowed true when user has AI_RISK_ASSESSMENT', async () => {
      ;(hasPermission as jest.Mock).mockImplementation((_, perm: string) =>
        Promise.resolve(perm === 'ai.risk_assessment')
      )
      const result = await AIPolicy.canViewRiskAssessment('user_1')
      expect(result.allowed).toBe(true)
    })
    it('returns allowed true when user has BOOKING_READ', async () => {
      ;(hasPermission as jest.Mock).mockImplementation((_, perm: string) =>
        Promise.resolve(perm === 'booking.read')
      )
      const result = await AIPolicy.canViewRiskAssessment('user_1')
      expect(result.allowed).toBe(true)
    })
    it('returns allowed false when user lacks both permissions', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(false)
      const result = await AIPolicy.canViewRiskAssessment('user_1')
      expect(result.allowed).toBe(false)
    })
  })

  describe('canUseKitBuilder', () => {
    it('returns allowed true when user has AI_KIT_BUILDER', async () => {
      ;(hasPermission as jest.Mock)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
      const result = await AIPolicy.canUseKitBuilder('user_1')
      expect(result.allowed).toBe(true)
    })
    it('returns allowed false when user lacks both permissions', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(false)
      const result = await AIPolicy.canUseKitBuilder('user_1')
      expect(result.allowed).toBe(false)
    })
  })

  describe('canViewPricingSuggestions', () => {
    it('returns allowed true when user has ai.pricing', async () => {
      ;(hasPermission as jest.Mock)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
      const result = await AIPolicy.canViewPricingSuggestions('user_1')
      expect(result.allowed).toBe(true)
    })
    it('returns allowed false when user lacks both permissions', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(false)
      const result = await AIPolicy.canViewPricingSuggestions('user_1')
      expect(result.allowed).toBe(false)
    })
  })

  describe('canViewDemandForecast', () => {
    it('returns allowed true when user has ai.demand_forecast', async () => {
      ;(hasPermission as jest.Mock)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false)
      const result = await AIPolicy.canViewDemandForecast('user_1')
      expect(result.allowed).toBe(true)
    })
    it('returns allowed false when user lacks both permissions', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(false)
      const result = await AIPolicy.canViewDemandForecast('user_1')
      expect(result.allowed).toBe(false)
    })
  })

  describe('canUseChatbot', () => {
    it('returns allowed true when user has ai.chatbot', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(true)
      const result = await AIPolicy.canUseChatbot('user_1')
      expect(result.allowed).toBe(true)
    })
    it('returns allowed false when user lacks permission', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(false)
      const result = await AIPolicy.canUseChatbot('user_1')
      expect(result.allowed).toBe(false)
    })
  })

  describe('canManageAIConfig', () => {
    it('returns allowed true when user has settings.update', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(true)
      const result = await AIPolicy.canManageAIConfig('user_1')
      expect(result.allowed).toBe(true)
    })
    it('returns allowed false when user lacks permission', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(false)
      const result = await AIPolicy.canManageAIConfig('user_1')
      expect(result.allowed).toBe(false)
    })
  })
})
