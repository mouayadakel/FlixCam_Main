/**
 * @file base.policy.ts
 * @description Base policy class for authorization
 * @module lib/policies
 */

import { hasPermission } from '@/lib/auth/permissions'

export interface PolicyResult {
  allowed: boolean
  reason?: string
}

export abstract class BasePolicy {
  /**
   * Check if user has permission
   */
  protected static async checkPermission(userId: string, permission: string): Promise<boolean> {
    return hasPermission(userId, permission as any)
  }

  /**
   * Return allowed result
   */
  protected static allowed(): PolicyResult {
    return { allowed: true }
  }

  /**
   * Return denied result with reason
   */
  protected static denied(reason: string): PolicyResult {
    return { allowed: false, reason }
  }
}
