/**
 * @file role-service.ts
 * @description RBAC role CRUD and conflict detection
 * @module lib/auth
 * @see RBAC_IMPLEMENTATION_PLAN.md
 */

import { prisma } from '@/lib/db/prisma'
import { invalidatePermissionCache } from './permission-service'

const CRITICAL_PERMISSIONS = [
  'payment.refund',
  'payment.mark_paid',
  'invoice.mark_paid',
  'user.delete',
  'system.read_only_mode',
  'system.clear_cache',
]

export interface CreateRoleInput {
  name: string
  displayName: string
  displayNameAr?: string
  description?: string
  color?: string
  permissionIds: string[]
}

export interface UpdateRoleInput {
  displayName?: string
  displayNameAr?: string
  description?: string
  color?: string
  permissionIds?: string[]
}

export interface RoleConflictCheck {
  hasStaticConflict: boolean
  staticConflictReason?: string
  hasDynamicWarning: boolean
  dynamicWarningPermissions?: string[]
}

export class RoleService {
  /**
   * List all roles (system + custom)
   */
  static async list(filters?: { isSystem?: boolean }): Promise<
    Array<{
      id: string
      name: string
      displayName: string
      displayNameAr: string | null
      description: string | null
      isSystem: boolean
      color: string | null
      permissionCount: number
      userCount: number
    }>
  > {
    const where: { isSystem?: boolean; deletedAt: null } = { deletedAt: null }
    if (filters?.isSystem !== undefined) where.isSystem = filters.isSystem

    const roles = await prisma.role.findMany({
      where,
      include: {
        _count: {
          select: { rolePermissions: true, userRoles: true },
        },
      },
      orderBy: [{ isSystem: 'desc' }, { name: 'asc' }],
    })

    return roles.map((r) => ({
      id: r.id,
      name: r.name,
      displayName: r.displayName,
      displayNameAr: r.displayNameAr,
      description: r.description,
      isSystem: r.isSystem,
      color: r.color,
      permissionCount: r._count.rolePermissions,
      userCount: r._count.userRoles,
    }))
  }

  /**
   * Get role by ID with permissions
   */
  static async getById(id: string) {
    return prisma.role.findUnique({
      where: { id, deletedAt: null },
      include: {
        rolePermissions: { include: { permission: true } },
        _count: { select: { userRoles: true } },
      },
    })
  }

  /**
   * Get role by name
   */
  static async getByName(name: string) {
    return prisma.role.findFirst({
      where: { name, deletedAt: null },
      include: {
        rolePermissions: { include: { permission: true } },
      },
    })
  }

  /**
   * Create custom role
   */
  static async create(input: CreateRoleInput, createdBy: string) {
    const role = await prisma.role.create({
      data: {
        name: input.name,
        displayName: input.displayName,
        displayNameAr: input.displayNameAr,
        description: input.description,
        color: input.color,
        isSystem: false,
        createdBy,
      },
    })

    await this.setPermissions(role.id, input.permissionIds, createdBy)
    return this.getById(role.id)
  }

  /**
   * Update role (block for system roles)
   */
  static async update(id: string, input: UpdateRoleInput, updatedBy: string) {
    const role = await prisma.role.findUnique({
      where: { id, deletedAt: null },
    })
    if (!role) return null
    if (role.isSystem) {
      throw new Error('Cannot edit system roles')
    }

    await prisma.role.update({
      where: { id },
      data: {
        displayName: input.displayName,
        displayNameAr: input.displayNameAr,
        description: input.description,
        color: input.color,
        updatedBy,
      },
    })

    if (input.permissionIds !== undefined) {
      await this.setPermissions(id, input.permissionIds, updatedBy)
    }

    await this.invalidateUsersWithRole(id)
    return this.getById(id)
  }

  /**
   * Soft delete role (block for system roles, block if users assigned)
   */
  static async delete(id: string): Promise<{ success: boolean; error?: string }> {
    const role = await prisma.role.findUnique({
      where: { id, deletedAt: null },
      include: { _count: { select: { userRoles: true } } },
    })
    if (!role) return { success: false, error: 'Role not found' }
    if (role.isSystem) return { success: false, error: 'Cannot delete system roles' }
    if (role._count.userRoles > 0) {
      return { success: false, error: 'Cannot delete role with assigned users' }
    }

    await prisma.role.update({
      where: { id },
      data: { deletedAt: new Date(), deletedBy: 'system' },
    })
    return { success: true }
  }

  /**
   * Replace all permissions for a role
   */
  static async setPermissions(roleId: string, permissionIds: string[], createdBy: string) {
    await prisma.$transaction([
      prisma.rolePermission.deleteMany({ where: { roleId } }),
      ...permissionIds.map((permId) =>
        prisma.rolePermission.create({
          data: { roleId, permissionId: permId, createdBy },
        })
      ),
    ])
  }

  /**
   * Clone role
   */
  static async clone(id: string, newName: string, createdBy: string) {
    const role = await this.getById(id)
    if (!role) return null
    const permissionIds = role.rolePermissions.map((rp) => rp.permissionId)
    return this.create(
      {
        name: newName,
        displayName: `${role.displayName} (Copy)`,
        displayNameAr: role.displayNameAr ? `${role.displayNameAr} (نسخة)` : undefined,
        description: role.description ?? undefined,
        color: role.color ?? undefined,
        permissionIds,
      },
      createdBy
    )
  }

  /**
   * Check role assignment conflicts (static from RoleConflict + dynamic overlap)
   */
  static async checkRoleConflicts(userId: string, newRoleId: string): Promise<RoleConflictCheck> {
    const newRole = await prisma.role.findUnique({
      where: { id: newRoleId },
      include: { rolePermissions: { include: { permission: true } } },
    })
    if (!newRole) {
      return { hasStaticConflict: false, hasDynamicWarning: false }
    }

    const userRoles = await prisma.assignedUserRole.findMany({
      where: {
        userId,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      include: {
        role: {
          include: { rolePermissions: { include: { permission: true } } },
        },
      },
    })

    // Static conflicts
    for (const ur of userRoles) {
      const [roleAId, roleBId] = [ur.roleId, newRoleId].sort()
      const conflict = await prisma.roleConflict.findUnique({
        where: {
          roleAId_roleBId: { roleAId, roleBId },
        },
      })
      if (conflict) {
        return {
          hasStaticConflict: true,
          staticConflictReason: conflict.reason,
          hasDynamicWarning: false,
        }
      }
    }

    // Dynamic: critical permission overlap
    const newPerms = new Set(newRole.rolePermissions.map((rp) => rp.permission.name))
    const overlap: string[] = []
    for (const ur of userRoles) {
      for (const rp of ur.role.rolePermissions) {
        const name = rp.permission.name
        if (CRITICAL_PERMISSIONS.includes(name) && newPerms.has(name)) {
          overlap.push(name)
        }
      }
    }
    return {
      hasStaticConflict: false,
      hasDynamicWarning: overlap.length > 0,
      dynamicWarningPermissions: [...new Set(overlap)],
    }
  }

  static async invalidateUsersWithRole(roleId: string) {
    const users = await prisma.assignedUserRole.findMany({
      where: { roleId },
      select: { userId: true },
    })
    for (const u of users) {
      await invalidatePermissionCache(u.userId)
    }
  }
}
