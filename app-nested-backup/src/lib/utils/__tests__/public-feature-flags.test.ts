/**
 * Unit tests for public-feature-flags
 */

const mockIsEnabled = jest.fn()
jest.mock('@/lib/services/feature-flag.service', () => ({
  FeatureFlagService: {
    isEnabled: (...args: unknown[]) => mockIsEnabled(...args),
  },
}))

import { getPublicFeatureFlags } from '../public-feature-flags'

describe('public-feature-flags', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIsEnabled.mockResolvedValue(true)
  })

  it('returns all flags from FeatureFlagService', async () => {
    const result = await getPublicFeatureFlags()
    expect(result).toEqual({
      enableBuildKit: true,
      enableEquipmentCatalog: true,
      enableStudios: true,
      enablePackages: true,
      enableHowItWorks: true,
      enableSupport: true,
      enableWhatsAppCta: true,
    })
    expect(mockIsEnabled).toHaveBeenCalledTimes(7)
  })

  it('maps false when FeatureFlagService returns false', async () => {
    mockIsEnabled
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(true)
    const result = await getPublicFeatureFlags()
    expect(result.enableEquipmentCatalog).toBe(false)
    expect(result.enableBuildKit).toBe(true)
  })
})
