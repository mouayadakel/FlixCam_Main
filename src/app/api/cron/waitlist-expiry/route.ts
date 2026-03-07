/**
 * @file route.ts
 * @description Cron: Expire NOTIFIED waitlist entries and notify next WAITING entry
 * @module app/api/cron/waitlist-expiry
 */

import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { NotificationChannel } from '@prisma/client'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function verifyCronSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = request.headers.get('authorization')
  return auth === `Bearer ${secret}` || auth === secret
}

/**
 * GET /api/cron/waitlist-expiry
 * Expires NOTIFIED entries past expiresAt, promotes next WAITING for same equipment/dates.
 */
export async function GET(request: NextRequest) {
  try {
    if (!verifyCronSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()

    const expiredEntries = await prisma.waitlistEntry.findMany({
      where: {
        expiresAt: { lt: now },
        status: 'NOTIFIED',
      },
      include: { user: { select: { id: true } } },
    })

    let expired = 0
    let notifiedNext = 0

    for (const entry of expiredEntries) {
      try {
        await prisma.$transaction(async (tx) => {
          await tx.waitlistEntry.update({
            where: { id: entry.id },
            data: { status: 'EXPIRED' },
          })
          expired++

          const nextWaiting = await tx.waitlistEntry.findFirst({
            where: {
              equipmentId: entry.equipmentId,
              desiredStartDate: entry.desiredStartDate,
              desiredEndDate: entry.desiredEndDate,
              status: 'WAITING',
            },
            orderBy: { createdAt: 'asc' },
            include: { user: { select: { id: true } } },
          })

          if (nextWaiting) {
            const userId = nextWaiting.userId ?? undefined
            await tx.waitlistEntry.update({
              where: { id: nextWaiting.id },
              data: {
                status: 'NOTIFIED',
                notifiedAt: now,
              },
            })
            if (userId) {
              await tx.notification.create({
                data: {
                  userId,
                  channel: NotificationChannel.IN_APP,
                  type: 'waitlist.notified',
                  title: 'Equipment Available',
                  message: `Equipment you were waiting for is now available for ${nextWaiting.desiredStartDate.toLocaleDateString()}–${nextWaiting.desiredEndDate.toLocaleDateString()}.`,
                  data: {
                    waitlistEntryId: nextWaiting.id,
                    equipmentId: nextWaiting.equipmentId,
                    desiredStartDate: nextWaiting.desiredStartDate,
                    desiredEndDate: nextWaiting.desiredEndDate,
                  },
                },
              })
            }
            notifiedNext++
          }
        })
      } catch (err) {
        logger.error('waitlist-expiry: failed for entry', {
          entryId: entry.id,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    logger.info('waitlist-expiry: completed', { expired, notifiedNext })
    return NextResponse.json({ expired, notifiedNext })
  } catch (error) {
    logger.error('waitlist-expiry: error', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
