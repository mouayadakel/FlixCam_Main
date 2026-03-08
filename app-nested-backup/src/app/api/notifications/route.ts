/**
 * @file route.ts
 * @description GET endpoint for user notifications
 * @module api/notifications
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: {
          userId: session.user.id,
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      prisma.notification.count({
        where: {
          userId: session.user.id,
          read: false,
          deletedAt: null,
        },
      }),
    ])

    return NextResponse.json({ notifications, unreadCount })
  } catch (error) {
    logger.error('Failed to fetch notifications', { error })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
