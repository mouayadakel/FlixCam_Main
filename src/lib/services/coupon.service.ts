/**
 * @file coupon.service.ts
 * @description Coupon service for coupon management and validation
 * @module lib/services
 * @author Engineering Team
 * @created 2026-01-28
 * @updated 2026-01-28
 */

import { prisma } from '@/lib/db/prisma'
import { AuditService } from './audit.service'
import { EventBus } from '@/lib/events/event-bus'
import { NotFoundError, ValidationError, ForbiddenError } from '@/lib/errors'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import type {
  Coupon,
  CouponType,
  CouponStatus,
  CouponCreateInput,
  CouponUpdateInput,
  CouponValidationResult,
} from '@/lib/types/coupon.types'
import { CouponType as PrismaCouponType, CouponStatus as PrismaCouponStatus } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

/**
 * Coupon Service
 * Uses the Coupon model for proper data storage.
 */
export class CouponService {
  /**
   * Map TypeScript CouponType to Prisma (percent -> PERCENT, fixed -> FIXED)
   */
  private static mapCouponType(type: CouponType): PrismaCouponType {
    return type === 'percent' ? 'PERCENT' : 'FIXED'
  }

  private static mapFromPrismaType(type: PrismaCouponType): CouponType {
    return type === 'PERCENT' ? 'percent' : 'fixed'
  }

  private static mapCouponStatus(status: CouponStatus): PrismaCouponStatus {
    const m: Record<CouponStatus, PrismaCouponStatus> = {
      active: 'ACTIVE',
      inactive: 'INACTIVE',
      expired: 'EXPIRED',
      scheduled: 'SCHEDULED',
    }
    return m[status] ?? 'ACTIVE'
  }

  private static mapFromPrismaStatus(status: PrismaCouponStatus): CouponStatus {
    return status.toLowerCase() as CouponStatus
  }

  static async create(
    input: CouponCreateInput,
    userId: string,
    auditContext?: { ipAddress?: string; userAgent?: string }
  ): Promise<Coupon> {
    const canCreate = await hasPermission(userId, PERMISSIONS.COUPON_CREATE)
    if (!canCreate) {
      throw new ForbiddenError('You do not have permission to create coupons')
    }

    const code = input.code.toUpperCase().trim()
    const existing = await prisma.coupon.findFirst({
      where: { code, deletedAt: null },
    })
    if (existing) {
      throw new ValidationError('Coupon code already exists')
    }

    const now = new Date()
    let status: PrismaCouponStatus = 'ACTIVE'
    if (input.validFrom > now) status = 'SCHEDULED'
    else if (input.validUntil < now) status = 'EXPIRED'

    const coupon = await prisma.coupon.create({
      data: {
        code,
        name: input.code,
        type: this.mapCouponType(input.type),
        discountValue: input.type === 'fixed' ? new Decimal(input.value) : null,
        discountPercentage: input.type === 'percent' ? new Decimal(input.value) : null,
        minimumAmount: input.minPurchaseAmount ? new Decimal(input.minPurchaseAmount) : null,
        maximumDiscount: input.maxDiscountAmount ? new Decimal(input.maxDiscountAmount) : null,
        validFrom: input.validFrom,
        validUntil: input.validUntil,
        usageLimit: input.usageLimit ?? null,
        status,
        applicableEquipmentIds: (input.applicableTo ?? null) as any,
        description: input.description ?? null,
        canCombineWithOtherOffers: input.canCombineWithOtherOffers ?? true,
        createdBy: userId,
      },
    })

    await AuditService.log({
      action: 'coupon.created',
      userId,
      resourceType: 'coupon',
      resourceId: coupon.id,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
      metadata: { code, type: input.type, value: input.value },
    })

    await EventBus.emit('coupon.created', {
      couponId: coupon.id,
      code,
      type: input.type,
      value: input.value,
      createdBy: userId,
      timestamp: new Date(),
    } as any)

    return this.transformToCoupon(coupon)
  }

  static async getById(idOrCode: string, userId: string): Promise<Coupon> {
    const canView = await hasPermission(userId, PERMISSIONS.COUPON_READ)
    if (!canView) {
      throw new ForbiddenError('You do not have permission to view coupons')
    }

    const code = idOrCode.toUpperCase().trim()
    const coupon = await prisma.coupon.findFirst({
      where: {
        deletedAt: null,
        OR: [{ id: idOrCode }, { code }],
      },
    })

    if (!coupon) {
      throw new NotFoundError('Coupon', idOrCode)
    }

    return this.transformToCoupon(coupon)
  }

  static async list(
    userId: string,
    filters: {
      status?: CouponStatus
      type?: CouponType
      search?: string
      dateFrom?: Date
      dateTo?: Date
      active?: boolean
      page?: number
      pageSize?: number
    } = {}
  ): Promise<{ coupons: Coupon[]; total: number; page: number; pageSize: number }> {
    const canView = await hasPermission(userId, PERMISSIONS.COUPON_READ)
    if (!canView) {
      throw new ForbiddenError('You do not have permission to view coupons')
    }

    const page = filters.page ?? 1
    const pageSize = filters.pageSize ?? 20
    const skip = (page - 1) * pageSize

    const where: any = { deletedAt: null }
    if (filters.status) where.status = this.mapCouponStatus(filters.status)
    if (filters.type) where.type = this.mapCouponType(filters.type)
    if (filters.search) {
      where.OR = [
        { code: { contains: filters.search, mode: 'insensitive' } },
        { name: { contains: filters.search, mode: 'insensitive' } },
        { description: { contains: filters.search, mode: 'insensitive' } },
      ]
    }
    if (filters.dateFrom || filters.dateTo) {
      if (filters.dateFrom) {
        where.validFrom = { ...(where.validFrom as object), gte: filters.dateFrom }
      }
      if (filters.dateTo) {
        where.validUntil = { lte: filters.dateTo }
      }
    }
    if (filters.active === true) {
      const now = new Date()
      where.status = 'ACTIVE'
      where.validFrom = { lte: now }
      where.validUntil = { gte: now }
    } else if (filters.active === false) {
      where.OR = [{ status: { not: 'ACTIVE' } }, { validUntil: { lt: new Date() } }]
    }

    const [coupons, total] = await Promise.all([
      prisma.coupon.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: pageSize,
      }),
      prisma.coupon.count({ where }),
    ])

    return {
      coupons: coupons.map((c) => this.transformToCoupon(c)),
      total,
      page,
      pageSize,
    }
  }

  static async update(
    id: string,
    input: CouponUpdateInput,
    userId: string,
    auditContext?: { ipAddress?: string; userAgent?: string }
  ): Promise<Coupon> {
    const canUpdate = await hasPermission(userId, PERMISSIONS.COUPON_UPDATE)
    if (!canUpdate) {
      throw new ForbiddenError('You do not have permission to update coupons')
    }

    const existing = await prisma.coupon.findFirst({
      where: {
        deletedAt: null,
        OR: [{ id }, { code: id.toUpperCase().trim() }],
      },
    })

    if (!existing) {
      throw new NotFoundError('Coupon', id)
    }

    if (input.code && input.code.toUpperCase().trim() !== existing.code) {
      const conflict = await prisma.coupon.findFirst({
        where: { code: input.code.toUpperCase().trim(), deletedAt: null },
      })
      if (conflict) {
        throw new ValidationError('Coupon code already exists')
      }
    }

    const now = new Date()
    let status: PrismaCouponStatus | undefined
    if (input.status) {
      status = this.mapCouponStatus(input.status)
    } else if (input.validFrom !== undefined || input.validUntil !== undefined) {
      const validFrom = input.validFrom ? new Date(input.validFrom) : existing.validFrom
      const validUntil = input.validUntil ? new Date(input.validUntil) : existing.validUntil
      if (validUntil < now) status = 'EXPIRED'
      else if (validFrom > now) status = 'SCHEDULED'
      else status = 'ACTIVE'
    }

    const updated = await prisma.coupon.update({
      where: { id: existing.id },
      data: {
        code: input.code ? input.code.toUpperCase().trim() : undefined,
        name: input.code ? input.code : undefined,
        type: input.type ? this.mapCouponType(input.type) : undefined,
        discountValue:
          input.type === 'fixed' && input.value !== undefined
            ? new Decimal(input.value)
            : input.type === 'percent'
              ? null
              : undefined,
        discountPercentage:
          input.type === 'percent' && input.value !== undefined
            ? new Decimal(input.value)
            : input.type === 'fixed'
              ? null
              : undefined,
        minimumAmount:
          input.minPurchaseAmount !== undefined
            ? input.minPurchaseAmount
              ? new Decimal(input.minPurchaseAmount)
              : null
            : undefined,
        maximumDiscount:
          input.maxDiscountAmount !== undefined
            ? input.maxDiscountAmount
              ? new Decimal(input.maxDiscountAmount)
              : null
            : undefined,
        usageLimit: input.usageLimit !== undefined ? input.usageLimit : undefined,
        validFrom: input.validFrom,
        validUntil: input.validUntil,
        applicableEquipmentIds:
          input.applicableTo !== undefined ? (input.applicableTo as any) : undefined,
        description: input.description !== undefined ? input.description : undefined,
        canCombineWithOtherOffers: input.canCombineWithOtherOffers !== undefined ? input.canCombineWithOtherOffers : undefined,
        status,
        updatedBy: userId,
      },
    })

    await AuditService.log({
      action: 'coupon.updated',
      userId,
      resourceType: 'coupon',
      resourceId: existing.id,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
    })

    return this.transformToCoupon(updated)
  }

  static async validate(
    code: string,
    amount: number,
    equipmentIds?: string[],
    userId?: string
  ): Promise<CouponValidationResult> {
    const coupon = await this.getById(code, userId ?? 'system')

    const now = new Date()
    const validFrom = new Date(coupon.validFrom)
    const validUntil = new Date(coupon.validUntil)

    if (validUntil < now) {
      return { valid: false, discountAmount: 0, error: 'الكوبون منتهي الصلاحية | Coupon is expired' }
    }
    if (validFrom > now) {
      return { valid: false, discountAmount: 0, error: 'الكوبون غير فعال بعد | Coupon is not active yet' }
    }
    if (coupon.status !== 'active') {
      return { valid: false, discountAmount: 0, error: 'الكوبون غير فعال | Coupon is inactive' }
    }
    if (coupon.usageLimit != null && coupon.usageCount >= coupon.usageLimit) {
      return { valid: false, discountAmount: 0, error: 'تم استخدام الكوبون بالكامل | Coupon usage limit reached' }
    }
    if (coupon.minPurchaseAmount != null && amount < coupon.minPurchaseAmount) {
      return {
        valid: false,
        discountAmount: 0,
        error: `الحد الأدنى للشراء: ${coupon.minPurchaseAmount} ريال | Min purchase: ${coupon.minPurchaseAmount} SAR`,
      }
    }
    
    // Whitelist/Blacklist Equipment Verification
    if (coupon.applicableTo && coupon.applicableTo.length > 0 && equipmentIds && equipmentIds.length > 0) {
      const applicable = equipmentIds.some((id) => coupon.applicableTo?.includes(id))
      if (!applicable) {
        return {
          valid: false,
          discountAmount: 0,
          error: 'الكوبون غير قابل للتطبيق على هذه المعدات | Coupon not applicable to these items',
        }
      }
    }

    const value = coupon.value
    let rawDiscount = coupon.type === 'percent' ? (amount * value) / 100 : value
    if (coupon.maxDiscountAmount != null && rawDiscount > coupon.maxDiscountAmount) {
      rawDiscount = coupon.maxDiscountAmount
    }
    if (rawDiscount > amount) rawDiscount = amount

    // Enforce 2-decimal math precision rounding
    const discountAmount = Math.round(rawDiscount * 100) / 100

    return { 
      valid: true, 
      discountAmount,
      // Pass stackability parameters for checkout engine integration
      metadata: {
        canCombineWithOtherOffers: coupon.canCombineWithOtherOffers
      } as any
    }
  }

  static async apply(
    code: string,
    userId: string,
    auditContext?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    const coupon = await this.getById(code, userId)
    const existing = await prisma.coupon.findFirst({
      where: { id: coupon.id, deletedAt: null },
    })
    if (!existing) {
      throw new NotFoundError('Coupon', code)
    }

    if (existing.usageLimit != null && existing.usedCount >= existing.usageLimit) {
      throw new ValidationError('Coupon usage limit reached')
    }

    const updated = await prisma.coupon.updateMany({
      where: {
        id: existing.id,
        deletedAt: null,
        usedCount: existing.usedCount,
      },
      data: {
        usedCount: { increment: 1 },
        updatedBy: userId,
      },
    })

    if (updated.count !== 1) {
      throw new ValidationError('Coupon usage limit reached')
    }

    await AuditService.log({
      action: 'coupon.applied',
      userId,
      resourceType: 'coupon',
      resourceId: existing.id,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
      metadata: { code, usageCount: existing.usedCount + 1 },
    })
  }

  static async delete(
    id: string,
    userId: string,
    auditContext?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    const canDelete = await hasPermission(userId, PERMISSIONS.COUPON_DELETE)
    if (!canDelete) {
      throw new ForbiddenError('You do not have permission to delete coupons')
    }

    const coupon = await prisma.coupon.findFirst({
      where: {
        deletedAt: null,
        OR: [{ id }, { code: id.toUpperCase().trim() }],
      },
    })

    if (!coupon) {
      throw new NotFoundError('Coupon', id)
    }

    await prisma.coupon.update({
      where: { id: coupon.id },
      data: { deletedAt: new Date(), deletedBy: userId },
    })

    await AuditService.log({
      action: 'coupon.deleted',
      userId,
      resourceType: 'coupon',
      resourceId: coupon.id,
      ipAddress: auditContext != null ? auditContext.ipAddress : undefined,
      userAgent: auditContext != null ? auditContext.userAgent : undefined,
    })
  }

  private static transformToCoupon(row: any): Coupon {
    const value =
      row.type === 'PERCENT' ? Number(row.discountPercentage ?? 0) : Number(row.discountValue ?? 0)
    let status = this.mapFromPrismaStatus(row.status)
    const now = new Date()
    if (row.validUntil < now && status !== 'expired') status = 'expired'
    else if (row.validFrom > now && status === 'active') status = 'scheduled'

    return {
      id: row.id,
      code: row.code,
      type: this.mapFromPrismaType(row.type),
      value,
      minPurchaseAmount: row.minimumAmount != null ? Number(row.minimumAmount) : null,
      maxDiscountAmount: row.maximumDiscount != null ? Number(row.maximumDiscount) : null,
      usageLimit: row.usageLimit,
      usageCount: row.usedCount,
      status,
      validFrom: row.validFrom,
      validUntil: row.validUntil,
      applicableTo: row.applicableEquipmentIds as string[] | null,
      description: row.description,
      canCombineWithOtherOffers: row.canCombineWithOtherOffers,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      createdBy: row.createdBy,
      updatedBy: row.updatedBy,
    }
  }

  /**
   * Generate a one-time referral reward coupon.
   */
  static async generateReferralCoupon(userId: string, suffix: string): Promise<string> {
    const code = `REF-${suffix}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`

    // Create coupon without permission check for system automation
    const coupon = await prisma.coupon.create({
      data: {
        code,
        name: `Referral Reward - ${suffix}`,
        type: 'FIXED',
        discountValue: new Decimal(50), // 50 SAR flat discount
        minimumAmount: new Decimal(200), // Min spend 200
        validFrom: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        usageLimit: 1,
        status: 'ACTIVE',
        description: 'هدية دعوة صديق - صديقك سجل بنجاح!',
        createdBy: userId // The person receiving the coupon
      }
    })

    return coupon.code
  }
}
