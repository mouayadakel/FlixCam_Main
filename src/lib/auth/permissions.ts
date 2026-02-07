/**
 * @file permissions.ts
 * @description Permission checking utilities for RBAC (resource.action naming)
 * @module lib/auth/permissions
 * @see https://community.auth0.com/t/permissions-naming-convention/59944
 * @see https://dev.to/msnmongare/best-practices-for-naming-permissions-in-a-system-3g27
 */

import { prisma } from '@/lib/db/prisma'
import { matchesPermission } from './matches-permission'

/**
 * Permission constants - resource.action format (noun.verb)
 * Standardized verbs: .read (not .view), .update (not .edit)
 * Wildcard support: equipment.* grants all equipment permissions
 */
export const PERMISSIONS = {
  // ========================================
  // BOOKING MANAGEMENT
  // ========================================
  BOOKING_CREATE: 'booking.create',
  BOOKING_READ: 'booking.read',
  BOOKING_UPDATE: 'booking.update',
  BOOKING_DELETE: 'booking.delete',
  BOOKING_CANCEL: 'booking.cancel',
  BOOKING_TRANSITION: 'booking.transition',

  // ========================================
  // EQUIPMENT MANAGEMENT
  // ========================================
  EQUIPMENT_CREATE: 'equipment.create',
  EQUIPMENT_READ: 'equipment.read',
  EQUIPMENT_UPDATE: 'equipment.update',
  EQUIPMENT_DELETE: 'equipment.delete',
  EQUIPMENT_CHECKOUT: 'equipment.checkout',
  EQUIPMENT_CHECKIN: 'equipment.checkin',
  EQUIPMENT_UPDATE_PRICING: 'equipment.update_pricing',
  EQUIPMENT_UPDATE_METADATA: 'equipment.update_metadata',

  // ========================================
  // PAYMENT MANAGEMENT
  // ========================================
  PAYMENT_CREATE: 'payment.create',
  PAYMENT_READ: 'payment.read',
  PAYMENT_REFUND: 'payment.refund',
  PAYMENT_VERIFY: 'payment.verify',
  PAYMENT_MARK_PAID: 'payment.mark_paid',

  // ========================================
  // CLIENT MANAGEMENT
  // ========================================
  CLIENT_CREATE: 'client.create',
  CLIENT_READ: 'client.read',
  CLIENT_UPDATE: 'client.update',
  CLIENT_DELETE: 'client.delete',
  CLIENT_BLACKLIST: 'client.blacklist',

  // ========================================
  // INVOICE MANAGEMENT
  // ========================================
  INVOICE_CREATE: 'invoice.create',
  INVOICE_READ: 'invoice.read',
  INVOICE_UPDATE: 'invoice.update',
  INVOICE_DELETE: 'invoice.delete',
  INVOICE_MARK_PAID: 'invoice.mark_paid',
  INVOICE_GENERATE_ZATCA: 'invoice.generate_zatca',

  // ========================================
  // CONTRACT MANAGEMENT
  // ========================================
  CONTRACT_CREATE: 'contract.create',
  CONTRACT_READ: 'contract.read',
  CONTRACT_UPDATE: 'contract.update',
  CONTRACT_SIGN: 'contract.sign',
  CONTRACT_DELETE: 'contract.delete',

  // ========================================
  // QUOTE MANAGEMENT
  // ========================================
  QUOTE_CREATE: 'quote.create',
  QUOTE_READ: 'quote.read',
  QUOTE_UPDATE: 'quote.update',
  QUOTE_CONVERT: 'quote.convert',
  QUOTE_DELETE: 'quote.delete',

  // ========================================
  // MAINTENANCE MANAGEMENT
  // ========================================
  MAINTENANCE_CREATE: 'maintenance.create',
  MAINTENANCE_READ: 'maintenance.read',
  MAINTENANCE_UPDATE: 'maintenance.update',
  MAINTENANCE_COMPLETE: 'maintenance.complete',
  MAINTENANCE_DELETE: 'maintenance.delete',

  // ========================================
  // WAREHOUSE MANAGEMENT
  // ========================================
  WAREHOUSE_READ: 'warehouse.read',
  WAREHOUSE_CHECK_IN: 'warehouse.check_in',
  WAREHOUSE_CHECK_OUT: 'warehouse.check_out',
  WAREHOUSE_INVENTORY: 'warehouse.inventory',
  WAREHOUSE_MANAGE: 'warehouse.manage',

  // ========================================
  // DELIVERY MANAGEMENT
  // ========================================
  DELIVERY_READ: 'delivery.read',
  DELIVERY_ASSIGN: 'delivery.assign',
  DELIVERY_UPDATE_STATUS: 'delivery.update_status',
  DELIVERY_COMPLETE: 'delivery.complete',
  DELIVERY_MANAGE: 'delivery.manage',

  // ========================================
  // APPROVAL MANAGEMENT
  // ========================================
  APPROVAL_READ: 'approval.read',
  APPROVAL_APPROVE: 'approval.approve',
  APPROVAL_REJECT: 'approval.reject',
  APPROVAL_DELEGATE: 'approval.delegate',

  // ========================================
  // AUDIT MANAGEMENT
  // ========================================
  AUDIT_READ: 'audit.read',
  AUDIT_EXPORT: 'audit.export',
  AUDIT_SEARCH: 'audit.search',

  // ========================================
  // DASHBOARD MANAGEMENT
  // ========================================
  DASHBOARD_READ: 'dashboard.read',
  DASHBOARD_ANALYTICS: 'dashboard.analytics',
  DASHBOARD_CUSTOMIZE: 'dashboard.customize',
  DASHBOARD_EXPORT: 'dashboard.export',

  // ========================================
  // SEO MANAGEMENT
  // ========================================
  SEO_EDIT_META_TITLES: 'seo.edit_meta_titles',
  SEO_EDIT_META_DESCRIPTIONS: 'seo.edit_meta_descriptions',
  SEO_EDIT_SLUGS: 'seo.edit_slugs',
  SEO_EDIT_ALT_TEXT: 'seo.edit_alt_text',
  SEO_EDIT_SCHEMA_MARKUP: 'seo.edit_schema_markup',
  SEO_READ_REPORTS: 'seo.read_reports',
  SEO_MANAGE_REDIRECTS: 'seo.manage_redirects',

  // ========================================
  // CATEGORY MANAGEMENT
  // ========================================
  CATEGORY_CREATE: 'category.create',
  CATEGORY_READ: 'category.read',
  CATEGORY_UPDATE: 'category.update',
  CATEGORY_DELETE: 'category.delete',

  // ========================================
  // BRAND MANAGEMENT
  // ========================================
  BRAND_CREATE: 'brand.create',
  BRAND_READ: 'brand.read',
  BRAND_UPDATE: 'brand.update',
  BRAND_DELETE: 'brand.delete',

  // ========================================
  // STUDIO MANAGEMENT
  // ========================================
  STUDIO_CREATE: 'studio.create',
  STUDIO_READ: 'studio.read',
  STUDIO_UPDATE: 'studio.update',
  STUDIO_DELETE: 'studio.delete',
  STUDIO_MANAGE_BLACKOUTS: 'studio.manage_blackouts',

  // ========================================
  // KIT MANAGEMENT
  // ========================================
  KIT_CREATE: 'kit.create',
  KIT_READ: 'kit.read',
  KIT_UPDATE: 'kit.update',
  KIT_DELETE: 'kit.delete',

  // ========================================
  // PRICING MANAGEMENT
  // ========================================
  PRICING_CREATE: 'pricing.create',
  PRICING_READ: 'pricing.read',
  PRICING_UPDATE: 'pricing.update',
  PRICING_DELETE: 'pricing.delete',

  // ========================================
  // DATA IMPORT
  // ========================================
  IMPORT_CREATE: 'import.create',
  IMPORT_READ: 'import.read',

  // ========================================
  // REPORT MANAGEMENT
  // ========================================
  REPORTS_READ: 'reports.read',
  REPORTS_EXPORT: 'reports.export',
  REPORTS_READ_FINANCIAL: 'reports.read_financial',
  REPORTS_READ_WAREHOUSE: 'reports.read_warehouse',

  // ========================================
  // MARKETING MANAGEMENT
  // ========================================
  MARKETING_CREATE: 'marketing.create',
  MARKETING_READ: 'marketing.read',
  MARKETING_UPDATE: 'marketing.update',
  MARKETING_SEND: 'marketing.send',
  MARKETING_DELETE: 'marketing.delete',

  // ========================================
  // COUPON MANAGEMENT
  // ========================================
  COUPON_CREATE: 'coupon.create',
  COUPON_READ: 'coupon.read',
  COUPON_UPDATE: 'coupon.update',
  COUPON_DELETE: 'coupon.delete',

  // ========================================
  // SETTINGS MANAGEMENT
  // ========================================
  SETTINGS_READ: 'settings.read',
  SETTINGS_UPDATE: 'settings.update',
  SETTINGS_MANAGE_USERS: 'settings.manage_users',
  SETTINGS_MANAGE_ROLES: 'settings.manage_roles',

  // ========================================
  // USER MANAGEMENT
  // ========================================
  USER_READ: 'user.read',
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',
  USER_ASSIGN_ROLE: 'user.assign_role',

  // ========================================
  // AI (legacy - kept for compatibility)
  // ========================================
  AI_USE: 'ai.use',
  AI_RISK_ASSESSMENT: 'ai.risk_assessment',
  AI_KIT_BUILDER: 'ai.kit_builder',
  AI_PRICING: 'ai.pricing',
  AI_DEMAND_FORECAST: 'ai.demand_forecast',
  AI_CHATBOT: 'ai.chatbot',

  // ========================================
  // SYSTEM MANAGEMENT
  // ========================================
  SYSTEM_READ_ONLY_MODE: 'system.read_only_mode',
  SYSTEM_HEALTH_CHECK: 'system.health_check',
  SYSTEM_CLEAR_CACHE: 'system.clear_cache',
  SYSTEM_VIEW_LOGS: 'system.view_logs',
} as const

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

// Re-export for consumers
export { matchesPermission } from './matches-permission'

/**
 * Role-based permission matrix (legacy - for enum-based User.role)
 */
const ROLE_PERMISSIONS: Record<string, string[]> = {
  super_admin: ['*'],
  admin: [
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.BOOKING_CREATE,
    PERMISSIONS.BOOKING_READ,
    PERMISSIONS.BOOKING_UPDATE,
    PERMISSIONS.BOOKING_DELETE,
    PERMISSIONS.BOOKING_CANCEL,
    PERMISSIONS.BOOKING_TRANSITION,
    PERMISSIONS.EQUIPMENT_CREATE,
    PERMISSIONS.EQUIPMENT_READ,
    PERMISSIONS.EQUIPMENT_UPDATE,
    PERMISSIONS.EQUIPMENT_DELETE,
    PERMISSIONS.EQUIPMENT_CHECKOUT,
    PERMISSIONS.EQUIPMENT_CHECKIN,
    PERMISSIONS.EQUIPMENT_UPDATE_PRICING,
    PERMISSIONS.EQUIPMENT_UPDATE_METADATA,
    PERMISSIONS.PAYMENT_CREATE,
    PERMISSIONS.PAYMENT_READ,
    PERMISSIONS.PAYMENT_REFUND,
    PERMISSIONS.PAYMENT_MARK_PAID,
    PERMISSIONS.CLIENT_CREATE,
    PERMISSIONS.CLIENT_READ,
    PERMISSIONS.CLIENT_UPDATE,
    PERMISSIONS.CLIENT_DELETE,
    PERMISSIONS.CLIENT_BLACKLIST,
    PERMISSIONS.INVOICE_CREATE,
    PERMISSIONS.INVOICE_READ,
    PERMISSIONS.INVOICE_UPDATE,
    PERMISSIONS.INVOICE_MARK_PAID,
    PERMISSIONS.INVOICE_GENERATE_ZATCA,
    PERMISSIONS.CONTRACT_CREATE,
    PERMISSIONS.CONTRACT_READ,
    PERMISSIONS.CONTRACT_UPDATE,
    PERMISSIONS.CONTRACT_SIGN,
    PERMISSIONS.CONTRACT_DELETE,
    PERMISSIONS.QUOTE_CREATE,
    PERMISSIONS.QUOTE_READ,
    PERMISSIONS.QUOTE_UPDATE,
    PERMISSIONS.QUOTE_CONVERT,
    PERMISSIONS.QUOTE_DELETE,
    PERMISSIONS.MAINTENANCE_CREATE,
    PERMISSIONS.MAINTENANCE_READ,
    PERMISSIONS.MAINTENANCE_UPDATE,
    PERMISSIONS.MAINTENANCE_COMPLETE,
    PERMISSIONS.MAINTENANCE_DELETE,
    PERMISSIONS.REPORTS_READ,
    PERMISSIONS.REPORTS_EXPORT,
    PERMISSIONS.REPORTS_READ_FINANCIAL,
    PERMISSIONS.REPORTS_READ_WAREHOUSE,
    PERMISSIONS.COUPON_CREATE,
    PERMISSIONS.COUPON_READ,
    PERMISSIONS.COUPON_UPDATE,
    PERMISSIONS.COUPON_DELETE,
    PERMISSIONS.MARKETING_CREATE,
    PERMISSIONS.MARKETING_READ,
    PERMISSIONS.MARKETING_UPDATE,
    PERMISSIONS.MARKETING_SEND,
    PERMISSIONS.MARKETING_DELETE,
    PERMISSIONS.SETTINGS_READ,
    PERMISSIONS.SETTINGS_UPDATE,
    PERMISSIONS.SETTINGS_MANAGE_USERS,
    PERMISSIONS.SETTINGS_MANAGE_ROLES,
    PERMISSIONS.USER_READ,
    PERMISSIONS.USER_CREATE,
    PERMISSIONS.USER_UPDATE,
    PERMISSIONS.USER_DELETE,
    PERMISSIONS.USER_ASSIGN_ROLE,
    PERMISSIONS.AI_USE,
    PERMISSIONS.AI_RISK_ASSESSMENT,
    PERMISSIONS.AI_KIT_BUILDER,
    PERMISSIONS.AI_PRICING,
    PERMISSIONS.AI_DEMAND_FORECAST,
    PERMISSIONS.AI_CHATBOT,
  ],
  staff: [
    PERMISSIONS.DASHBOARD_READ,
    PERMISSIONS.BOOKING_CREATE,
    PERMISSIONS.BOOKING_READ,
    PERMISSIONS.BOOKING_UPDATE,
    PERMISSIONS.EQUIPMENT_READ,
    PERMISSIONS.EQUIPMENT_UPDATE,
    PERMISSIONS.PAYMENT_READ,
    PERMISSIONS.CLIENT_CREATE,
    PERMISSIONS.CLIENT_READ,
    PERMISSIONS.CLIENT_UPDATE,
    PERMISSIONS.INVOICE_READ,
    PERMISSIONS.CONTRACT_READ,
    PERMISSIONS.QUOTE_CREATE,
    PERMISSIONS.QUOTE_READ,
    PERMISSIONS.QUOTE_UPDATE,
    PERMISSIONS.MAINTENANCE_READ,
    PERMISSIONS.MAINTENANCE_UPDATE,
    PERMISSIONS.REPORTS_READ,
    PERMISSIONS.AI_USE,
    PERMISSIONS.AI_RISK_ASSESSMENT,
    PERMISSIONS.AI_KIT_BUILDER,
    PERMISSIONS.AI_PRICING,
    PERMISSIONS.AI_DEMAND_FORECAST,
  ],
  warehouse: [
    PERMISSIONS.BOOKING_READ,
    PERMISSIONS.BOOKING_UPDATE,
    PERMISSIONS.EQUIPMENT_READ,
    PERMISSIONS.EQUIPMENT_CHECKOUT,
    PERMISSIONS.EQUIPMENT_CHECKIN,
    PERMISSIONS.WAREHOUSE_READ,
    PERMISSIONS.WAREHOUSE_CHECK_IN,
    PERMISSIONS.WAREHOUSE_CHECK_OUT,
    PERMISSIONS.WAREHOUSE_INVENTORY,
  ],
  driver: [
    PERMISSIONS.BOOKING_READ,
    PERMISSIONS.DELIVERY_READ,
    PERMISSIONS.DELIVERY_UPDATE_STATUS,
    PERMISSIONS.DELIVERY_COMPLETE,
  ],
  technician: [
    PERMISSIONS.EQUIPMENT_READ,
    PERMISSIONS.EQUIPMENT_UPDATE,
    PERMISSIONS.MAINTENANCE_CREATE,
    PERMISSIONS.MAINTENANCE_READ,
    PERMISSIONS.MAINTENANCE_UPDATE,
    PERMISSIONS.MAINTENANCE_COMPLETE,
    PERMISSIONS.WAREHOUSE_READ,
    PERMISSIONS.DASHBOARD_READ,
  ],
  client: [
    PERMISSIONS.BOOKING_CREATE,
    PERMISSIONS.BOOKING_READ,
    PERMISSIONS.PAYMENT_READ,
    PERMISSIONS.INVOICE_READ,
    PERMISSIONS.CONTRACT_READ,
    PERMISSIONS.CONTRACT_SIGN,
  ],
}

/**
 * Check if user has a specific permission (with wildcard support)
 * When USE_NEW_RBAC=true, delegates to permission-service (DB + cache).
 */
export async function hasPermission(
  userId: string,
  permission: string
): Promise<boolean> {
  if (process.env.USE_NEW_RBAC === 'true') {
    const { hasPermission: hasPermissionNew } = await import('./permission-service')
    return hasPermissionNew(userId, permission)
  }
  try {
    // Check database for explicit permission (exact or wildcard)
    const userPermissions = await prisma.userPermission.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      include: { permission: true },
    })

    for (const up of userPermissions) {
      if (matchesPermission(up.permission.name, permission)) {
        return true
      }
    }

    // Fall back to role-based permissions
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })

    if (!user || !user.role) {
      return false
    }

    const roleMapping: Record<string, string> = {
      ADMIN: 'admin',
      WAREHOUSE_MANAGER: 'warehouse',
      TECHNICIAN: 'technician',
      SALES_MANAGER: 'staff',
      ACCOUNTANT: 'staff',
      CUSTOMER_SERVICE: 'staff',
      MARKETING_MANAGER: 'staff',
      DATA_ENTRY: 'client',
      RISK_MANAGER: 'staff',
      APPROVAL_AGENT: 'staff',
      AUDITOR: 'staff',
      AI_OPERATOR: 'staff',
    }

    const roleName = roleMapping[user.role] || user.role.toLowerCase()
    const rolePermissions = ROLE_PERMISSIONS[roleName] || []

    for (const granted of rolePermissions) {
      if (matchesPermission(granted, permission)) {
        return true
      }
    }

    return false
  } catch (error) {
    console.error('Error checking permission:', error)
    return false
  }
}

/**
 * Get all permissions for a user (expanded, no wildcards)
 * When USE_NEW_RBAC=true, delegates to permission-service (DB + cache).
 */
export async function getUserPermissions(userId: string): Promise<string[]> {
  if (process.env.USE_NEW_RBAC === 'true') {
    const { getEffectivePermissions } = await import('./permission-service')
    return getEffectivePermissions(userId)
  }
  try {
    const userPermissions = await prisma.userPermission.findMany({
      where: { userId, deletedAt: null },
      include: { permission: true },
    })

    const explicitPermissions = userPermissions.map((up) => up.permission.name)

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })

    if (!user || !user.role) {
      return [...new Set(explicitPermissions)]
    }

    const roleMapping: Record<string, string> = {
      ADMIN: 'admin',
      WAREHOUSE_MANAGER: 'warehouse',
      TECHNICIAN: 'technician',
      SALES_MANAGER: 'staff',
      ACCOUNTANT: 'staff',
      CUSTOMER_SERVICE: 'staff',
      MARKETING_MANAGER: 'staff',
      DATA_ENTRY: 'client',
      RISK_MANAGER: 'staff',
      APPROVAL_AGENT: 'staff',
      AUDITOR: 'staff',
      AI_OPERATOR: 'staff',
    }

    const roleName = roleMapping[user.role] || user.role.toLowerCase()
    const rolePermissions = ROLE_PERMISSIONS[roleName] || []

    const allPermissions = [...new Set([...explicitPermissions, ...rolePermissions])]
    return allPermissions
  } catch (error) {
    console.error('Error getting user permissions:', error)
    return []
  }
}

/**
 * Check if user has any of the specified permissions
 */
export async function hasAnyPermission(
  userId: string,
  permissions: string[]
): Promise<boolean> {
  for (const permission of permissions) {
    if (await hasPermission(userId, permission)) {
      return true
    }
  }
  return false
}

/**
 * Check if user has all of the specified permissions
 */
export async function hasAllPermissions(
  userId: string,
  permissions: string[]
): Promise<boolean> {
  for (const permission of permissions) {
    if (!(await hasPermission(userId, permission))) {
      return false
    }
  }
  return true
}
