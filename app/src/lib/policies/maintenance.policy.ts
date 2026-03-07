/**
 * @file maintenance.policy.ts
 * @description Authorization policies for maintenance operations
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

export class MaintenancePolicy {
  /**
   * Check if user can create maintenance requests
   */
  static async canCreate(userId: string): Promise<PolicyResult> {
    const hasPermission = await this.hasMaintenancePermission(userId, 'create')
    if (!hasPermission) {
      return {
        allowed: false,
        reason: 'ليس لديك صلاحية لإنشاء طلبات الصيانة',
      }
    }

    return { allowed: true }
  }

  /**
   * Check if user can view maintenance
   */
  static async canView(userId: string, maintenanceId?: string): Promise<PolicyResult> {
    const hasPermission = await this.hasMaintenancePermission(userId, 'view')
    if (!hasPermission) {
      return {
        allowed: false,
        reason: 'ليس لديك صلاحية لعرض طلبات الصيانة',
      }
    }

    return { allowed: true }
  }

  /**
   * Check if user can update maintenance
   */
  static async canUpdate(userId: string, maintenanceId: string): Promise<PolicyResult> {
    const hasPermission = await this.hasMaintenancePermission(userId, 'update')
    if (!hasPermission) {
      return {
        allowed: false,
        reason: 'ليس لديك صلاحية لتحديث طلبات الصيانة',
      }
    }

    return { allowed: true }
  }

  /**
   * Check if user can complete maintenance
   */
  static async canComplete(userId: string): Promise<PolicyResult> {
    const hasPermission = await this.hasMaintenancePermission(userId, 'complete')
    if (!hasPermission) {
      return {
        allowed: false,
        reason: 'ليس لديك صلاحية لإكمال طلبات الصيانة',
      }
    }

    return { allowed: true }
  }

  /**
   * Check if user can delete maintenance
   */
  static async canDelete(userId: string, maintenanceId: string): Promise<PolicyResult> {
    const hasPermission = await this.hasMaintenancePermission(userId, 'delete')
    if (!hasPermission) {
      return {
        allowed: false,
        reason: 'ليس لديك صلاحية لحذف طلبات الصيانة',
      }
    }

    return { allowed: true }
  }

  /**
   * Internal helper to check maintenance permissions
   */
  private static async hasMaintenancePermission(
    userId: string,
    action: 'create' | 'view' | 'update' | 'complete' | 'delete'
  ): Promise<boolean> {
    // Map actions to permission strings
    const permissionMap: Record<string, string> = {
      create: 'maintenance.create',
      view: 'maintenance.read',
      update: 'maintenance.update',
      complete: 'maintenance.complete',
      delete: 'maintenance.delete',
    }

    const permission = permissionMap[action]
    if (!permission) {
      return false
    }

    return await hasPermission(userId, permission as any)
  }
}
