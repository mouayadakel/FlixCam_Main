import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { prisma } from '@/lib/db/prisma'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    const userId = session?.user?.id
    if (!userId || !(await hasPermission(userId, PERMISSIONS.MARKETING_READ))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch marketing events and filter in memory for simplicity/types
    const events = await prisma.marketingEvent.findMany({
      select: {
        eventType: true,
        value: true,
        metadata: true,
        createdAt: true,
      }
    })

    const campaignStats: Record<string, {
      name: string
      views: number
      leads: number
      purchases: number
      revenue: number
      lastActive: Date
    }> = {}

    events.forEach(ev => {
      const meta = ev.metadata as any
      const campaign = meta?.utm_campaign
      if (!campaign) return

      if (!campaignStats[campaign]) {
        campaignStats[campaign] = {
          name: campaign,
          views: 0,
          leads: 0,
          purchases: 0,
          revenue: 0,
          lastActive: ev.createdAt
        }
      }

      const stats = campaignStats[campaign]
      if (ev.createdAt > stats.lastActive) stats.lastActive = ev.createdAt

      if (ev.eventType === 'PageView' || ev.eventType === 'ViewContent') stats.views++
      if (ev.eventType === 'Lead') stats.leads++
      if (ev.eventType === 'Purchase') {
        stats.purchases++
        stats.revenue += ev.value || 0
      }
    })

    // Fetch Actual Campaign Blasts (from Campaign table)
    const blasts = await prisma.campaign.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take: 20
    })

    return NextResponse.json({
      campaigns: Object.values(campaignStats).sort((a,b) => b.revenue - a.revenue),
      blasts: blasts.map(b => ({
        id: b.id,
        name: b.name,
        type: b.type.toLowerCase(),
        status: b.status.toLowerCase(),
        sentAt: b.sentAt,
        totalRecipients: b.totalRecipients || 0,
        createdAt: b.createdAt
      }))
    })
  } catch (err) {
    console.error('Campaign API Error:', err)
    return NextResponse.json({ campaigns: [] })
  }
}
