import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { auth } from '@/lib/auth'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()
    if (!session || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const sessionId = searchParams.get('sessionId')

    if (sessionId) {
      // Fetch full timeline for specific session
      const events = await prisma.marketingEvent.findMany({
        where: { sessionId },
        orderBy: { createdAt: 'asc' }
      })
      return NextResponse.json({ events })
    }

    // Fetch latest unique sessions with their conversion status
    const latestEvents = await prisma.marketingEvent.findMany({
      orderBy: { createdAt: 'desc' },
      take: 500,
      select: {
        sessionId: true,
        eventType: true,
        createdAt: true,
        source: true,
        metadata: true
      }
    })

    // Group by sessionId and summarize
    const sessionMap = new Map()
    latestEvents.forEach(e => {
      if (!e.sessionId) return
      if (!sessionMap.has(e.sessionId)) {
        sessionMap.set(e.sessionId, {
          sessionId: e.sessionId,
          start: e.createdAt,
          last: e.createdAt,
          eventCount: 0,
          hasConversion: false,
          source: e.source,
          name: (e.metadata as any)?.name
        })
      }
      const s = sessionMap.get(e.sessionId)
      s.eventCount++
      if (['Purchase', 'Lead', 'Contact'].includes(e.eventType)) {
        s.hasConversion = true
      }
      if (e.createdAt < s.start) s.start = e.createdAt
      if (e.createdAt > s.last) s.last = e.createdAt
      if (!s.name) s.name = (e.metadata as any)?.name
    })

    return NextResponse.json(Array.from(sessionMap.values()))
  } catch (error: any) {
    console.error('Journeys GET failed:', error)
    return NextResponse.json({ error: 'Failed to fetch journeys' }, { status: 500 })
  }
}
