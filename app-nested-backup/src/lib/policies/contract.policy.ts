/**
 * @file contract.policy.ts
 * @description Authorization policies for contract operations
 * @module lib/policies
 * @author Engineering Team
 * @created 2026-01-28
 */

import { hasPermission } from '@/lib/auth/permissions'

export interface PolicyResult {
  allowed: boolean
  reason?: string
}

export class ContractPolicy {
  /**
   * Check if user can view contracts
   */
  static async canView(userId: string, contractId?: string): Promise<PolicyResult> {
    const hasPermission = await this.hasContractPermission(userId, 'view')
    if (!hasPermission) {
      return {
        allowed: false,
        reason: 'ليس لديك صلاحية لعرض العقود',
      }
    }

    return { allowed: true }
  }

  /**
   * Check if user can create contracts
   */
  static async canCreate(userId: string): Promise<PolicyResult> {
    const hasPermission = await this.hasContractPermission(userId, 'create')
    if (!hasPermission) {
      return {
        allowed: false,
        reason: 'ليس لديك صلاحية لإنشاء العقود',
      }
    }

    return { allowed: true }
  }

  /**
   * Check if user can update contracts
   */
  static async canUpdate(userId: string, contractId: string): Promise<PolicyResult> {
    const hasPermission = await this.hasContractPermission(userId, 'update')
    if (!hasPermission) {
      return {
        allowed: false,
        reason: 'ليس لديك صلاحية لتحديث العقود',
      }
    }

    return { allowed: true }
  }

  /**
   * Check if user can sign contracts
   */
  static async canSign(userId: string, contractId: string): Promise<PolicyResult> {
    const hasPermission = await this.hasContractPermission(userId, 'sign')
    if (!hasPermission) {
      return {
        allowed: false,
        reason: 'ليس لديك صلاحية لتوقيع العقود',
      }
    }

    return { allowed: true }
  }

  /**
   * Check if user can delete contracts
   */
  static async canDelete(userId: string, contractId: string): Promise<PolicyResult> {
    const hasPermission = await this.hasContractPermission(userId, 'delete')
    if (!hasPermission) {
      return {
        allowed: false,
        reason: 'ليس لديك صلاحية لحذف العقود',
      }
    }

    return { allowed: true }
  }

  /**
   * Internal helper to check contract permissions
   */
  private static async hasContractPermission(
    userId: string,
    action: 'create' | 'view' | 'update' | 'sign' | 'delete'
  ): Promise<boolean> {
    // Map actions to permission strings
    const permissionMap: Record<string, string> = {
      create: 'contract.create',
      view: 'contract.read',
      update: 'contract.update',
      sign: 'contract.sign',
      delete: 'contract.delete',
    }

    const permission = permissionMap[action]
    if (!permission) {
      return false
    }

    return await hasPermission(userId, permission as any)
  }
}
