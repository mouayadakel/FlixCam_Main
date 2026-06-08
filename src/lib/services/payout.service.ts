/**
 * @file payout.service.ts
 * @description Vendor payouts — locked invoice line totals + proportional refunds; ledger DEBIT on create.
 * @module lib/services
 */

import { LineItemType, PayoutStatus } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import { prisma } from '@/lib/db/prisma'
import { hasPermission } from '@/lib/auth/permissions'
import { AuditService } from './audit.service'
import { NotFoundError, ForbiddenError } from '@/lib/errors'

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

export interface VendorPayoutBreakdown {
  grossAmount: Decimal
  refundDeduction: Decimal
  netPool: Decimal
}

const REVENUE_LINE_TYPES: LineItemType[] = ['EQUIPMENT', 'STUDIO', 'PACKAGE']

function toNumber(d: Decimal | null | undefined): number {
  if (d == null) return 0
  return typeof d === 'object' && 'toNumber' in d ? (d as Decimal).toNumber() : Number(d)
}

export class PayoutService {
  /**
   * Revenue subtotal from locked invoice lines (pre-VAT line totals), minus proportional refunds.
   */
  static calculateNetPoolFromInvoice(invoice: {
    totalAmount: Decimal
    refundedAmount: Decimal | null
    lineItems: { type: LineItemType; lineTotal: Decimal }[]
  }): VendorPayoutBreakdown {
    const revenueLines = invoice.lineItems.filter((l) => REVENUE_LINE_TYPES.includes(l.type))
    const grossAmount = revenueLines.reduce(
      (sum, l) => sum.plus(new Decimal(l.lineTotal.toString())),
      new Decimal(0)
    )
    const totalInv = new Decimal(invoice.totalAmount.toString())
    const refunded = invoice.refundedAmount ? new Decimal(invoice.refundedAmount.toString()) : new Decimal(0)
    const refundDeduction =
      refunded.gt(0) && totalInv.gt(0)
        ? refunded.times(grossAmount).dividedBy(totalInv).toDecimalPlaces(2)
        : new Decimal(0)
    const netPool = grossAmount.minus(refundDeduction)
    return { grossAmount, refundDeduction, netPool }
  }

  /**
   * Create vendor payouts when a booking is payable. Uses invoice line totals when an invoice exists;
   * otherwise falls back to equipment daily rates for vendor weighting only.
   */
  static async createVendorPayoutsForBooking(bookingId: string, createdBy?: string): Promise<void> {
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, deletedAt: null },
      include: {
        equipment: {
          where: { deletedAt: null },
          include: {
            equipment: {
              select: { id: true, vendorId: true, dailyPrice: true },
            },
          },
        },
        invoices: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
          take: 1,
          include: { lineItems: true },
        },
      },
    })

    if (!booking) return

    const days =
      Math.ceil(
        (new Date(booking.endDate).getTime() - new Date(booking.startDate).getTime()) /
          (1000 * 60 * 60 * 24)
      ) || 1

    const vendorWeights = new Map<string, Decimal>()
    for (const be of booking.equipment) {
      const eq = be.equipment
      if (!eq.vendorId) continue
      const daily = new Decimal(eq.dailyPrice?.toString() ?? '0')
      const w = daily.times(be.quantity).times(days)
      vendorWeights.set(eq.vendorId, (vendorWeights.get(eq.vendorId) ?? new Decimal(0)).plus(w))
    }

    const invoice = booking.invoices[0]
    let netPool: Decimal

    if (invoice?.lineItems?.length) {
      const { netPool: np } = this.calculateNetPoolFromInvoice(invoice)
      netPool = np
    } else {
      netPool = [...vendorWeights.values()].reduce((s, w) => s.plus(w), new Decimal(0))
    }

    const sumW = [...vendorWeights.values()].reduce((s, w) => s.plus(w), new Decimal(0))
    if (sumW.lte(0) || netPool.lte(0)) return

    for (const [vendorId, weight] of vendorWeights) {
      const vendorGross = netPool.times(weight).dividedBy(sumW).toDecimalPlaces(2)
      if (vendorGross.lte(0)) continue

      const existing = await prisma.vendorPayout.findFirst({
        where: { vendorId, bookingId },
      })
      if (existing) continue

      await this.createPayout(
        {
          vendorId,
          bookingId,
          grossAmount: vendorGross.toNumber(),
          periodStart: booking.startDate,
          periodEnd: booking.endDate,
        },
        createdBy
      )
    }
  }

  /**
   * Creates VendorPayout + ledger DEBIT (VENDOR_PAYOUT) in one transaction.
   */
  static async createPayout(input: CreatePayoutInput, createdBy?: string) {
    return prisma.$transaction(async (tx) => {
      const vendor = await tx.vendor.findFirst({
        where: { id: input.vendorId, deletedAt: null },
      })
      if (!vendor) throw new NotFoundError('Vendor', input.vendorId)

      const platformRatePct = toNumber(vendor.commissionRate)
      const platformRate = new Decimal(platformRatePct).dividedBy(100)
      const grossDec = new Decimal(input.grossAmount).toDecimalPlaces(2)
      const commissionAmount = grossDec.times(platformRate).toDecimalPlaces(2)
      const netAmount = grossDec.minus(commissionAmount).toDecimalPlaces(2)

      const payout = await tx.vendorPayout.create({
        data: {
          vendorId: input.vendorId,
          bookingId: input.bookingId ?? null,
          periodStart: input.periodStart ?? null,
          periodEnd: input.periodEnd ?? null,
          grossAmount: grossDec,
          commissionAmount,
          netAmount,
          status: PayoutStatus.PENDING,
          createdBy: createdBy ?? null,
        },
        include: { vendor: { select: { companyName: true } } },
      })

      await tx.ledgerEntry.create({
        data: {
          type: 'DEBIT',
          amount: netAmount,
          account: 'VENDOR_PAYOUT',
          bookingId: input.bookingId ?? null,
          payoutId: payout.id,
          description: `Vendor payout (${vendor.companyName}) booking ${input.bookingId ?? 'N/A'}`,
          reference: payout.id,
        },
      })

      return payout
    })
  }

  /** @deprecated Use createPayout breakdown from invoice; kept name for admin tooling. */
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

    const [pendingSum, pendingCnt, paidSum, paidCnt] = await Promise.all([
      prisma.vendorPayout.aggregate({
        where: { vendorId, status: PayoutStatus.PENDING },
        _sum: { netAmount: true },
      }),
      prisma.vendorPayout.count({ where: { vendorId, status: PayoutStatus.PENDING } }),
      prisma.vendorPayout.aggregate({
        where: { vendorId, status: PayoutStatus.PAID },
        _sum: { netAmount: true },
      }),
      prisma.vendorPayout.count({ where: { vendorId, status: PayoutStatus.PAID } }),
    ])

    return {
      pendingAmount: toNumber(pendingSum._sum.netAmount),
      pendingCount: pendingCnt,
      paidAmount: toNumber(paidSum._sum.netAmount),
      paidCount: paidCnt,
    }
  }

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
