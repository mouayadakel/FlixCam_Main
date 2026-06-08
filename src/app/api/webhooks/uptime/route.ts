/**
 * POST /api/webhooks/uptime — External uptime monitor callbacks (UptimeRobot, Better Stack, etc.)
 * Header: x-uptime-secret or Authorization: Bearer <UPTIME_WEBHOOK_SECRET>
 */

import { NextRequest, NextResponse } from 'next/server'
import { timingSafeEqual } from 'crypto'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { enqueueNotification } from '@/lib/services/notification-queue.service'

export const dynamic = 'force-dynamic'

function verifyUptimeSecret(request: NextRequest): boolean {
  const secret = process.env.UPTIME_WEBHOOK_SECRET?.trim()
  if (!secret) return false

  const candidates: string[] = []
  const header = request.headers.get('x-uptime-secret')
  if (header) candidates.push(header.trim())
  const auth = request.headers.get('authorization') ?? ''
  if (auth.startsWith('Bearer ')) candidates.push(auth.slice(7).trim())

  const secretBuf = Buffer.from(secret, 'utf8')
  return candidates.some((c) => {
    const buf = Buffer.from(c, 'utf8')
    return buf.length === secretBuf.length && timingSafeEqual(buf, secretBuf)
  })
}

export async function POST(request: NextRequest) {
  if (!verifyUptimeSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Record<string, unknown> = {}
  try {
    body = (await request.json()) as Record<string, unknown>
  } catch {
    body = {}
  }

  const status = String(body.alert_type ?? body.status ?? body.monitor_status ?? 'unknown')
  const isDown =
    /down|offline|fail|critical/i.test(status) ||
    body.alert_type === 'down' ||
    body.status === 'down'

  await prisma.auditLog.create({
    data: {
      action: isDown ? 'uptime.alert.down' : 'uptime.alert.up',
      resourceType: 'UptimeMonitor',
      resourceId: String(body.monitor_id ?? body.id ?? 'external'),
      metadata: body as object,
    },
  })

  if (isDown) {
    logger.error('External uptime monitor: site DOWN', { body })

    const admins = await prisma.user.findMany({
      where: { role: 'ADMIN', deletedAt: null },
      select: { email: true, id: true },
    })

    for (const admin of admins) {
      if (!admin.email) continue
      enqueueNotification({
        channel: 'email',
        recipient: admin.email,
        subject: 'FlixCam DOWN — uptime monitor alert',
        body: `Uptime monitor reported downtime.\n\nPayload: ${JSON.stringify(body, null, 2)}`,
        priority: 'high',
        recipientUserId: admin.id,
      })
    }
  }

  return NextResponse.json({ received: true, isDown })
}

/** UptimeRobot / Better Stack heartbeat GET */
export async function GET(request: NextRequest) {
  if (!verifyUptimeSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.json({ status: 'ok', service: 'flixcam-rent' })
}
