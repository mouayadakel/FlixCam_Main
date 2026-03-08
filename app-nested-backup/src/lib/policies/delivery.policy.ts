/**
 * @file delivery.policy.ts
 * @description Authorization policies for delivery operations
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

export class DeliveryPolicy {
  /**
   * Check if user can schedule deliveries
   */
  static async canSchedule(userId: string): Promise<PolicyResult> {
    const hasPermission = await this.hasDeliveryPermission(userId, 'schedule')
    if (!hasPermission) {
      return {
        allowed: false,
        reason: 'ليس لديك صلاحية لجدولة التوصيلات',
      }
    }

    return { allowed: true }
  }

  /**
   * Check if user can update deliveries
   */
  static async canUpdate(userId: string): Promise<PolicyResult> {
    const hasPermission = await this.hasDeliveryPermission(userId, 'update')
    if (!hasPermission) {
      return {
        allowed: false,
        reason: 'ليس لديك صلاحية لتحديث التوصيلات',
      }
    }

    return { allowed: true }
  }

  /**
   * Check if user can view deliveries
   */
  static async canView(userId: string): Promise<PolicyResult> {
    const hasPermission = await this.hasDeliveryPermission(userId, 'view')
    if (!hasPermission) {
      return {
        allowed: false,
        reason: 'ليس لديك صلاحية لعرض التوصيلات',
      }
    }

    return { allowed: true }
  }

  /**
   * Check if user can manage deliveries
   */
  static async canManage(userId: string): Promise<PolicyResult> {
    const hasPermission = await this.hasDeliveryPermission(userId, 'manage')
    if (!hasPermission) {
      return {
        allowed: false,
        reason: 'ليس لديك صلاحية لإدارة التوصيلات',
      }
    }

    return { allowed: true }
  }

  /**
   * Internal helper to check delivery permissions
   */
  private static async hasDeliveryPermission(
    userId: string,
    action: 'schedule' | 'update' | 'view' | 'manage'
  ): Promise<boolean> {
    // Map actions to permission strings
    const permissionMap: Record<string, string> = {
      schedule: 'delivery.schedule',
      update: 'delivery.update',
      view: 'delivery.read',
      manage: 'delivery.manage',
    }

    const permission = permissionMap[action]
    if (!permission) {
      return false
    }

    return await hasPermission(userId, permission as any)
  }
}
