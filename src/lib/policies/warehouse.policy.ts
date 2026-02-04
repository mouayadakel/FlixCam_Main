/**
 * @file warehouse.policy.ts
 * @description Authorization policies for warehouse operations
 * @module lib/policies
 * @author Engineering Team
 * @created 2026-01-28
 */

import { prisma } from '@/lib/db/prisma'
import { hasPermission } from '@/lib/auth/permissions'

export interface PolicyResult {
  allowed: boolean
  reason?: string
}

export class WarehousePolicy {
  /**
   * Check if user can check out equipment
   */
  static async canCheckOut(userId: string): Promise<PolicyResult> {
    const hasPermission = await this.hasWarehousePermission(userId, 'check_out')
    if (!hasPermission) {
      return {
        allowed: false,
        reason: 'ليس لديك صلاحية لإخراج المعدات',
      }
    }

    return { allowed: true }
  }

  /**
   * Check if user can check in equipment
   */
  static async canCheckIn(userId: string): Promise<PolicyResult> {
    const hasPermission = await this.hasWarehousePermission(userId, 'check_in')
    if (!hasPermission) {
      return {
        allowed: false,
        reason: 'ليس لديك صلاحية لإرجاع المعدات',
      }
    }

    return { allowed: true }
  }

  /**
   * Check if user can view warehouse inventory
   */
  static async canViewInventory(userId: string): Promise<PolicyResult> {
    const hasPermission = await this.hasWarehousePermission(userId, 'view')
    if (!hasPermission) {
      return {
        allowed: false,
        reason: 'ليس لديك صلاحية لعرض المخزون',
      }
    }

    return { allowed: true }
  }

  /**
   * Check if user can manage warehouse operations
   */
  static async canManage(userId: string): Promise<PolicyResult> {
    const hasPermission = await this.hasWarehousePermission(userId, 'manage')
    if (!hasPermission) {
      return {
        allowed: false,
        reason: 'ليس لديك صلاحية لإدارة المستودع',
      }
    }

    return { allowed: true }
  }

  /**
   * Internal helper to check warehouse permissions
   */
  private static async hasWarehousePermission(
    userId: string,
    action: 'check_out' | 'check_in' | 'view' | 'manage'
  ): Promise<boolean> {
    // Map actions to permission strings
    const permissionMap: Record<string, string> = {
      check_out: 'warehouse.check_out',
      check_in: 'warehouse.check_in',
      view: 'warehouse.view',
      manage: 'warehouse.manage',
    }

    const permission = permissionMap[action]
    if (!permission) {
      return false
    }

    return await hasPermission(userId, permission as any)
  }
}
