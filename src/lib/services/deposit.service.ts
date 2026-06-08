/**
 * @file deposit.service.ts
 * @description Deposit lifecycle – hold, collect, release, and forfeit security deposits.
 */

import { ClaimStatus, DepositStatus } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import { prisma } from '@/lib/db/prisma'
import { AuditService } from './audit.service'
import { EventBus } from '@/lib/events/event-bus'
import { NotFoundError, ValidationError } from '@/lib/errors'

const OPEN_CLAIM_STATUSES: ClaimStatus[] = [
  ClaimStatus.PENDING,
  ClaimStatus.INVESTIGATING,
  ClaimStatus.APPROVED,
  ClaimStatus.DISPUTED,
]

export class DepositService {
  static async ensureForBooking(bookingId: string, amount: number): Promise<void> {
    if (!amount || amount <= 0) return

    await prisma.deposit.upsert({
      where: { bookingId },
      create: {
        bookingId,
        amount: new Decimal(amount),
        status: DepositStatus.PENDING,
      },
      update: {},
    })
  }

  static async markCollected(
    bookingId: string,
    collectedRef?: string,
    userId = 'system'
  ): Promise<void> {
    const deposit = await prisma.deposit.findUnique({ where: { bookingId } })
    if (!deposit || deposit.status !== DepositStatus.PENDING) return

    await prisma.deposit.update({
      where: { bookingId },
      data: {
        status: DepositStatus.COLLECTED,
        collectedAt: new Date(),
        collectedRef: collectedRef ?? undefined,
      },
    })

    await AuditService.log({
      action: 'deposit.collected',
      userId,
      resourceType: 'deposit',
      resourceId: deposit.id,
      metadata: { bookingId, collectedRef },
    })
  }

  static async hasOpenDamageClaims(bookingId: string): Promise<boolean> {
    const count = await prisma.damageClaim.count({
      where: {
        bookingId,
        status: { in: OPEN_CLAIM_STATUSES },
      },
    })
    return count > 0
  }

  static async releaseDeposit(
    bookingId: string,
    userId: string,
    returnedRef?: string,
    auditContext?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    const deposit = await prisma.deposit.findUnique({ where: { bookingId } })
    if (!deposit) {
      throw new NotFoundError('Deposit', bookingId)
    }

    if (deposit.status === DepositStatus.RETURNED) {
      return
    }

    if (
      deposit.status !== DepositStatus.COLLECTED &&
      deposit.status !== DepositStatus.PARTIALLY_RETURNED
    ) {
      throw new ValidationError(`Cannot release deposit in status ${deposit.status}`)
    }

    if (await this.hasOpenDamageClaims(bookingId)) {
      throw new ValidationError('Cannot release deposit while damage claims are open')
    }

    await prisma.deposit.update({
      where: { bookingId },
      data: {
        status: DepositStatus.RETURNED,
        returnedAt: new Date(),
        returnedRef: returnedRef ?? undefined,
      },
    })

    await AuditService.log({
      action: 'deposit.released',
      userId,
      resourceType: 'deposit',
      resourceId: deposit.id,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
      metadata: { bookingId, returnedRef },
    })

    await EventBus.emit('deposit.released', {
      bookingId,
      depositId: deposit.id,
      userId,
      timestamp: new Date(),
    })
  }

  static async forfeitDeposit(
    bookingId: string,
    reason: string,
    userId: string,
    auditContext?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    const deposit = await prisma.deposit.findUnique({ where: { bookingId } })
    if (!deposit) {
      throw new NotFoundError('Deposit', bookingId)
    }

    if (deposit.status === DepositStatus.FORFEITED) {
      return
    }

    if (
      deposit.status !== DepositStatus.COLLECTED &&
      deposit.status !== DepositStatus.PARTIALLY_RETURNED
    ) {
      throw new ValidationError(`Cannot forfeit deposit in status ${deposit.status}`)
    }

    await prisma.deposit.update({
      where: { bookingId },
      data: {
        status: DepositStatus.FORFEITED,
        deductionAmt: deposit.amount,
        deductionNote: reason,
      },
    })

    await AuditService.log({
      action: 'deposit.forfeited',
      userId,
      resourceType: 'deposit',
      resourceId: deposit.id,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
      metadata: { bookingId, reason },
    })

    await EventBus.emit('deposit.forfeited', {
      bookingId,
      depositId: deposit.id,
      userId,
      reason,
      timestamp: new Date(),
    })
  }

  static async partialForfeiture(
    bookingId: string,
    deductAmount: number,
    damageClaimId: string,
    userId: string,
    auditContext?: { ipAddress?: string; userAgent?: string }
  ): Promise<void> {
    if (deductAmount <= 0) {
      throw new ValidationError('Deduction amount must be positive')
    }

    const deposit = await prisma.deposit.findUnique({ where: { bookingId } })
    if (!deposit) {
      throw new NotFoundError('Deposit', bookingId)
    }

    const held = Number(deposit.amount)
    if (deductAmount >= held) {
      await this.forfeitDeposit(
        bookingId,
        `Full forfeiture linked to damage claim ${damageClaimId}`,
        userId,
        auditContext
      )
      return
    }

    if (
      deposit.status !== DepositStatus.COLLECTED &&
      deposit.status !== DepositStatus.PARTIALLY_RETURNED
    ) {
      throw new ValidationError(`Cannot apply partial forfeiture in status ${deposit.status}`)
    }

    await prisma.deposit.update({
      where: { bookingId },
      data: {
        status: DepositStatus.PARTIALLY_RETURNED,
        deductionAmt: new Decimal(deductAmount),
        deductionNote: `Partial deduction for damage claim ${damageClaimId}`,
        returnedAt: new Date(),
      },
    })

    await AuditService.log({
      action: 'deposit.partial_forfeiture',
      userId,
      resourceType: 'deposit',
      resourceId: deposit.id,
      ipAddress: auditContext?.ipAddress,
      userAgent: auditContext?.userAgent,
      metadata: { bookingId, deductAmount, damageClaimId },
    })
  }

  /**
   * Auto-release deposit when equipment is returned with no open damage claims.
   */
  static async tryAutoReleaseOnReturn(bookingId: string, userId: string): Promise<void> {
    const deposit = await prisma.deposit.findUnique({ where: { bookingId } })
    if (!deposit) return
    if (
      deposit.status !== DepositStatus.COLLECTED &&
      deposit.status !== DepositStatus.PARTIALLY_RETURNED
    ) {
      return
    }
    if (await this.hasOpenDamageClaims(bookingId)) return

    await this.releaseDeposit(bookingId, userId, 'auto-return')
  }
}
