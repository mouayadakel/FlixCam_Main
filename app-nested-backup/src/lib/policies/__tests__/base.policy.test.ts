/**
 * Unit tests for base.policy (via concrete subclass)
 */

import { BasePolicy } from '../base.policy'

jest.mock('@/lib/auth/permissions', () => ({
  hasPermission: jest.fn(),
}))

const hasPermission = require('@/lib/auth/permissions').hasPermission as jest.Mock

class TestPolicy extends BasePolicy {
  static async testCheckPermission(userId: string, perm: string) {
    return this.checkPermission(userId, perm)
  }
  static testAllowed() {
    return this.allowed()
  }
  static testDenied(reason: string) {
    return this.denied(reason)
  }
}

describe('BasePolicy', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('checkPermission', () => {
    it('returns true when hasPermission resolves true', async () => {
      hasPermission.mockResolvedValue(true)
      const result = await TestPolicy.testCheckPermission('user_1', 'test.read')
      expect(result).toBe(true)
    })
    it('returns false when hasPermission resolves false', async () => {
      hasPermission.mockResolvedValue(false)
      const result = await TestPolicy.testCheckPermission('user_1', 'test.read')
      expect(result).toBe(false)
    })
  })

  describe('allowed', () => {
    it('returns { allowed: true }', () => {
      expect(TestPolicy.testAllowed()).toEqual({ allowed: true })
    })
  })

  describe('denied', () => {
    it('returns { allowed: false, reason }', () => {
      expect(TestPolicy.testDenied('No access')).toEqual({
        allowed: false,
        reason: 'No access',
      })
    })
  })
})
