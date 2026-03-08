/**
 * Unit tests for permissions
 */

const originalEnv = process.env

jest.mock('@/lib/db/prisma', () => ({
  prisma: {
    user: { findUnique: jest.fn() },
    userPermission: { findMany: jest.fn() },
    assignedUserRole: { findFirst: jest.fn() },
  },
}))
jest.mock('../matches-permission', () => ({
  matchesPermission: jest.fn((granted: string, required: string) => {
    if (granted === '*') return true
    if (granted === required) return true
    const [gResource, gAction] = granted.split('.')
    const [rResource] = required.split('.')
    return gResource === rResource && gAction === '*'
  }),
}))

const mockPermissionServiceHasPermission = jest.fn()
const mockPermissionServiceGetEffectivePermissions = jest.fn()
jest.mock('../permission-service', () => ({
  hasPermission: (...args: unknown[]) => mockPermissionServiceHasPermission(...args),
  getEffectivePermissions: (...args: unknown[]) => mockPermissionServiceGetEffectivePermissions(...args),
}))

import { PERMISSIONS, hasPermission, getUserPermissions, hasAIPermission, hasAnyPermission, hasAllPermissions } from '../permissions'
import { prisma } from '@/lib/db/prisma'

const mockUserFindUnique = prisma.user.findUnique as jest.Mock
const mockUserPermissionFindMany = prisma.userPermission.findMany as jest.Mock
const mockAssignedUserRoleFindFirst = prisma.assignedUserRole.findFirst as jest.Mock

describe('permissions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv }
    delete process.env.USE_NEW_RBAC
    mockAssignedUserRoleFindFirst.mockResolvedValue(null)
    mockPermissionServiceHasPermission.mockResolvedValue(false)
    mockPermissionServiceGetEffectivePermissions.mockResolvedValue([])
  })

  afterEach(() => {
    process.env = originalEnv
  })

  describe('PERMISSIONS', () => {
    it('exports booking and equipment permissions', () => {
      expect(PERMISSIONS.BOOKING_CREATE).toBe('booking.create')
      expect(PERMISSIONS.EQUIPMENT_READ).toBe('equipment.read')
    })
  })

  describe('hasPermission', () => {
    it('returns false when user not found', async () => {
      mockUserFindUnique.mockResolvedValue(null)
      mockUserPermissionFindMany.mockResolvedValue([])
      const result = await hasPermission('user_1', 'booking.create')
      expect(result).toBe(false)
    })

    it('returns true when user has explicit permission', async () => {
      mockUserFindUnique.mockResolvedValue({ role: 'CUSTOMER' })
      mockUserPermissionFindMany.mockResolvedValue([
        { permission: { name: 'booking.create' } },
      ])
      const result = await hasPermission('user_1', 'booking.create')
      expect(result).toBe(true)
    })

    it('returns true when super admin via assignedUserRole', async () => {
      mockAssignedUserRoleFindFirst.mockResolvedValue({ role: { name: 'super_admin' } })
      const result = await hasPermission('user_1', 'booking.create')
      expect(result).toBe(true)
    })

    it('returns true when user role is ADMIN (super admin)', async () => {
      mockUserFindUnique.mockResolvedValue({ role: 'ADMIN' })
      mockUserPermissionFindMany.mockResolvedValue([])
      const result = await hasPermission('user_1', 'booking.create')
      expect(result).toBe(true)
    })

    it('returns true when user has wildcard permission', async () => {
      mockUserFindUnique.mockResolvedValue({ role: 'CUSTOMER' })
      mockUserPermissionFindMany.mockResolvedValue([
        { permission: { name: 'booking.*' } },
      ])
      const result = await hasPermission('user_1', 'booking.create')
      expect(result).toBe(true)
    })

    it('returns true when role grants permission (ADMIN -> admin)', async () => {
      mockUserFindUnique.mockResolvedValue({ role: 'ADMIN' })
      mockUserPermissionFindMany.mockResolvedValue([])
      const result = await hasPermission('user_1', 'booking.create')
      expect(result).toBe(true)
    })

    it('returns true when user has role-based permission (DATA_ENTRY -> client)', async () => {
      mockUserFindUnique.mockResolvedValue({ role: 'DATA_ENTRY' })
      mockUserPermissionFindMany.mockResolvedValue([])
      const result = await hasPermission('user_1', 'booking.create')
      expect(result).toBe(true)
    })

    it('returns false when user has role but no matching permission', async () => {
      mockUserFindUnique.mockResolvedValue({ role: 'CUSTOMER' })
      mockUserPermissionFindMany.mockResolvedValue([])
      const result = await hasPermission('user_1', 'equipment.delete')
      expect(result).toBe(false)
    })

    it('returns false when user exists but has no role', async () => {
      mockUserFindUnique.mockResolvedValue({ role: null })
      mockUserPermissionFindMany.mockResolvedValue([])
      const result = await hasPermission('user_1', 'booking.create')
      expect(result).toBe(false)
    })

    it('returns false when user is null from findUnique', async () => {
      mockUserFindUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
      mockUserPermissionFindMany.mockResolvedValue([])
      const result = await hasPermission('user_1', 'booking.create')
      expect(result).toBe(false)
    })

    it('delegates to permission-service when USE_NEW_RBAC is true', async () => {
      process.env.USE_NEW_RBAC = 'true'
      mockPermissionServiceHasPermission.mockResolvedValue(true)
      const result = await hasPermission('user_1', 'booking.create')
      expect(result).toBe(true)
      expect(mockPermissionServiceHasPermission).toHaveBeenCalledWith('user_1', 'booking.create')
      delete process.env.USE_NEW_RBAC
    })

    it('returns false when prisma throws', async () => {
      mockUserPermissionFindMany.mockRejectedValue(new Error('DB error'))
      const result = await hasPermission('user_1', 'booking.create')
      expect(result).toBe(false)
    })
  })

  describe('getUserPermissions', () => {
    it('returns explicit permissions when user has no role', async () => {
      mockUserPermissionFindMany.mockResolvedValue([
        { permission: { name: 'booking.create' } },
      ])
      mockUserFindUnique.mockResolvedValue({ role: null })
      const result = await getUserPermissions('user_1')
      expect(result).toContain('booking.create')
    })

    it('returns explicit permissions when user is null', async () => {
      mockUserPermissionFindMany.mockResolvedValue([
        { permission: { name: 'custom.perm' } },
      ])
      mockUserFindUnique.mockResolvedValue(null)
      const result = await getUserPermissions('user_1')
      expect(result).toContain('custom.perm')
    })

    it('delegates to permission-service when USE_NEW_RBAC is true', async () => {
      process.env.USE_NEW_RBAC = 'true'
      mockPermissionServiceGetEffectivePermissions.mockResolvedValue(['booking.create', 'equipment.read'])
      const result = await getUserPermissions('user_1')
      expect(result).toEqual(['booking.create', 'equipment.read'])
      expect(mockPermissionServiceGetEffectivePermissions).toHaveBeenCalledWith('user_1')
      delete process.env.USE_NEW_RBAC
    })

    it('returns empty array when prisma throws', async () => {
      mockUserPermissionFindMany.mockRejectedValue(new Error('DB error'))
      const result = await getUserPermissions('user_1')
      expect(result).toEqual([])
    })

    it('returns merged explicit and role permissions', async () => {
      mockUserPermissionFindMany.mockResolvedValue([
        { permission: { name: 'custom.permission' } },
      ])
      mockUserFindUnique.mockResolvedValue({ role: 'ADMIN' })
      const result = await getUserPermissions('user_1')
      expect(result).toContain('custom.permission')
      expect(result).toContain('booking.create')
    })
  })

  describe('hasAIPermission', () => {
    it('returns true when user has AI_VIEW', async () => {
      mockUserFindUnique.mockResolvedValue({ role: 'CUSTOMER' })
      mockUserPermissionFindMany.mockResolvedValue([
        { permission: { name: 'ai.view' } },
      ])
      const result = await hasAIPermission('user_1', 'view')
      expect(result).toBe(true)
    })

    it('returns false when user lacks AI permissions', async () => {
      mockUserFindUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ role: 'CUSTOMER' })
      mockUserPermissionFindMany.mockResolvedValue([])
      const result = await hasAIPermission('user_1', 'run')
      expect(result).toBe(false)
    })
  })

  describe('hasAnyPermission', () => {
    it('returns true when user has first permission', async () => {
      mockUserFindUnique.mockResolvedValue({ role: 'CUSTOMER' })
      mockUserPermissionFindMany.mockResolvedValue([
        { permission: { name: 'booking.create' } },
      ])
      const result = await hasAnyPermission('user_1', ['booking.create', 'booking.read'])
      expect(result).toBe(true)
    })

    it('returns true when user has second permission', async () => {
      mockUserFindUnique.mockResolvedValue({ role: 'CUSTOMER' })
      mockUserPermissionFindMany.mockResolvedValue([
        { permission: { name: 'booking.read' } },
      ])
      const result = await hasAnyPermission('user_1', ['booking.create', 'booking.read'])
      expect(result).toBe(true)
    })

    it('returns false when user has none', async () => {
      mockUserFindUnique
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ role: 'CUSTOMER' })
      mockUserPermissionFindMany.mockResolvedValue([])
      const result = await hasAnyPermission('user_1', ['booking.create', 'booking.delete'])
      expect(result).toBe(false)
    })
  })

  describe('hasAllPermissions', () => {
    it('returns true when user has all', async () => {
      mockUserFindUnique.mockResolvedValue({ role: 'ADMIN' })
      mockUserPermissionFindMany.mockResolvedValue([])
      const result = await hasAllPermissions('user_1', ['booking.create', 'booking.read'])
      expect(result).toBe(true)
    })

    it('returns false when user lacks one', async () => {
      mockUserFindUnique.mockResolvedValue({ role: 'CUSTOMER' })
      mockUserPermissionFindMany.mockResolvedValue([
        { permission: { name: 'booking.create' } },
      ])
      const result = await hasAllPermissions('user_1', ['booking.create', 'booking.delete'])
      expect(result).toBe(false)
    })
  })
})
