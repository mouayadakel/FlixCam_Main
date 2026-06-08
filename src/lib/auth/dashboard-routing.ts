/**
 * @file dashboard-routing.ts
 * @description Shared helpers for routing authenticated users to the correct dashboard.
 * @module lib/auth
 */

export type DashboardPath = '/admin/dashboard' | '/portal/dashboard' | '/vendor/dashboard'

const LEGACY_ADMIN_ROLES = new Set([
  'super_admin',
  'admin',
  'warehouse_manager',
  'technician',
  'sales_manager',
  'accountant',
  'customer_service',
  'marketing_manager',
  'risk_manager',
  'approval_agent',
  'auditor',
  'ai_operator',
])

const NON_ADMIN_ASSIGNED_ROLES = new Set([
  'client',
  'customer',
  'vendor',
])

export function normalizeRole(value?: string | null): string | null {
  const normalized = value?.trim().toLowerCase()
  return normalized ? normalized : null
}

export function normalizeRoleList(values: Array<string | null | undefined>): string[] {
  return Array.from(
    new Set(
      values
        .map((value) => normalizeRole(value))
        .filter((value): value is string => Boolean(value))
    )
  )
}

function hasAssignedAdminLikeRole(assignedRoles: string[]): boolean {
  return assignedRoles.some((role) => !NON_ADMIN_ASSIGNED_ROLES.has(role))
}

/**
 * Legacy `User.role=DATA_ENTRY` is still used as a portal/client placeholder.
 * The RBAC assigned role `data_entry` is a staff/admin role, so assigned roles
 * take precedence over the legacy enum when deciding admin access.
 */
export function canAccessAdminDashboard(
  legacyRole?: string | null,
  assignedRoles: Array<string | null | undefined> = []
): boolean {
  const normalizedAssignedRoles = normalizeRoleList(assignedRoles)
  if (hasAssignedAdminLikeRole(normalizedAssignedRoles)) {
    return true
  }

  const normalizedLegacyRole = normalizeRole(legacyRole)
  return normalizedLegacyRole ? LEGACY_ADMIN_ROLES.has(normalizedLegacyRole) : false
}

export function getNonAdminDashboardPath(
  legacyRole?: string | null,
  assignedRoles: Array<string | null | undefined> = []
): Exclude<DashboardPath, '/admin/dashboard'> | null {
  const normalizedAssignedRoles = normalizeRoleList(assignedRoles)
  if (hasAssignedAdminLikeRole(normalizedAssignedRoles)) {
    return null
  }

  if (normalizedAssignedRoles.includes('vendor')) {
    return '/vendor/dashboard'
  }
  if (
    normalizedAssignedRoles.includes('client') ||
    normalizedAssignedRoles.includes('customer')
  ) {
    return '/portal/dashboard'
  }

  const normalizedLegacyRole = normalizeRole(legacyRole)
  if (normalizedLegacyRole === 'vendor') {
    return '/vendor/dashboard'
  }
  if (normalizedLegacyRole === 'customer' || normalizedLegacyRole === 'data_entry') {
    return '/portal/dashboard'
  }

  return null
}

export function getDashboardPath(
  legacyRole?: string | null,
  assignedRoles: Array<string | null | undefined> = []
): DashboardPath {
  if (canAccessAdminDashboard(legacyRole, assignedRoles)) {
    return '/admin/dashboard'
  }

  return getNonAdminDashboardPath(legacyRole, assignedRoles) ?? '/admin/dashboard'
}
