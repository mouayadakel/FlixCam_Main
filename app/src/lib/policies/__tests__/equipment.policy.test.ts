/**
 * Unit tests for equipment.policy
 */

import { EquipmentPolicy } from '../equipment.policy'

jest.mock('@/lib/auth/permissions', () => ({
  hasPermission: jest.fn(),
}))

const hasPermission = require('@/lib/auth/permissions').hasPermission as jest.Mock

describe('EquipmentPolicy', () => {
  beforeEach(() => jest.clearAllMocks())

  describe('canCreate', () => {
    it('returns allowed when user has equipment.create', async () => {
      hasPermission.mockResolvedValue(true)
      const result = await EquipmentPolicy.canCreate('user_1')
      expect(result.allowed).toBe(true)
    })
    it('returns denied when user lacks permission', async () => {
      hasPermission.mockResolvedValue(false)
      const result = await EquipmentPolicy.canCreate('user_1')
      expect(result.allowed).toBe(false)
    })
  })

  describe('canView', () => {
    it('returns allowed when user has equipment.read', async () => {
      hasPermission.mockResolvedValue(true)
      const result = await EquipmentPolicy.canView('user_1')
      expect(result.allowed).toBe(true)
    })
    it('returns denied when user lacks permission', async () => {
      hasPermission.mockResolvedValue(false)
      const result = await EquipmentPolicy.canView('user_1')
      expect(result.allowed).toBe(false)
    })
  })

  describe('canEdit', () => {
    it('returns allowed when user has equipment.update', async () => {
      hasPermission.mockResolvedValue(true)
      const result = await EquipmentPolicy.canEdit('user_1', 'eq_1')
      expect(result.allowed).toBe(true)
    })
    it('returns denied when user lacks equipment.update', async () => {
      hasPermission.mockResolvedValue(false)
      const result = await EquipmentPolicy.canEdit('user_1')
      expect(result.allowed).toBe(false)
    })
  })

  describe('canDelete', () => {
    it('returns allowed when user has equipment.delete', async () => {
      hasPermission.mockResolvedValue(true)
      const result = await EquipmentPolicy.canDelete('user_1')
      expect(result.allowed).toBe(true)
    })
    it('returns denied when user lacks permission', async () => {
      hasPermission.mockResolvedValue(false)
      const result = await EquipmentPolicy.canDelete('user_1', 'eq_1')
      expect(result.allowed).toBe(false)
    })
  })
})
