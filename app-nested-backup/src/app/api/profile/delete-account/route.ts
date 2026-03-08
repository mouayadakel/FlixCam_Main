/**
 * @file route.ts
 * @description POST /api/profile/delete-account - GDPR account deletion
 * @module app/api/profile/delete-account
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { randomUUID } from 'crypto'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { AuditService } from '@/lib/services/audit.service'
import { BookingStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

const deleteSchema = z.object({
  confirmation: z.literal('DELETE', {
    errorMap: () => ({ message: 'Confirmation must be exactly "DELETE"' }),
  }),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    const body = await request.json()
    const parseResult = deleteSchema.safeParse(body)

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error.errors[0]?.message ?? 'Invalid confirmation' },
        { status: 400 }
      )
    }

    const user = await prisma.user.findUnique({
      where: { id: userId, deletedAt: null },
      select: { id: true },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    await prisma.$transaction(async (tx) => {
      const futureBookings = await tx.booking.findMany({
        where: {
          customerId: userId,
          deletedAt: null,
          status: { in: [BookingStatus.CONFIRMED, BookingStatus.PAYMENT_PENDING] },
          startDate: { gt: new Date() },
        },
        select: { id: true },
      })

      for (const b of futureBookings) {
        await tx.booking.update({
          where: { id: b.id },
          data: {
            status: BookingStatus.CANCELLED,
            cancelledAt: new Date(),
            cancellationReason: 'Account deletion requested',
            updatedBy: userId,
          },
        })
      }

      const anonymizedEmail = `deleted-${randomUUID()}@deleted.com`

      await tx.user.update({
        where: { id: userId },
        data: {
          name: 'Deleted User',
          email: anonymizedEmail,
          phone: null,
          deletedAt: new Date(),
          deletedBy: userId,
          updatedBy: userId,
        },
      })
    })

    await AuditService.log({
      action: 'user.account_deleted',
      userId,
      resourceType: 'user',
      resourceId: userId,
      ipAddress: request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? undefined,
      userAgent: request.headers.get('user-agent') ?? undefined,
      metadata: {
        futureBookingsCancelled: true,
        piiAnonymized: true,
      },
    })

    return NextResponse.json({
      success: true,
      message: 'Account scheduled for deletion',
    })
  } catch (error) {
    logger.error('Account deletion error', { error })
    return NextResponse.json(
      { error: 'Failed to delete account' },
      { status: 500 }
    )
  }
}
