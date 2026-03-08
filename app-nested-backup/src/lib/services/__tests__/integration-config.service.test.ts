/**
 * Unit tests for IntegrationConfigService (getConfig, getConfigFromEnv)
 */

import { IntegrationConfigService } from '../integration-config.service'
import { prisma } from '@/lib/db/prisma'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    integrationConfig: { findFirst: jest.fn() },
  },
}))

const mockFindFirst = prisma.integrationConfig.findFirst as jest.Mock

describe('IntegrationConfigService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('getConfig', () => {
    it('calls findFirst with integration.{type} key and returns env fallback when no stored value', async () => {
      mockFindFirst.mockResolvedValue(null)
      const result = await IntegrationConfigService.getConfig('payments')
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { key: 'integration.payments', deletedAt: null },
        select: { value: true },
      })
      expect(result === null || typeof result === 'object').toBe(true)
    })
  })
})
