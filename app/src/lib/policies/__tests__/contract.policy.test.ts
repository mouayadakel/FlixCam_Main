/**
 * Unit tests for contract.policy
 */

import { ContractPolicy } from '@/lib/policies/contract.policy'

jest.mock('@/lib/auth/permissions', () => ({
  hasPermission: jest.fn(),
}))

const { hasPermission } = require('@/lib/auth/permissions')

describe('ContractPolicy', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('canView', () => {
    it('returns allowed false when user lacks contract.read', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(false)
      const result = await ContractPolicy.canView('user_1')
      expect(result.allowed).toBe(false)
      expect(hasPermission).toHaveBeenCalledWith('user_1', 'contract.read')
    })
    it('returns allowed true when user has permission', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(true)
      const result = await ContractPolicy.canView('user_1')
      expect(result.allowed).toBe(true)
    })
  })

  describe('canCreate', () => {
    it('returns allowed true when user has contract.create', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(true)
      const result = await ContractPolicy.canCreate('user_1')
      expect(result.allowed).toBe(true)
    })
  })

  describe('canCreate', () => {
    it('returns denied when user lacks contract.create', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(false)
      const result = await ContractPolicy.canCreate('user_1')
      expect(result.allowed).toBe(false)
    })
  })

  describe('canUpdate', () => {
    it('returns allowed when user has contract.update', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(true)
      const result = await ContractPolicy.canUpdate('user_1', 'contract_1')
      expect(result.allowed).toBe(true)
    })
    it('returns denied when user lacks permission', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(false)
      const result = await ContractPolicy.canUpdate('user_1', 'contract_1')
      expect(result.allowed).toBe(false)
    })
  })

  describe('canSign', () => {
    it('returns allowed true when user has contract.sign', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(true)
      const result = await ContractPolicy.canSign('user_1', 'contract_1')
      expect(result.allowed).toBe(true)
    })
    it('returns denied when user lacks permission', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(false)
      const result = await ContractPolicy.canSign('user_1', 'contract_1')
      expect(result.allowed).toBe(false)
    })
  })

  describe('canDelete', () => {
    it('returns allowed when user has contract.delete', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(true)
      const result = await ContractPolicy.canDelete('user_1', 'contract_1')
      expect(result.allowed).toBe(true)
    })
    it('returns denied when user lacks permission', async () => {
      ;(hasPermission as jest.Mock).mockResolvedValue(false)
      const result = await ContractPolicy.canDelete('user_1', 'contract_1')
      expect(result.allowed).toBe(false)
    })
  })

  describe('hasContractPermission (private)', () => {
    it('returns false when action is not in permissionMap', async () => {
      const hasContractPermission = (ContractPolicy as any)['hasContractPermission']
      const result = await hasContractPermission('user_1', 'invalid' as any)
      expect(result).toBe(false)
    })
  })
})
