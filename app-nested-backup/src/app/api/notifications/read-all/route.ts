/**
 * @file route.ts
 * @description POST endpoint to mark all notifications as read
 * @module app/api/notifications/read-all
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'

/**
 * POST /api/notifications/read-all
 * Marks all unread notifications as read for the authenticated user.
 */
export async function POST() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await prisma.notification.updateMany({
      where: {
        userId: session.user.id,
        read: false,
      },
      data: {
        read: true,
        readAt: new Date(),
      },
    })

    logger.info('Marked all notifications as read', {
      userId: session.user.id,
      count: result.count,
    })

    return NextResponse.json({ success: true, updatedCount: result.count })
  } catch (error) {
    logger.error('Mark all notifications read failed', { error })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
