/**
 * @file coupon.policy.ts
 * @description Authorization policies for coupon operations
 * @module lib/policies
 * @author Engineering Team
 * @created 2026-01-28
 */

import { hasPermission } from '@/lib/auth/permissions'

export interface PolicyResult {
  allowed: boolean
  reason?: string
}

export class CouponPolicy {
  /**
   * Check if user can view coupons
   */
  static async canView(userId: string, couponId?: string): Promise<PolicyResult> {
    const hasPermission = await this.hasCouponPermission(userId, 'view')
    if (!hasPermission) {
      return {
        allowed: false,
        reason: 'ليس لديك صلاحية لعرض الكوبونات',
      }
    }

    return { allowed: true }
  }

  /**
   * Check if user can create coupons
   */
  static async canCreate(userId: string): Promise<PolicyResult> {
    const hasPermission = await this.hasCouponPermission(userId, 'create')
    if (!hasPermission) {
      return {
        allowed: false,
        reason: 'ليس لديك صلاحية لإنشاء الكوبونات',
      }
    }

    return { allowed: true }
  }

  /**
   * Check if user can update coupons
   */
  static async canUpdate(userId: string, couponId: string): Promise<PolicyResult> {
    const hasPermission = await this.hasCouponPermission(userId, 'update')
    if (!hasPermission) {
      return {
        allowed: false,
        reason: 'ليس لديك صلاحية لتحديث الكوبونات',
      }
    }

    return { allowed: true }
  }

  /**
   * Check if user can delete coupons
   */
  static async canDelete(userId: string, couponId: string): Promise<PolicyResult> {
    const hasPermission = await this.hasCouponPermission(userId, 'delete')
    if (!hasPermission) {
      return {
        allowed: false,
        reason: 'ليس لديك صلاحية لحذف الكوبونات',
      }
    }

    return { allowed: true }
  }

  /**
   * Internal helper to check coupon permissions
   */
  private static async hasCouponPermission(
    userId: string,
    action: 'create' | 'view' | 'update' | 'delete'
  ): Promise<boolean> {
    // Map actions to permission strings
    const permissionMap: Record<string, string> = {
      create: 'coupon.create',
      view: 'coupon.view',
      update: 'coupon.update',
      delete: 'coupon.delete',
    }

    const permission = permissionMap[action]
    if (!permission) {
      return false
    }

    return await hasPermission(userId, permission as any)
  }
}
