/**
 * @file api/admin/bookings/[id]/deposit/route.ts
 * @description POST endpoint for admin deposit actions (return full, return partial, forfeit)
 * @module api/admin/bookings
 */

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { AuditService } from '@/lib/services/audit.service'
import { logger } from '@/lib/logger'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { Decimal } from '@prisma/client/runtime/library'
import { DepositStatus } from '@prisma/client'

const depositActionSchema = z.object({
  action: z.enum(['return_full', 'return_partial', 'forfeit']),
  deductionAmount: z.number().positive().optional(),
  reason: z.string().min(1, 'Reason is required'),
})

const ALLOWED_ROLES = ['ADMIN', 'ACCOUNTANT'] as const

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userRole = session.user.role as string | undefined
    if (!userRole || !ALLOWED_ROLES.includes(userRole as (typeof ALLOWED_ROLES)[number])) {
      return NextResponse.json(
        { error: 'Forbidden: ADMIN or ACCOUNTANT role required' },
        { status: 403 }
      )
    }

    const { id } = await params

    let body: unknown
    try {
      body = await req.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const parsed = depositActionSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten().fieldErrors },
        { status: 400 }
      )
    }

    const { action, deductionAmount, reason } = parsed.data

    const booking = await prisma.booking.findUnique({
      where: { id, deletedAt: null },
      include: { customer: { select: { id: true, email: true, name: true } } },
    })

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    if (!['RETURNED', 'CLOSED'].includes(booking.status)) {
      return NextResponse.json(
        { error: 'Booking status must be RETURNED or CLOSED to process deposit' },
        { status: 400 }
      )
    }

    if (booking.depositStatus !== 'HELD') {
      return NextResponse.json(
        { error: 'Deposit status must be HELD to process' },
        { status: 400 }
      )
    }

    const depositAmount = booking.depositAmount
      ? Number(booking.depositAmount)
      : 0

    if (action === 'return_partial') {
      if (deductionAmount === undefined) {
        return NextResponse.json(
          { error: 'deductionAmount is required for return_partial action' },
          { status: 400 }
        )
      }
      if (deductionAmount <= 0 || deductionAmount >= depositAmount) {
        return NextResponse.json(
          {
            error:
              'deductionAmount must be greater than 0 and less than depositAmount',
          },
          { status: 400 }
        )
      }
    }

    const userId = session.user.id
    const now = new Date()

    let updateData: Record<string, unknown> = {
      updatedBy: userId,
    }

    switch (action) {
      case 'return_full':
        updateData = {
          ...updateData,
          depositStatus: DepositStatus.RETURNED,
          depositReturnedAt: now,
          depositReturnedBy: userId,
        }
        break
      case 'return_partial':
        updateData = {
          ...updateData,
          depositStatus: DepositStatus.PARTIALLY_RETURNED,
          depositDeductionAmount: new Decimal(deductionAmount!),
          depositDeductionReason: reason,
          depositReturnedAt: now,
          depositReturnedBy: userId,
        }
        break
      case 'forfeit':
        updateData = {
          ...updateData,
          depositStatus: DepositStatus.FORFEITED,
          depositDeductionAmount: booking.depositAmount ?? new Decimal(0),
          depositDeductionReason: reason,
        }
        break
    }

    const updatedBooking = await prisma.booking.update({
      where: { id },
      data: updateData,
      include: { customer: { select: { id: true, email: true, name: true } } },
    })

    await AuditService.log({
      action: 'booking.deposit.update',
      userId,
      resourceType: 'booking',
      resourceId: id,
      metadata: { action, reason },
    })

    return NextResponse.json({
      success: true,
      data: updatedBooking,
    })
  } catch (error) {
    logger.error('Deposit action failed', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}
