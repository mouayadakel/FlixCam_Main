/**
 * @file payout.service.ts
 * @description Business logic for vendor payouts
 * @module lib/services
 */

import { prisma } from '@/lib/db/prisma'
import { hasPermission } from '@/lib/auth/permissions'
import { AuditService } from './audit.service'
import { NotFoundError, ForbiddenError } from '@/lib/errors'
import { PayoutStatus } from '@prisma/client'
import type { Decimal } from '@prisma/client/runtime/library'

export interface CreatePayoutInput {
  vendorId: string
  bookingId?: string
  grossAmount: number
  periodStart?: Date
  periodEnd?: Date
}

export interface PayoutFilters {
  status?: PayoutStatus
  vendorId?: string
  startDate?: Date
  endDate?: Date
  skip?: number
  take?: number
}

function toNumber(d: Decimal | null | undefined): number {
  if (d == null) return 0
  return typeof d === 'object' && 'toNumber' in d ? (d as Decimal).toNumber() : Number(d)
}

export class PayoutService {
  /**
   * Create vendor payouts for a confirmed booking.
   * Called when booking transitions to CONFIRMED.
   * Calculates gross amount per vendor from equipment line totals (dailyPrice * quantity * days).
   */
  static async createVendorPayoutsForBooking(bookingId: string, createdBy?: string): Promise<void> {
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, deletedAt: null },
      include: {
        equipment: {
          where: { deletedAt: null },
          include: {
            equipment: {
              select: {
                id: true,
                vendorId: true,
                dailyPrice: true,
              },
            },
          },
        },
      },
    })

    if (!booking) return

    const days =
      Math.ceil(
        (new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime()) /
          (1000 * 60 * 60 * 24)
      ) || 1

    const vendorTotals = new Map<string, number>()

    for (const be of booking.equipment) {
      const eq = be.equipment
      if (!eq.vendorId) continue

      const dailyPrice = toNumber(eq.dailyPrice)
      const gross = dailyPrice * be.quantity * days
      const existing = vendorTotals.get(eq.vendorId) ?? 0
      vendorTotals.set(eq.vendorId, existing + gross)
    }

    for (const [vendorId, grossAmount] of vendorTotals) {
      if (grossAmount <= 0) continue

      const existing = await prisma.vendorPayout.findFirst({
        where: { vendorId, bookingId },
      })
      if (existing) continue

      await this.createPayout(
        {
          vendorId,
          bookingId,
          grossAmount,
          periodStart: booking.startDate,
          periodEnd: booking.endDate,
        },
        createdBy
      )
    }
  }

  /**
   * Create payout record when booking is confirmed/paid
   * Calculates commission from vendor's rate and creates VendorPayout
   */
  static async createPayout(input: CreatePayoutInput, createdBy?: string) {
    const vendor = await prisma.vendor.findFirst({
      where: { id: input.vendorId, deletedAt: null },
    })
    if (!vendor) throw new NotFoundError('Vendor', input.vendorId)

    const rate = toNumber(vendor.commissionRate) / 100
    const commissionAmount = Math.round(input.grossAmount * rate * 100) / 100
    const netAmount = Math.round((input.grossAmount - commissionAmount) * 100) / 100

    const payout = await prisma.vendorPayout.create({
      data: {
        vendorId: input.vendorId,
        bookingId: input.bookingId ?? null,
        periodStart: input.periodStart ?? null,
        periodEnd: input.periodEnd ?? null,
        grossAmount: input.grossAmount,
        commissionAmount,
        netAmount,
        status: PayoutStatus.PENDING,
        createdBy: createdBy ?? null,
      },
      include: { vendor: { select: { companyName: true } } },
    })

    return payout
  }

  /**
   * Get payouts for a vendor (vendor or admin)
   */
  static async getPayoutsByVendor(
    vendorId: string,
    filters: PayoutFilters = {},
    requestUserId: string
  ) {
    const vendor = await prisma.vendor.findFirst({
      where: { id: vendorId, deletedAt: null },
    })
    if (!vendor) throw new NotFoundError('Vendor', vendorId)

    const isAdmin = await hasPermission(requestUserId, 'vendor.read' as never)
    const isOwnVendor = vendor.userId === requestUserId
    if (!isAdmin && !isOwnVendor) {
      throw new ForbiddenError('You do not have permission to view these payouts')
    }

    const { status, startDate, endDate, skip = 0, take = 50 } = filters

    const where: Record<string, unknown> = { vendorId }
    if (status) where.status = status
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) (where.createdAt as Record<string, Date>).gte = startDate
      if (endDate) (where.createdAt as Record<string, Date>).lte = endDate
    }

    const [items, total] = await Promise.all([
      prisma.vendorPayout.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.vendorPayout.count({ where }),
    ])

    return { items, total, skip, take }
  }

  /**
   * Mark payout as paid (admin only)
   */
  static async markPayoutPaid(
    payoutId: string,
    adminUserId: string,
    options?: { bankRef?: string; notes?: string }
  ) {
    const canManage = await hasPermission(adminUserId, 'vendor.manage_payouts' as never)
    if (!canManage) {
      throw new ForbiddenError('You do not have permission to manage payouts')
    }

    const payout = await prisma.vendorPayout.findFirst({
      where: { id: payoutId },
      include: { vendor: { select: { companyName: true } } },
    })
    if (!payout) throw new NotFoundError('Payout', payoutId)
    if (payout.status === PayoutStatus.PAID) {
      throw new ForbiddenError('Payout is already marked as paid')
    }

    const updated = await prisma.vendorPayout.update({
      where: { id: payoutId },
      data: {
        status: PayoutStatus.PAID,
        paidAt: new Date(),
        bankRef: options?.bankRef ?? null,
        notes: options?.notes ?? payout.notes,
        updatedAt: new Date(),
      },
      include: { vendor: { select: { companyName: true, id: true } } },
    })

    await AuditService.log({
      action: 'vendor.payout.paid',
      userId: adminUserId,
      resourceType: 'vendorPayout',
      resourceId: payoutId,
      metadata: {
        vendorId: payout.vendorId,
        netAmount: toNumber(payout.netAmount),
        bankRef: options?.bankRef,
      },
    })

    return updated
  }

  /**
   * Get payout summary for a vendor
   */
  static async getPayoutSummary(vendorId: string, requestUserId: string) {
    const vendor = await prisma.vendor.findFirst({
      where: { id: vendorId, deletedAt: null },
    })
    if (!vendor) throw new NotFoundError('Vendor', vendorId)

    const isAdmin = await hasPermission(requestUserId, 'vendor.read' as never)
    const isOwnVendor = vendor.userId === requestUserId
    if (!isAdmin && !isOwnVendor) {
      throw new ForbiddenError('You do not have permission to view this payout summary')
    }

    const [pending, paid] = await Promise.all([
      prisma.vendorPayout.aggregate({
        where: { vendorId, status: PayoutStatus.PENDING },
        _sum: { netAmount: true },
        _count: true,
      }),
      prisma.vendorPayout.aggregate({
        where: { vendorId, status: PayoutStatus.PAID },
        _sum: { netAmount: true },
        _count: true,
      }),
    ])

    return {
      pendingAmount: toNumber(pending._sum.netAmount),
      pendingCount: pending._count,
      paidAmount: toNumber(paid._sum.netAmount),
      paidCount: paid._count,
    }
  }

  /**
   * Get all payouts (admin only) for vendor payouts management page
   */
  static async getAllPayouts(filters: PayoutFilters = {}, adminUserId: string) {
    const canManage = await hasPermission(adminUserId, 'vendor.manage_payouts' as never)
    if (!canManage) {
      throw new ForbiddenError('You do not have permission to view payouts')
    }

    const { vendorId, status, startDate, endDate, skip = 0, take = 50 } = filters

    const where: Record<string, unknown> = {}
    if (vendorId) where.vendorId = vendorId
    if (status) where.status = status
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) (where.createdAt as Record<string, Date>).gte = startDate
      if (endDate) (where.createdAt as Record<string, Date>).lte = endDate
    }

    const [items, total] = await Promise.all([
      prisma.vendorPayout.findMany({
        where,
        include: { vendor: { select: { id: true, companyName: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take,
      }),
      prisma.vendorPayout.count({ where }),
    ])

    return { items, total, skip, take }
  }
}
