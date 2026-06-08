/**
 * Lightweight server-side marketing event log (for admin analytics).
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { z } from 'zod'
import { EventBus } from '@/lib/events/event-bus'

const bodySchema = z.object({
  eventType: z.string().min(1).max(64),
  pageUrl: z.string().max(2048).optional(),
  entityType: z.string().max(32).optional(),
  entityId: z.string().max(64).optional(),
  value: z.number().optional(),
  currency: z.string().max(8).optional(),
  source: z.string().max(32).optional(),
  sessionId: z.string().max(64).optional(),
  metadata: z.record(z.any()).optional(),
})

const ipBuckets = new Map<string, number[]>()
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 120

function rateLimit(ip: string): boolean {
  const now = Date.now()
  const prev = ipBuckets.get(ip) ?? []
  const recent = prev.filter((t) => now - t < WINDOW_MS)
  if (recent.length >= MAX_PER_WINDOW) return false
  recent.push(now)
  ipBuckets.set(ip, recent)
  return true
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'
    if (!rateLimit(ip)) {
      return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
    }
    const json = await request.json()
    const parsed = bodySchema.safeParse(json)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
    }
    const b = parsed.data
    try {
      await prisma.marketingEvent.create({
        data: {
          eventType: b.eventType,
          pageUrl: b.pageUrl,
          entityType: b.entityType,
          entityId: b.entityId,
          value: b.value,
          currency: b.currency ?? 'SAR',
          source: b.source,
          sessionId: b.sessionId,
          metadata: b.metadata as any,
        },
      })
      
      // Emit to EventBus for Automation Hub
      await EventBus.emit('marketing.event.created', {
        eventType: b.eventType,
        sessionId: b.sessionId || 'unknown',
        metadata: b.metadata,
        timestamp: new Date()
      })
    } catch (err) {
      console.error('[Marketing API] Emit failed:', err)
    }
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Bad request' }, { status: 400 })
  }
}
