/**
 * GET /api/admin/support/conversations — list chat sessions (FIX-039)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'
import { handleApiError } from '@/lib/utils/api-helpers'
import { ForbiddenError, UnauthorizedError } from '@/lib/errors'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) throw new UnauthorizedError()
    if (!(await hasPermission(session.user.id, PERMISSIONS.SETTINGS_READ))) {
      throw new ForbiddenError()
    }

    const channel = request.nextUrl.searchParams.get('channel') ?? undefined
    const take = Math.min(Number(request.nextUrl.searchParams.get('take') ?? 50), 200)

    const conversations = await prisma.chatConversation.findMany({
      where: channel ? { channel } : undefined,
      orderBy: { updatedAt: 'desc' },
      take,
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    })

    return NextResponse.json({
      data: conversations.map((c) => ({
        id: c.id,
        sessionId: c.sessionId,
        channel: c.channel,
        userId: c.userId,
        handoverAt: c.handoverAt,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
        lastMessage: c.messages[0] ?? null,
      })),
    })
  } catch (error) {
    return handleApiError(error)
  }
}
