/**
 * @file route.ts
 * @description In-app notifications API – list, count, mark all as read
 * @module app/api/notifications
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { NotificationService } from '@/lib/services/notification.service'
import { handleApiError } from '@/lib/utils/api-helpers'
import { UnauthorizedError } from '@/lib/errors'

/**
 * GET /api/notifications
 * Query: countOnly, unreadOnly, limit, offset
 * Returns: { notifications?, unreadCount }
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) throw new UnauthorizedError()

    const { searchParams } = new URL(request.url)
    const countOnly = searchParams.get('countOnly') === 'true'
    const unreadOnly = searchParams.get('unreadOnly') === 'true'
    const limit = Math.min(
      Math.max(parseInt(searchParams.get('limit') ?? '50', 10), 1),
      100
    )
    const offset = Math.max(parseInt(searchParams.get('offset') ?? '0', 10), 0)

    const unreadCount = await NotificationService.getUnreadCount(session.user.id)

    if (countOnly) {
      return NextResponse.json({ unreadCount })
    }

    const notifications = await NotificationService.getUserNotifications(
      session.user.id,
      { unreadOnly, limit, offset }
    )

    const shape = notifications.map((n) => ({
      id: n.id,
      channel: n.channel,
      type: n.type,
      title: n.title,
      message: n.message,
      data: n.data ?? null,
      read: n.read,
      readAt: n.readAt?.toISOString() ?? null,
      createdAt: n.createdAt.toISOString(),
    }))

    return NextResponse.json({
      notifications: shape,
      unreadCount,
    })
  } catch (error) {
    return handleApiError(error)
  }
}

/**
 * PATCH /api/notifications
 * Body: { action: 'markAllRead' }
 * Marks all notifications as read for the current user.
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) throw new UnauthorizedError()

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const action = typeof body === 'object' && body !== null && 'action' in body
      ? (body as { action?: string }).action
      : undefined

    if (action === 'markAllRead') {
      await NotificationService.markAllAsRead(session.user.id)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
  } catch (error) {
    return handleApiError(error)
  }
}
