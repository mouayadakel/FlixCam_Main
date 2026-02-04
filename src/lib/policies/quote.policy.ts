/**
 * @file quote.policy.ts
 * @description Authorization policies for quote operations
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

export class QuotePolicy {
  /**
   * Check if user can create quotes
   */
  static async canCreate(userId: string): Promise<PolicyResult> {
    const hasPermission = await this.hasQuotePermission(userId, 'create')
    if (!hasPermission) {
      return {
        allowed: false,
        reason: 'ليس لديك صلاحية لإنشاء عروض الأسعار',
      }
    }

    return { allowed: true }
  }

  /**
   * Check if user can view quotes
   */
  static async canView(userId: string, quoteId?: string): Promise<PolicyResult> {
    const hasPermission = await this.hasQuotePermission(userId, 'view')
    if (!hasPermission) {
      return {
        allowed: false,
        reason: 'ليس لديك صلاحية لعرض عروض الأسعار',
      }
    }

    // If quoteId provided, check if user owns it or has admin access
    if (quoteId) {
      // Additional ownership check can be added here
    }

    return { allowed: true }
  }

  /**
   * Check if user can update quotes
   */
  static async canUpdate(userId: string, quoteId: string): Promise<PolicyResult> {
    const hasPermission = await this.hasQuotePermission(userId, 'update')
    if (!hasPermission) {
      return {
        allowed: false,
        reason: 'ليس لديك صلاحية لتحديث عروض الأسعار',
      }
    }

    // Check if quote is in editable state
    const quote = await prisma.booking.findFirst({
      where: {
        id: quoteId,
        deletedAt: null,
      },
      select: {
        status: true,
      },
    })

    if (!quote) {
      return {
        allowed: false,
        reason: 'العرض غير موجود',
      }
    }

    // Only draft quotes can be edited
    // Note: In production, you'd have a separate Quote model with QuoteStatus
    // For now, we'll use booking status as a proxy
    if (quote.status !== 'DRAFT') {
      return {
        allowed: false,
        reason: 'لا يمكن تعديل العرض في هذه الحالة',
      }
    }

    return { allowed: true }
  }

  /**
   * Check if user can convert quote to booking
   */
  static async canConvert(userId: string): Promise<PolicyResult> {
    const hasPermission = await this.hasQuotePermission(userId, 'convert')
    if (!hasPermission) {
      return {
        allowed: false,
        reason: 'ليس لديك صلاحية لتحويل العرض إلى حجز',
      }
    }

    return { allowed: true }
  }

  /**
   * Check if user can delete quotes
   */
  static async canDelete(userId: string, quoteId: string): Promise<PolicyResult> {
    const hasPermission = await this.hasQuotePermission(userId, 'delete')
    if (!hasPermission) {
      return {
        allowed: false,
        reason: 'ليس لديك صلاحية لحذف عروض الأسعار',
      }
    }

    return { allowed: true }
  }

  /**
   * Internal helper to check quote permissions
   */
  private static async hasQuotePermission(
    userId: string,
    action: 'create' | 'view' | 'update' | 'convert' | 'delete'
  ): Promise<boolean> {
    // Map actions to permission strings
    const permissionMap: Record<string, string> = {
      create: 'quote.create',
      view: 'quote.view',
      update: 'quote.update',
      convert: 'quote.convert',
      delete: 'quote.delete',
    }

    const permission = permissionMap[action]
    if (!permission) {
      return false
    }

    return await hasPermission(userId, permission as any)
  }
}
