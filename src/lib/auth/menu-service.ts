/**
 * @file menu-service.ts
 * @description RBAC menu filtering by user permissions
 * @module lib/auth
 * @see RBAC_IMPLEMENTATION_PLAN.md
 */

import { prisma } from '@/lib/db/prisma'
import { getEffectivePermissions } from './permission-service'
import { matchesPermission } from './matches-permission'

export interface MenuItemNode {
  id: string
  name: string
  label: string
  labelAr: string | null
  icon: string | null
  href: string | null
  sortOrder: number
  children: MenuItemNode[]
}

type MenuItemRow = {
  id: string
  name: string
  label: string
  labelAr: string | null
  icon: string | null
  href: string | null
  sortOrder: number
  parentId: string | null
  requiresAllPermissions: boolean
  menuItemPermissions: Array<{ permission: { name: string } }>
}

/**
 * Get filtered menu tree for user (only items user has permission for)
 */
export async function getUserMenu(userId: string): Promise<MenuItemNode[]> {
  const permissions = await getEffectivePermissions(userId)
  const hasPerm = (required: string) =>
    permissions.some((p) => matchesPermission(p, required))

  const allItems = await prisma.menuItem.findMany({
    where: { isActive: true },
    include: {
      menuItemPermissions: { include: { permission: true } },
    },
    orderBy: { sortOrder: 'asc' },
  })

  const byParent = new Map<string | null, MenuItemRow[]>()
  for (const m of allItems as MenuItemRow[]) {
    const key = m.parentId
    if (!byParent.has(key)) byParent.set(key, [])
    byParent.get(key)!.push(m)
  }

  function filterItem(item: MenuItemRow): MenuItemNode | null {
    const reqPerms = item.menuItemPermissions.map((mp) => mp.permission.name)
    const children = (byParent.get(item.id) ?? []).map((c) => filterItem(c)).filter((c): c is MenuItemNode => c !== null)

    if (reqPerms.length === 0) {
      if (children.length === 0) return null
      return {
        id: item.id,
        name: item.name,
        label: item.label,
        labelAr: item.labelAr,
        icon: item.icon,
        href: item.href,
        sortOrder: item.sortOrder,
        children,
      }
    }
    const canAccess = item.requiresAllPermissions
      ? reqPerms.every((p) => hasPerm(p))
      : reqPerms.some((p) => hasPerm(p))
    if (!canAccess) return null
    return {
      id: item.id,
      name: item.name,
      label: item.label,
      labelAr: item.labelAr,
      icon: item.icon,
      href: item.href,
      sortOrder: item.sortOrder,
      children,
    }
  }

  const roots = byParent.get(null) ?? []
  const result: MenuItemNode[] = []
  for (const root of roots) {
    const node = filterItem(root)
    if (node) result.push(node)
  }
  return result
}
