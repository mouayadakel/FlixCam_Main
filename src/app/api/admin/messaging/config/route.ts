/**
 * GET – list messaging channel configs (EMAIL, SMS, WHATSAPP)
 * PATCH – update isEnabled or config for a channel
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'
import { NotificationChannel } from '@prisma/client'
import { handleApiError } from '@/lib/utils/api-helpers'

const CHANNELS: NotificationChannel[] = [
  NotificationChannel.EMAIL,
  NotificationChannel.SMS,
  NotificationChannel.WHATSAPP,
]

async function requireAuth() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const canRead = await hasPermission(session.user.id, PERMISSIONS.SETTINGS_READ)
  if (!canRead) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }
  return session
}

export async function GET() {
  try {
    const session = await requireAuth()
    if (session instanceof NextResponse) return session

    const configs = await prisma.messagingChannelConfig.findMany({
      where: { channel: { in: CHANNELS } },
    })

    const byChannel = Object.fromEntries(
      configs.map((c) => [
        c.channel,
        {
          id: c.id,
          channel: c.channel,
          isEnabled: c.isEnabled,
          businessPhone: c.businessPhone ?? null,
          config: c.config ?? null,
        },
      ])
    )

    const list = CHANNELS.map((channel) => ({
      channel,
      id: byChannel[channel]?.id ?? null,
      isEnabled: byChannel[channel]?.isEnabled ?? false,
      businessPhone: byChannel[channel]?.businessPhone ?? null,
      config: byChannel[channel]?.config ?? null,
    }))

    return NextResponse.json({ configs: list })
  } catch (error) {
    return handleApiError(error)
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const canUpdate = await hasPermission(session.user.id, PERMISSIONS.SETTINGS_UPDATE)
    if (!canUpdate) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const channel = body.channel as NotificationChannel
    if (!CHANNELS.includes(channel)) {
      return NextResponse.json({ error: 'Invalid channel' }, { status: 400 })
    }

    const update: { isEnabled?: boolean; config?: object; businessPhone?: string } = {}
    if (typeof body.isEnabled === 'boolean') update.isEnabled = body.isEnabled
    if (body.config !== undefined) update.config = body.config as object
    if (body.businessPhone !== undefined) update.businessPhone = body.businessPhone ?? null

    const existing = await prisma.messagingChannelConfig.findUnique({
      where: { channel },
    })

    let config
    if (existing) {
      config = await prisma.messagingChannelConfig.update({
        where: { channel },
        data: update,
      })
    } else {
      config = await prisma.messagingChannelConfig.create({
        data: {
          channel,
          isEnabled: update.isEnabled ?? false,
          config: update.config ?? undefined,
          businessPhone: update.businessPhone ?? undefined,
        },
      })
    }

    return NextResponse.json({
      config: {
        id: config.id,
        channel: config.channel,
        isEnabled: config.isEnabled,
        businessPhone: config.businessPhone ?? null,
        config: config.config ?? null,
      },
    })
  } catch (error) {
    return handleApiError(error)
  }
}
