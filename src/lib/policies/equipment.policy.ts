/**
 * @file equipment.policy.ts
 * @description Equipment authorization policies
 * @module lib/policies
 */

import { BasePolicy, PolicyResult } from './base.policy'
import { hasPermission } from '@/lib/auth/permissions'

export class EquipmentPolicy extends BasePolicy {
  /**
   * Check if user can create equipment
   */
  static async canCreate(userId: string): Promise<PolicyResult> {
    const hasPerm = await hasPermission(userId, 'equipment.create' as any)
    if (!hasPerm) {
      return this.denied('User does not have permission to create equipment')
    }
    return this.allowed()
  }

  /**
   * Check if user can view equipment
   */
  static async canView(userId: string): Promise<PolicyResult> {
    const hasPerm = await hasPermission(userId, 'equipment.view' as any)
    if (!hasPerm) {
      return this.denied('User does not have permission to view equipment')
    }
    return this.allowed()
  }

  /**
   * Check if user can edit equipment
   */
  static async canEdit(userId: string, equipmentId?: string): Promise<PolicyResult> {
    const hasPerm = await hasPermission(userId, 'equipment.edit' as any)
    if (!hasPerm) {
      return this.denied('User does not have permission to edit equipment')
    }
    return this.allowed()
  }

  /**
   * Check if user can delete equipment
   */
  static async canDelete(userId: string, equipmentId?: string): Promise<PolicyResult> {
    const hasPerm = await hasPermission(userId, 'equipment.delete' as any)
    if (!hasPerm) {
      return this.denied('User does not have permission to delete equipment')
    }
    return this.allowed()
  }
}
