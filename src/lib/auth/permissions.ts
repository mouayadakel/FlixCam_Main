/**
 * @file permissions.ts
 * @description Permission checking utilities for RBAC
 * @module lib/auth/permissions
 */

import { prisma } from '@/lib/db/prisma'

/**
 * Permission constants
 */
export const PERMISSIONS = {
  // Booking permissions
  BOOKING_CREATE: 'booking.create',
  BOOKING_READ: 'booking.read',
  BOOKING_UPDATE: 'booking.update',
  BOOKING_DELETE: 'booking.delete',
  BOOKING_CANCEL: 'booking.cancel',
  BOOKING_TRANSITION: 'booking.transition',
  
  // Equipment permissions
  EQUIPMENT_CREATE: 'equipment.create',
  EQUIPMENT_READ: 'equipment.read',
  EQUIPMENT_UPDATE: 'equipment.update',
  EQUIPMENT_DELETE: 'equipment.delete',
  EQUIPMENT_CHECKOUT: 'equipment.checkout',
  EQUIPMENT_CHECKIN: 'equipment.checkin',
  
  // Payment permissions
  PAYMENT_CREATE: 'payment.create',
  PAYMENT_READ: 'payment.read',
  PAYMENT_REFUND: 'payment.refund',
  PAYMENT_VERIFY: 'payment.verify',
  
  // Client permissions
  CLIENT_CREATE: 'client.create',
  CLIENT_READ: 'client.view',
  CLIENT_UPDATE: 'client.update',
  CLIENT_DELETE: 'client.delete',
  CLIENT_BLACKLIST: 'client.blacklist',
  
  // Invoice permissions
  INVOICE_CREATE: 'invoice.create',
  INVOICE_READ: 'invoice.view',
  INVOICE_UPDATE: 'invoice.update',
  INVOICE_DELETE: 'invoice.delete',
  INVOICE_MARK_PAID: 'invoice.mark_paid',
  INVOICE_GENERATE_ZATCA: 'invoice.generate_zatca',
  
  // Contract permissions
  CONTRACT_CREATE: 'contract.create',
  CONTRACT_READ: 'contract.view',
  CONTRACT_UPDATE: 'contract.update',
  CONTRACT_SIGN: 'contract.sign',
  CONTRACT_DELETE: 'contract.delete',
  
  // Quote permissions
  QUOTE_CREATE: 'quote.create',
  QUOTE_READ: 'quote.view',
  QUOTE_UPDATE: 'quote.update',
  QUOTE_CONVERT: 'quote.convert',
  QUOTE_DELETE: 'quote.delete',
  
  // Maintenance permissions
  MAINTENANCE_CREATE: 'maintenance.create',
  MAINTENANCE_READ: 'maintenance.view',
  MAINTENANCE_UPDATE: 'maintenance.update',
  MAINTENANCE_COMPLETE: 'maintenance.complete',
  MAINTENANCE_DELETE: 'maintenance.delete',
  
  // Reports permissions
  REPORTS_READ: 'reports.view',
  REPORTS_EXPORT: 'reports.export',
  
  // Payment permissions (extended)
  PAYMENT_VIEW: 'payment.view',
  PAYMENT_MARK_PAID: 'payment.mark_paid',
  
  // Coupon permissions
  COUPON_CREATE: 'coupon.create',
  COUPON_READ: 'coupon.view',
  COUPON_UPDATE: 'coupon.update',
  COUPON_DELETE: 'coupon.delete',
  
  // Marketing permissions
  MARKETING_CREATE: 'marketing.create',
  MARKETING_READ: 'marketing.view',
  MARKETING_UPDATE: 'marketing.update',
  MARKETING_SEND: 'marketing.send',
  MARKETING_DELETE: 'marketing.delete',
  
  // Settings permissions
  SETTINGS_READ: 'settings.read',
  SETTINGS_UPDATE: 'settings.update',
  SETTINGS_MANAGE_USERS: 'settings.manage_users',
  SETTINGS_MANAGE_ROLES: 'settings.manage_roles',
  
  // AI permissions
  AI_USE: 'ai.use',
  AI_RISK_ASSESSMENT: 'ai.risk_assessment',
  AI_KIT_BUILDER: 'ai.kit_builder',
  AI_PRICING: 'ai.pricing',
  AI_DEMAND_FORECAST: 'ai.demand_forecast',
  AI_CHATBOT: 'ai.chatbot',

  // User management (admin/super_admin)
  USER_VIEW: 'user.view',
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',
  USER_ASSIGN_ROLE: 'user.assign_role',
} as const

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS]

/**
 * Role-based permission matrix
 * Maps roles to their default permissions
 */
const ROLE_PERMISSIONS: Record<string, Permission[]> = {
  super_admin: Object.values(PERMISSIONS),
  admin: [
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
    PERMISSIONS.PAYMENT_CREATE,
    PERMISSIONS.PAYMENT_READ,
    PERMISSIONS.PAYMENT_VIEW,
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
    PERMISSIONS.USER_VIEW,
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
    PERMISSIONS.BOOKING_CREATE,
    PERMISSIONS.BOOKING_READ,
    PERMISSIONS.BOOKING_UPDATE,
    PERMISSIONS.EQUIPMENT_READ,
    PERMISSIONS.EQUIPMENT_UPDATE,
    PERMISSIONS.PAYMENT_READ,
    PERMISSIONS.PAYMENT_VIEW,
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
  ],
  driver: [
    PERMISSIONS.BOOKING_READ,
  ],
  technician: [
    PERMISSIONS.EQUIPMENT_READ,
    PERMISSIONS.EQUIPMENT_UPDATE,
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
 * Check if user has a specific permission
 * First checks database, then falls back to role-based permissions
 */
export async function hasPermission(
  userId: string,
  permission: Permission
): Promise<boolean> {
  try {
    // Check database for explicit permission
    const userPermission = await prisma.userPermission.findFirst({
      where: {
        userId,
        permission: {
          name: permission,
        },
        deletedAt: null,
      },
      include: {
        permission: true,
      },
    })

    if (userPermission) {
      return true
    }

    // Fall back to role-based permissions
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })

    if (!user || !user.role) {
      return false
    }

    // Map Prisma UserRole enum to permission role names
    const roleMapping: Record<string, string> = {
      'ADMIN': 'admin',
      'WAREHOUSE_MANAGER': 'warehouse',
      'TECHNICIAN': 'technician',
      'SALES_MANAGER': 'staff',
      'ACCOUNTANT': 'staff',
      'CUSTOMER_SERVICE': 'staff',
      'MARKETING_MANAGER': 'staff',
      'DATA_ENTRY': 'client',
      'RISK_MANAGER': 'staff',
      'APPROVAL_AGENT': 'staff',
      'AUDITOR': 'staff',
      'AI_OPERATOR': 'staff',
    }
    
    const roleName = roleMapping[user.role] || user.role.toLowerCase()
    const rolePermissions = ROLE_PERMISSIONS[roleName] || []
    
    return rolePermissions.includes(permission)
  } catch (error) {
    console.error('Error checking permission:', error)
    return false
  }
}

/**
 * Get all permissions for a user
 */
export async function getUserPermissions(userId: string): Promise<Permission[]> {
  try {
    // Get explicit permissions from database
    const userPermissions = await prisma.userPermission.findMany({
      where: {
        userId,
        deletedAt: null,
      },
      include: {
        permission: true,
      },
    })

    const explicitPermissions = userPermissions
      .map((up) => up.permission.name as Permission)
      .filter((name): name is Permission => 
        Object.values(PERMISSIONS).includes(name as Permission)
      )

    // Get role-based permissions
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    })

    if (!user || !user.role) {
      return explicitPermissions
    }

    // Map Prisma UserRole enum to permission role names
    const roleMapping: Record<string, string> = {
      'ADMIN': 'admin',
      'WAREHOUSE_MANAGER': 'warehouse',
      'TECHNICIAN': 'technician',
      'SALES_MANAGER': 'staff',
      'ACCOUNTANT': 'staff',
      'CUSTOMER_SERVICE': 'staff',
      'MARKETING_MANAGER': 'staff',
      'DATA_ENTRY': 'client',
      'RISK_MANAGER': 'staff',
      'APPROVAL_AGENT': 'staff',
      'AUDITOR': 'staff',
      'AI_OPERATOR': 'staff',
    }
    
    const roleName = roleMapping[user.role] || user.role.toLowerCase()
    const rolePermissions = ROLE_PERMISSIONS[roleName] || []

    // Combine and deduplicate
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
  permissions: Permission[]
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
  permissions: Permission[]
): Promise<boolean> {
  for (const permission of permissions) {
    if (!(await hasPermission(userId, permission))) {
      return false
    }
  }
  return true
}
