/**
 * @file reports.policy.ts
 * @description Authorization policies for reports operations
 * @module lib/policies
 * @author Engineering Team
 * @created 2026-01-28
 */

import { hasPermission } from '@/lib/auth/permissions'

export interface PolicyResult {
  allowed: boolean
  reason?: string
}

export class ReportsPolicy {
  /**
   * Check if user can view reports
   */
  static async canView(userId: string, reportType?: string): Promise<PolicyResult> {
    const hasPermission = await this.hasReportsPermission(userId, 'view')
    if (!hasPermission) {
      return {
        allowed: false,
        reason: 'ليس لديك صلاحية لعرض التقارير',
      }
    }

    return { allowed: true }
  }

  /**
   * Check if user can export reports
   */
  static async canExport(userId: string): Promise<PolicyResult> {
    const hasPermission = await this.hasReportsPermission(userId, 'export')
    if (!hasPermission) {
      return {
        allowed: false,
        reason: 'ليس لديك صلاحية لتصدير التقارير',
      }
    }

    return { allowed: true }
  }

  /**
   * Internal helper to check reports permissions
   */
  private static async hasReportsPermission(
    userId: string,
    action: 'view' | 'export'
  ): Promise<boolean> {
    // Map actions to permission strings
    const permissionMap: Record<string, string> = {
      view: 'reports.view',
      export: 'reports.export',
    }

    const permission = permissionMap[action]
    if (!permission) {
      return false
    }

    return await hasPermission(userId, permission as any)
  }
}
