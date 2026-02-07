/**
 * @file payment.policy.ts
 * @description Authorization policies for payment operations
 * @module lib/policies
 * @author Engineering Team
 * @created 2026-01-28
 */

import { hasPermission } from '@/lib/auth/permissions'

export interface PolicyResult {
  allowed: boolean
  reason?: string
}

export class PaymentPolicy {
  /**
   * Check if user can view payments
   */
  static async canView(userId: string, paymentId?: string): Promise<PolicyResult> {
    const hasPermission = await this.hasPaymentPermission(userId, 'view')
    if (!hasPermission) {
      return {
        allowed: false,
        reason: 'ليس لديك صلاحية لعرض المدفوعات',
      }
    }

    return { allowed: true }
  }

  /**
   * Check if user can create payments
   */
  static async canCreate(userId: string): Promise<PolicyResult> {
    const hasPermission = await this.hasPaymentPermission(userId, 'create')
    if (!hasPermission) {
      return {
        allowed: false,
        reason: 'ليس لديك صلاحية لإنشاء المدفوعات',
      }
    }

    return { allowed: true }
  }

  /**
   * Check if user can update payments
   */
  static async canUpdate(userId: string, paymentId: string): Promise<PolicyResult> {
    const hasPermission = await this.hasPaymentPermission(userId, 'update')
    if (!hasPermission) {
      return {
        allowed: false,
        reason: 'ليس لديك صلاحية لتحديث المدفوعات',
      }
    }

    return { allowed: true }
  }

  /**
   * Check if user can process refunds
   */
  static async canRefund(userId: string): Promise<PolicyResult> {
    const hasPermission = await this.hasPaymentPermission(userId, 'refund')
    if (!hasPermission) {
      return {
        allowed: false,
        reason: 'ليس لديك صلاحية لمعالجة الاستردادات',
      }
    }

    return { allowed: true }
  }

  /**
   * Check if user can delete payments
   */
  static async canDelete(userId: string, paymentId: string): Promise<PolicyResult> {
    const hasPermission = await this.hasPaymentPermission(userId, 'delete')
    if (!hasPermission) {
      return {
        allowed: false,
        reason: 'ليس لديك صلاحية لحذف المدفوعات',
      }
    }

    return { allowed: true }
  }

  /**
   * Internal helper to check payment permissions
   */
  private static async hasPaymentPermission(
    userId: string,
    action: 'create' | 'view' | 'update' | 'refund' | 'delete'
  ): Promise<boolean> {
    // Map actions to permission strings
    const permissionMap: Record<string, string> = {
      create: 'payment.create',
      view: 'payment.read',
      update: 'payment.update',
      refund: 'payment.refund',
      delete: 'payment.delete',
    }

    const permission = permissionMap[action]
    if (!permission) {
      return false
    }

    return await hasPermission(userId, permission as any)
  }
}
