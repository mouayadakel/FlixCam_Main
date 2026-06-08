/**
 * @file invoice.policy.ts
 * @description Authorization policies for invoice operations
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

export class InvoicePolicy {
  /**
   * Check if user can create invoices
   */
  static async canCreate(userId: string): Promise<PolicyResult> {
    const hasPermission = await this.hasInvoicePermission(userId, 'create')
    if (!hasPermission) {
      return {
        allowed: false,
        reason: 'ليس لديك صلاحية لإنشاء الفواتير',
      }
    }

    return { allowed: true }
  }

  /**
   * Check if user can view invoices (staff with invoice.read, or invoice customer).
   */
  static async canView(userId: string, invoiceId?: string): Promise<PolicyResult> {
    if (invoiceId) {
      const inv = await prisma.invoice.findFirst({
        where: { id: invoiceId, deletedAt: null },
        select: { customerId: true },
      })
      if (!inv) {
        return { allowed: false, reason: 'الفاتورة غير موجودة' }
      }
      if (inv.customerId === userId) {
        return { allowed: true }
      }
    }

    const hasPermission = await this.hasInvoicePermission(userId, 'view')
    if (!hasPermission) {
      return {
        allowed: false,
        reason: 'ليس لديك صلاحية لعرض الفواتير',
      }
    }

    return { allowed: true }
  }

  /**
   * Check if user can update invoices
   */
  static async canUpdate(userId: string, invoiceId: string): Promise<PolicyResult> {
    const hasPermission = await this.hasInvoicePermission(userId, 'update')
    if (!hasPermission) {
      return {
        allowed: false,
        reason: 'ليس لديك صلاحية لتحديث الفواتير',
      }
    }

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, deletedAt: null },
      select: { status: true, lockedAt: true },
    })

    if (!invoice) {
      return { allowed: false, reason: 'الفاتورة غير موجودة' }
    }

    if (invoice.lockedAt || invoice.status === 'PAID') {
      return { allowed: false, reason: 'لا يمكن تعديل فاتورة مدفوعة أو مقفلة' }
    }

    if (invoice.status === 'PARTIALLY_PAID') {
      return { allowed: false, reason: 'لا يمكن تعديل مبالغ فاتورة مدفوعة جزئياً' }
    }

    return { allowed: true }
  }

  /**
   * Check if user can mark invoice as paid
   */
  static async canMarkPaid(userId: string): Promise<PolicyResult> {
    const hasPermission = await this.hasInvoicePermission(userId, 'mark_paid')
    if (!hasPermission) {
      return {
        allowed: false,
        reason: 'ليس لديك صلاحية لتسجيل الدفع',
      }
    }

    return { allowed: true }
  }

  /**
   * Check if user can delete invoices
   */
  static async canDelete(userId: string, invoiceId: string): Promise<PolicyResult> {
    const hasPermission = await this.hasInvoicePermission(userId, 'delete')
    if (!hasPermission) {
      return {
        allowed: false,
        reason: 'ليس لديك صلاحية لحذف الفواتير',
      }
    }

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, deletedAt: null },
      select: { status: true, lockedAt: true },
    })

    if (!invoice) {
      return { allowed: false, reason: 'الفاتورة غير موجودة' }
    }

    if (invoice.lockedAt || invoice.status === 'PAID' || invoice.status === 'PARTIALLY_PAID') {
      return { allowed: false, reason: 'لا يمكن حذف فاتورة عليها مدفوعات أو مقفلة' }
    }

    return { allowed: true }
  }

  /**
   * Internal helper to check invoice permissions
   */
  private static async hasInvoicePermission(
    userId: string,
    action: 'create' | 'view' | 'update' | 'mark_paid' | 'delete'
  ): Promise<boolean> {
    // Map actions to permission strings
    const permissionMap: Record<string, string> = {
      create: 'invoice.create',
      view: 'invoice.read',
      update: 'invoice.update',
      mark_paid: 'invoice.mark_paid',
      delete: 'invoice.delete',
    }

    const permission = permissionMap[action]
    if (!permission) {
      return false
    }

    return await hasPermission(userId, permission as any)
  }
}
