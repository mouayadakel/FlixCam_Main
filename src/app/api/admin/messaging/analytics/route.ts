/**
 * GET – aggregated message stats for messaging center dashboard
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'
import { MessageLogStatus, NotificationChannel } from '@prisma/client'
import { handleApiError } from '@/lib/utils/api-helpers'
import { startOfDay, startOfWeek, startOfMonth, subDays } from 'date-fns'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const canRead = await hasPermission(session.user.id, PERMISSIONS.SETTINGS_READ)
    if (!canRead) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const now = new Date()
    const todayStart = startOfDay(now)
    const weekStart = startOfWeek(now)
    const monthStart = startOfMonth(now)

    const [todayCount, weekCount, monthCount, byChannel, byStatus] = await Promise.all([
      prisma.messageLog.count({ where: { createdAt: { gte: todayStart } } }),
      prisma.messageLog.count({ where: { createdAt: { gte: weekStart } } }),
      prisma.messageLog.count({ where: { createdAt: { gte: monthStart } } }),
      prisma.messageLog.groupBy({
        by: ['channel'],
        where: { createdAt: { gte: subDays(now, 30) } },
        _count: { id: true },
      }),
      prisma.messageLog.groupBy({
        by: ['status'],
        where: { createdAt: { gte: subDays(now, 30) } },
        _count: { id: true },
      }),
    ])

    const totalSent = byStatus
      .filter((s) => [MessageLogStatus.SENT, MessageLogStatus.DELIVERED, MessageLogStatus.READ].includes(s.status as 'SENT' | 'DELIVERED' | 'READ'))
      .reduce((sum, s) => sum + s._count.id, 0)
    const totalFailed = byStatus.filter((s) => s.status === MessageLogStatus.FAILED).reduce((sum, s) => sum + s._count.id, 0)
    const total = byStatus.reduce((sum, s) => sum + s._count.id, 0)
    const deliveryRate = total > 0 ? Math.round((totalSent / total) * 100) : 100
    const failureRate = total > 0 ? Math.round((totalFailed / total) * 100) : 0

    const channelStats = Object.values(NotificationChannel)
      .filter((c) => c !== 'IN_APP')
      .map((channel) => {
        const row = byChannel.find((x) => x.channel === channel)
        return { channel, count: row?._count.id ?? 0 }
      })

    return NextResponse.json({
      todayCount,
      weekCount,
      monthCount,
      deliveryRate,
      failureRate,
      totalLast30: total,
      channelStats,
    })
  } catch (error) {
    return handleApiError(error)
  }
}
