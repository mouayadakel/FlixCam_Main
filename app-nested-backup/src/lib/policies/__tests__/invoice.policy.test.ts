/**
 * Unit tests for invoice.policy
 */

import { InvoicePolicy } from '@/lib/policies/invoice.policy'

jest.mock('@/lib/auth/permissions', () => ({
  hasPermission: jest.fn(),
}))

const { hasPermission } = require('@/lib/auth/permissions')

describe('InvoicePolicy', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('canCreate', () => {
    it('returns allowed true when user has invoice.create', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(true)
      const result = await InvoicePolicy.canCreate('user_1')
      expect(result.allowed).toBe(true)
    })
    it('returns denied when user lacks permission', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(false)
      const result = await InvoicePolicy.canCreate('user_1')
      expect(result.allowed).toBe(false)
    })
  })

  describe('canView', () => {
    it('returns allowed when user has invoice.read', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(true)
      const result = await InvoicePolicy.canView('user_1')
      expect(result.allowed).toBe(true)
    })
    it('returns denied when user lacks invoice.read', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(false)
      const result = await InvoicePolicy.canView('user_1')
      expect(result.allowed).toBe(false)
    })
  })

  describe('canUpdate', () => {
    it('returns allowed when user has invoice.update', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(true)
      const result = await InvoicePolicy.canUpdate('user_1', 'inv_1')
      expect(result.allowed).toBe(true)
    })
    it('returns denied when user lacks permission', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(false)
      const result = await InvoicePolicy.canUpdate('user_1', 'inv_1')
      expect(result.allowed).toBe(false)
    })
  })

  describe('canMarkPaid', () => {
    it('returns allowed when user has invoice.mark_paid', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(true)
      const result = await InvoicePolicy.canMarkPaid('user_1')
      expect(result.allowed).toBe(true)
    })
    it('returns denied when user lacks permission', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(false)
      const result = await InvoicePolicy.canMarkPaid('user_1')
      expect(result.allowed).toBe(false)
    })
  })

  describe('canDelete', () => {
    it('returns allowed when user has invoice.delete', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(true)
      const result = await InvoicePolicy.canDelete('user_1', 'inv_1')
      expect(result.allowed).toBe(true)
    })
    it('returns denied when user lacks permission', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(false)
      const result = await InvoicePolicy.canDelete('user_1', 'inv_1')
      expect(result.allowed).toBe(false)
    })
  })

  describe('hasInvoicePermission (private)', () => {
    it('returns false when action is not in permissionMap', async () => {
      const fn = (InvoicePolicy as any)['hasInvoicePermission']
      expect(await fn('user_1', 'invalid' as any)).toBe(false)
    })
  })
})
