/**
 * @file permission-service.ts
 * @description RBAC permission service with DB-driven roles, wildcards, and cache
 * @module lib/auth
 * @see RBAC_IMPLEMENTATION_PLAN.md
 */

import { prisma } from '@/lib/db/prisma'
import { cacheGet, cacheSet, cacheDelete } from '@/lib/cache'
import { matchesPermission } from './matches-permission'
import * as legacyPermissions from './permissions'

const USE_NEW_RBAC = process.env.USE_NEW_RBAC === 'true'

/**
 * Check if a granted permission matches a required permission (wildcard support)
 * Re-exported for consistency.
 */
export { matchesPermission }

/**
 * Get all effective permissions for a user (DB-driven, with cache).
 * Order: UserPermission overrides, then union of all role permissions.
 * Wildcards like equipment.* are returned as-is (client expands for UI).
 */
export async function getEffectivePermissions(userId: string): Promise<string[]> {
  const cacheKey = `user:${userId}`

  if (USE_NEW_RBAC) {
    const cached = await cacheGet<string[]>(`userPermissions`, cacheKey)
    if (cached) return cached

    const perms = await getEffectivePermissionsFromDb(userId)
    await cacheSet(`userPermissions`, cacheKey, perms)
    return perms
  }

  return legacyPermissions.getUserPermissions(userId)
}

async function getEffectivePermissionsFromDb(userId: string): Promise<string[]> {
  const granted = new Set<string>()

  // 1. UserPermission overrides (explicit grants)
  const userPerms = await prisma.userPermission.findMany({
    where: { userId, deletedAt: null },
    include: { permission: true },
  })
  for (const up of userPerms) {
    granted.add(up.permission.name)
  }

  // 2. Roles -> RolePermission
  const userRoles = await prisma.assignedUserRole.findMany({
    where: {
      userId,
      OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
    },
    include: {
      role: {
        include: {
          rolePermissions: { include: { permission: true } },
        },
      },
    },
  })

  for (const ur of userRoles) {
    for (const rp of ur.role.rolePermissions) {
      granted.add(rp.permission.name)
    }
  }

  // 3. Legacy User.role fallback when no AssignedUserRole (migration period)
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })

  if (user?.role && userRoles.length === 0) {
    const legacy = await legacyPermissions.getUserPermissions(userId)
    for (const p of legacy) granted.add(p)
  }

  return Array.from(granted)
}

/**
 * Check if user has a specific permission.
 * When USE_NEW_RBAC: DB + cache + wildcard matching.
 * Otherwise: legacy enum-based.
 */
export async function hasPermission(userId: string, permission: string): Promise<boolean> {
  if (USE_NEW_RBAC) {
    return hasPermissionNew(userId, permission)
  }
  return legacyPermissions.hasPermission(userId, permission)
}

async function hasPermissionNew(userId: string, required: string): Promise<boolean> {
  const granted = await getEffectivePermissions(userId)

  for (const g of granted) {
    if (matchesPermission(g, required)) return true
  }

  return false
}

/**
 * Invalidate permission cache for a user (call after role/permission changes)
 */
export async function invalidatePermissionCache(userId: string): Promise<void> {
  await cacheDelete(`userPermissions`, `user:${userId}`)
}
