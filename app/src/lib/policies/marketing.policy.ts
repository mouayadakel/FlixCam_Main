/**
 * @file marketing.policy.ts
 * @description Authorization policies for marketing operations
 * @module lib/policies
 * @author Engineering Team
 * @created 2026-01-28
 */

import { hasPermission } from '@/lib/auth/permissions'

export interface PolicyResult {
  allowed: boolean
  reason?: string
}

export class MarketingPolicy {
  /**
   * Check if user can view campaigns
   */
  static async canView(userId: string, campaignId?: string): Promise<PolicyResult> {
    const hasPermission = await this.hasMarketingPermission(userId, 'view')
    if (!hasPermission) {
      return {
        allowed: false,
        reason: 'ليس لديك صلاحية لعرض الحملات',
      }
    }

    return { allowed: true }
  }

  /**
   * Check if user can create campaigns
   */
  static async canCreate(userId: string): Promise<PolicyResult> {
    const hasPermission = await this.hasMarketingPermission(userId, 'create')
    if (!hasPermission) {
      return {
        allowed: false,
        reason: 'ليس لديك صلاحية لإنشاء الحملات',
      }
    }

    return { allowed: true }
  }

  /**
   * Check if user can update campaigns
   */
  static async canUpdate(userId: string, campaignId: string): Promise<PolicyResult> {
    const hasPermission = await this.hasMarketingPermission(userId, 'update')
    if (!hasPermission) {
      return {
        allowed: false,
        reason: 'ليس لديك صلاحية لتحديث الحملات',
      }
    }

    return { allowed: true }
  }

  /**
   * Check if user can send campaigns
   */
  static async canSend(userId: string): Promise<PolicyResult> {
    const hasPermission = await this.hasMarketingPermission(userId, 'send')
    if (!hasPermission) {
      return {
        allowed: false,
        reason: 'ليس لديك صلاحية لإرسال الحملات',
      }
    }

    return { allowed: true }
  }

  /**
   * Check if user can delete campaigns
   */
  static async canDelete(userId: string, campaignId: string): Promise<PolicyResult> {
    const hasPermission = await this.hasMarketingPermission(userId, 'delete')
    if (!hasPermission) {
      return {
        allowed: false,
        reason: 'ليس لديك صلاحية لحذف الحملات',
      }
    }

    return { allowed: true }
  }

  /**
   * Internal helper to check marketing permissions
   */
  private static async hasMarketingPermission(
    userId: string,
    action: 'create' | 'view' | 'update' | 'send' | 'delete'
  ): Promise<boolean> {
    // Map actions to permission strings
    const permissionMap: Record<string, string> = {
      create: 'marketing.create',
      view: 'marketing.read',
      update: 'marketing.update',
      send: 'marketing.send',
      delete: 'marketing.delete',
    }

    const permission = permissionMap[action]
    if (!permission) {
      return false
    }

    return await hasPermission(userId, permission as any)
  }
}
