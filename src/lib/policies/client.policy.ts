/**
 * @file client.policy.ts
 * @description Authorization policies for client operations
 * @module lib/policies
 * @author Engineering Team
 * @created 2026-01-28
 */

import { hasPermission } from '@/lib/auth/permissions'

export interface PolicyResult {
  allowed: boolean
  reason?: string
}

export class ClientPolicy {
  /**
   * Check if user can view clients
   */
  static async canView(userId: string, clientId?: string): Promise<PolicyResult> {
    const hasPermission = await this.hasClientPermission(userId, 'view')
    if (!hasPermission) {
      return {
        allowed: false,
        reason: 'ليس لديك صلاحية لعرض العملاء',
      }
    }

    return { allowed: true }
  }

  /**
   * Check if user can create clients
   */
  static async canCreate(userId: string): Promise<PolicyResult> {
    const hasPermission = await this.hasClientPermission(userId, 'create')
    if (!hasPermission) {
      return {
        allowed: false,
        reason: 'ليس لديك صلاحية لإنشاء العملاء',
      }
    }

    return { allowed: true }
  }

  /**
   * Check if user can update clients
   */
  static async canUpdate(userId: string, clientId: string): Promise<PolicyResult> {
    const hasPermission = await this.hasClientPermission(userId, 'update')
    if (!hasPermission) {
      return {
        allowed: false,
        reason: 'ليس لديك صلاحية لتحديث العملاء',
      }
    }

    return { allowed: true }
  }

  /**
   * Check if user can delete clients
   */
  static async canDelete(userId: string, clientId: string): Promise<PolicyResult> {
    const hasPermission = await this.hasClientPermission(userId, 'delete')
    if (!hasPermission) {
      return {
        allowed: false,
        reason: 'ليس لديك صلاحية لحذف العملاء',
      }
    }

    return { allowed: true }
  }

  /**
   * Internal helper to check client permissions
   */
  private static async hasClientPermission(
    userId: string,
    action: 'create' | 'view' | 'update' | 'delete'
  ): Promise<boolean> {
    // Map actions to permission strings
    const permissionMap: Record<string, string> = {
      create: 'client.create',
      view: 'client.read',
      update: 'client.update',
      delete: 'client.delete',
    }

    const permission = permissionMap[action]
    if (!permission) {
      return false
    }

    return await hasPermission(userId, permission as any)
  }
}
