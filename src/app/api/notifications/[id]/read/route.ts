/**
 * @file route.ts
 * @description Mark a single notification as read
 * @module app/api/notifications/[id]/read
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { NotificationService } from '@/lib/services/notification.service'
import { handleApiError } from '@/lib/utils/api-helpers'
import { UnauthorizedError } from '@/lib/errors'

interface RouteParams {
  params: Promise<{ id: string }>
}

/**
 * PATCH /api/notifications/[id]/read
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth()
    if (!session?.user?.id) throw new UnauthorizedError()

    const { id } = await params
    if (!id) {
      return NextResponse.json({ error: 'Notification ID required' }, { status: 400 })
    }

    await NotificationService.markAsRead(id, session.user.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    return handleApiError(error)
  }
}
