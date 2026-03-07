/**
 * Unit tests for IntegrationService (getConfig, testConnection, getAll)
 */

import { IntegrationService } from '../integration.service'

const mockGetConfig = jest.fn()
const mockGetConfigFromEnv = jest.fn()

jest.mock('../integration-config.service', () => ({
  IntegrationConfigService: {
    getConfig: (type: string) => mockGetConfig(type),
    getConfigFromEnv: (type: string) => mockGetConfigFromEnv(type),
  },
}))

const originalEnv = process.env

describe('IntegrationService', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetConfig.mockResolvedValue(null)
    mockGetConfigFromEnv.mockReturnValue(null)
    process.env = { ...originalEnv }
  })


  afterEach(() => {
    process.env = originalEnv
  })

  describe('getConfig', () => {
    it('returns stored config when getConfig returns data', async () => {
      mockGetConfig.mockResolvedValueOnce({
        type: 'payments',
        enabled: true,
        config: { key: 'x' },
      })
      const result = await IntegrationService.getConfig('payments')
      expect(result.type).toBe('payments')
      expect(result.configured).toBe(true)
      expect(result.config).toEqual({ key: 'x' })
    })

    it('returns env config when getConfig returns null but getConfigFromEnv has data', async () => {
      mockGetConfig.mockResolvedValue(null)
      mockGetConfigFromEnv.mockReturnValue({
        type: 'email',
        enabled: true,
        config: { host: 'smtp.example.com' },
      })
      const result = await IntegrationService.getConfig('email')
      expect(result.type).toBe('email')
      expect(result.configured).toBe(true)
      expect(result.config).toEqual({ host: 'smtp.example.com' })
    })

    it('returns webhooks default when both stored and env return null', async () => {
      mockGetConfig.mockResolvedValue(null)
      mockGetConfigFromEnv.mockReturnValue(null)
      const result = await IntegrationService.getConfig('webhooks')
      expect(result.type).toBe('webhooks')
      expect(result.enabled).toBe(true)
    })

    it('throws when type unknown and no stored/env config', async () => {
      mockGetConfig.mockResolvedValue(null)
      mockGetConfigFromEnv.mockReturnValue(null)
      await expect(IntegrationService.getConfig('unknown' as any)).rejects.toThrow('Unknown integration type')
    })
  })

  describe('testConnection', () => {
    it('returns not configured when config.configured is false', async () => {
      mockGetConfig.mockResolvedValueOnce({ type: 'payments', enabled: false, config: {} })
      const result = await IntegrationService.testConnection('payments')
      expect(result.success).toBe(false)
      expect(result.message).toBe('Integration is not configured')
    })

    it('returns Tap Payments success for payments type', async () => {
      mockGetConfig.mockResolvedValueOnce({ type: 'payments', enabled: true, config: { key: 'x' } })
      process.env.TAP_SECRET_KEY = 'sk_test_xxx'
      const result = await IntegrationService.testConnection('payments')
      expect(result.success).toBe(true)
      expect(result.message).toBe('Tap Payments connection successful')
      expect(result.details?.mode).toBe('test')
    })

    it('returns SMTP success for email type', async () => {
      mockGetConfig.mockResolvedValueOnce({ type: 'email', enabled: true, config: { host: 'x' } })
      process.env.SMTP_HOST = 'smtp.example.com'
      const result = await IntegrationService.testConnection('email')
      expect(result.success).toBe(true)
      expect(result.message).toBe('SMTP connection successful')
    })

    it('returns WhatsApp success for whatsapp type', async () => {
      mockGetConfig.mockResolvedValueOnce({ type: 'whatsapp', enabled: true, config: { key: 'x' } })
      const result = await IntegrationService.testConnection('whatsapp')
      expect(result.success).toBe(true)
      expect(result.message).toBe('WhatsApp API connection successful')
    })

    it('returns Analytics success for analytics type', async () => {
      mockGetConfig.mockResolvedValueOnce({ type: 'analytics', enabled: true, config: { key: 'x' } })
      process.env.GA4_MEASUREMENT_ID = 'G-XXX'
      const result = await IntegrationService.testConnection('analytics')
      expect(result.success).toBe(true)
      expect(result.details?.services).toBeDefined()
    })

    it('returns Webhook success for webhooks type', async () => {
      mockGetConfig.mockResolvedValueOnce({ type: 'webhooks', enabled: true, config: { key: 'x' } })
      const result = await IntegrationService.testConnection('webhooks')
      expect(result.success).toBe(true)
      expect(result.message).toBe('Webhook endpoint ready')
    })

    it('returns default case for unknown type when config is configured', async () => {
      mockGetConfig.mockResolvedValueOnce({ type: 'unknown', enabled: true, config: { key: 'x' } })
      const result = await IntegrationService.testConnection('unknown' as any)
      expect(result.success).toBe(false)
      expect(result.message).toBe('Unknown integration type')
    })

    it('returns failure when switch body throws', async () => {
      mockGetConfig.mockResolvedValueOnce({ type: 'payments', enabled: true, config: { key: 'x' } })
      const orig = process.env.TAP_SECRET_KEY
      Object.defineProperty(process.env, 'TAP_SECRET_KEY', {
        get: () => {
          throw new Error('Env access failed')
        },
        configurable: true,
      })
      try {
        const result = await IntegrationService.testConnection('payments')
        expect(result.success).toBe(false)
        expect(result.message).toBe('Env access failed')
      } finally {
        Object.defineProperty(process.env, 'TAP_SECRET_KEY', { value: orig, configurable: true })
      }
    })

    it('returns live mode when TAP_SECRET_KEY does not start with sk_test', async () => {
      mockGetConfig.mockResolvedValueOnce({ type: 'payments', enabled: true, config: { key: 'x' } })
      process.env.TAP_SECRET_KEY = 'sk_live_xxx'
      const result = await IntegrationService.testConnection('payments')
      expect(result.success).toBe(true)
      expect(result.details?.mode).toBe('live')
    })
  })

  describe('getAll', () => {
    it('returns config for all integration types', async () => {
      mockGetConfig.mockImplementation((type: string) =>
        Promise.resolve({ type, enabled: true, config: { key: 'x' } })
      )
      const result = await IntegrationService.getAll()
      expect(result).toHaveLength(5)
      expect(result.map((r) => r.type)).toEqual(['payments', 'email', 'whatsapp', 'analytics', 'webhooks'])
    })
  })
})
