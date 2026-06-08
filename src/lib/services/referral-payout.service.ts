/**
 * @file referral-payout.service.ts
 * @description Referral commissions from marketing Purchase events; idempotent via event metadata + period dedup.
 * @module lib/services
 */

import { prisma } from '@/lib/db/prisma'
import { Prisma } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'

const PURCHASE_EVENT = 'Purchase'
const METADATA_REFERRAL_CODE_PATH = 'referralCode' as const
const METADATA_COMMISSION_INCLUDED = 'referralCommissionIncluded' as const

export interface PayoutCalculation {
  referralId: string
  code: string
  name: string
  totalRevenue: number
  commissionRate: number
  commissionAmount: number
  pendingBookings: number
}

function mergeMarketingMetadata(
  current: unknown,
  patch: Record<string, Prisma.JsonValue>
): Prisma.InputJsonObject {
  if (current && typeof current === 'object' && !Array.isArray(current)) {
    return { ...(current as Prisma.JsonObject), ...patch }
  }
  return { ...patch }
}

function isPurchaseEventUnpaidForCommission(metadata: unknown): boolean {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return true
  const m = metadata as Record<string, unknown>
  return m[METADATA_COMMISSION_INCLUDED] !== true
}

export class ReferralPayoutService {
  /**
   * Pending commission base = Purchase events in range with matching referral code, not yet marked in metadata.
   */
  static async calculatePendingCommissions(startDate: Date, endDate: Date): Promise<PayoutCalculation[]> {
    const referrals = await prisma.referral.findMany({
      where: { deletedAt: null },
    })

    const results: PayoutCalculation[] = []

    for (const ref of referrals) {
      const events = await prisma.marketingEvent.findMany({
        where: {
          eventType: PURCHASE_EVENT,
          createdAt: { gte: startDate, lte: endDate },
          metadata: { path: [METADATA_REFERRAL_CODE_PATH], equals: ref.code },
        },
      })

      const unpaid = events.filter((e) => isPurchaseEventUnpaidForCommission(e.metadata))
      const totalRevenue = unpaid.reduce((sum, e) => sum + Number(e.value ?? 0), 0)
      const rate = new Decimal(ref.commissionRate?.toString() ?? '0.05')
      const commissionAmount = new Decimal(totalRevenue).times(rate).toDecimalPlaces(2).toNumber()

      if (commissionAmount > 0) {
        results.push({
          referralId: ref.id,
          code: ref.code,
          name: ref.name ?? ref.code,
          totalRevenue,
          commissionRate: rate.toNumber(),
          commissionAmount,
          pendingBookings: unpaid.length,
        })
      }
    }

    return results
  }

  /**
   * Creates one ReferralPayout per referral per exact period window; marks consumed marketing events so they are never paid twice.
   */
  static async generatePayouts(startDate: Date, endDate: Date) {
    const calculations = await this.calculatePendingCommissions(startDate, endDate)
    const createdPayouts: Awaited<ReturnType<typeof prisma.referralPayout.create>>[] = []

    for (const calc of calculations) {
      await prisma.$transaction(async (tx) => {
        const duplicate = await tx.referralPayout.findFirst({
          where: {
            referralId: calc.referralId,
            periodStart: startDate,
            periodEnd: endDate,
            status: { not: 'CANCELLED' },
          },
        })
        if (duplicate) return

        const events = await tx.marketingEvent.findMany({
          where: {
            eventType: PURCHASE_EVENT,
            createdAt: { gte: startDate, lte: endDate },
            metadata: { path: [METADATA_REFERRAL_CODE_PATH], equals: calc.code },
          },
        })
        const unpaid = events.filter((e) => isPurchaseEventUnpaidForCommission(e.metadata))
        if (unpaid.length === 0) return

        const totalRevenue = unpaid.reduce((sum, e) => sum + Number(e.value ?? 0), 0)
        const referral = await tx.referral.findFirst({
          where: { id: calc.referralId, deletedAt: null },
        })
        if (!referral) return

        const rate = new Decimal(referral.commissionRate?.toString() ?? '0.05')
        const amount = new Decimal(totalRevenue).times(rate).toDecimalPlaces(2)
        if (amount.lte(0)) return

        const payout = await tx.referralPayout.create({
          data: {
            referralId: calc.referralId,
            amount,
            periodStart: startDate,
            periodEnd: endDate,
            status: 'PENDING',
          },
        })

        for (const ev of unpaid) {
          await tx.marketingEvent.update({
            where: { id: ev.id },
            data: {
              metadata: mergeMarketingMetadata(ev.metadata, {
                [METADATA_COMMISSION_INCLUDED]: true,
                referralCommissionPayoutId: payout.id,
                referralCommissionPeriodStart: startDate.toISOString(),
                referralCommissionPeriodEnd: endDate.toISOString(),
              }),
            },
          })
        }

        createdPayouts.push(payout)
      })
    }

    return createdPayouts
  }

  static async markAsPaid(payoutId: string, transactionId: string) {
    return prisma.referralPayout.update({
      where: { id: payoutId },
      data: {
        status: 'PAID',
        paidAt: new Date(),
        transactionId,
      },
    })
  }

  static async listPayouts() {
    return prisma.referralPayout.findMany({
      include: { referral: true },
      orderBy: { createdAt: 'desc' },
    })
  }
}
