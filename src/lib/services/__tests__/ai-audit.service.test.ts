/**
 * Unit tests for ai-audit.service
 * PATHS: logAiAudit success → create called; catch → no throw, console.error
 */

import { logAiAudit, AI_AUDIT_ACTIONS } from '../ai-audit.service'
import { prisma } from '@/lib/db/prisma'

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    aiAuditLog: { create: jest.fn() },
  },
}))

const mockCreate = prisma.aiAuditLog.create as jest.Mock

describe('ai-audit.service', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockCreate.mockResolvedValue({})
  })

  describe('AI_AUDIT_ACTIONS', () => {
    it('exports expected action keys', () => {
      expect(AI_AUDIT_ACTIONS.BACKFILL_TRIGGER).toBe('backfill.trigger')
      expect(AI_AUDIT_ACTIONS.IMAGE_APPROVE).toBe('image.approve')
      expect(AI_AUDIT_ACTIONS.IMAGE_REJECT).toBe('image.reject')
      expect(AI_AUDIT_ACTIONS.SETTINGS_UPDATE).toBe('settings.update')
    })
  })

  describe('logAiAudit', () => {
    it('calls prisma.aiAuditLog.create with correct data', async () => {
      await logAiAudit({
        userId: 'u1',
        action: 'backfill.trigger',
        resourceType: 'catalog',
        resourceId: 'cat-1',
        metadata: { count: 10 },
      })
      expect(mockCreate).toHaveBeenCalledTimes(1)
      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          userId: 'u1',
          action: 'backfill.trigger',
          resourceType: 'catalog',
          resourceId: 'cat-1',
          metadata: { count: 10 },
        },
      })
    })

    it('does not throw when create rejects', async () => {
      mockCreate.mockRejectedValue(new Error('DB'))
      const spy = jest.spyOn(console, 'error').mockImplementation()
      await expect(logAiAudit({ userId: 'u1', action: 'test' })).resolves.toBeUndefined()
      expect(spy).toHaveBeenCalled()
      spy.mockRestore()
    })
  })
})
