/**
 * @file route.ts
 * @description GET endpoint for user notifications
 * @module api/notifications
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db/prisma'
import { ORDER_ALERT_NOTIFICATION_TYPES } from '@/lib/constants/order-alerts'
import { logger } from '@/lib/logger'

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const countOnly = searchParams.get('countOnly') === 'true'
    const scope = searchParams.get('scope')

    const where = {
      userId: session.user.id,
      deletedAt: null,
      ...(scope === 'orders'
        ? {
            type: {
              in: [...ORDER_ALERT_NOTIFICATION_TYPES],
            },
          }
        : {}),
    }

    const unreadCount = await prisma.notification.count({
      where: {
        ...where,
        read: false,
      },
    })

    if (countOnly) {
      return NextResponse.json({ unreadCount })
    }

    const notifications = await prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    return NextResponse.json({ notifications, unreadCount })
  } catch (error) {
    logger.error('Failed to fetch notifications', { error })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
