/**
 * @file route.ts
 * @description Server-Sent Events stream for admin live updates (bookings, payments, etc.)
 * @module app/api/admin/live/stream
 */

import { auth } from '@/lib/auth'
import { getRedisClient } from '@/lib/queue/redis.client'
import { ADMIN_LIVE_CHANNEL } from '@/lib/live-admin'

export const dynamic = 'force-dynamic'

const HEARTBEAT_INTERVAL_MS = 15_000

function formatSSE(data: object): string {
  return `data: ${JSON.stringify(data)}\n\n`
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 })
  }

  let heartbeatTimer: ReturnType<typeof setInterval> | null = null
  let subscriber: ReturnType<typeof getRedisClient> | null = null

  const stream = new ReadableStream({
    start(controller) {
      const cleanup = () => {
        if (heartbeatTimer) {
          clearInterval(heartbeatTimer)
          heartbeatTimer = null
        }
        if (subscriber) {
          subscriber
            .unsubscribe(ADMIN_LIVE_CHANNEL)
            .catch((err) => console.error('[live-stream] unsubscribe failed', err))
          subscriber.quit().catch((err) => console.error('[live-stream] quit failed', err))
          subscriber = null
        }
      }

      const send = (data: object) => {
        try {
          controller.enqueue(new TextEncoder().encode(formatSSE(data)))
        } catch {
          cleanup()
        }
      }

      // Heartbeat so client and proxies keep the connection open
      heartbeatTimer = setInterval(() => {
        send({ type: 'heartbeat', t: Date.now() })
      }, HEARTBEAT_INTERVAL_MS)

      if (!process.env.REDIS_URL) {
        send({ type: 'heartbeat', t: Date.now(), noRedis: true })
        return
      }

      try {
        subscriber = getRedisClient().duplicate()
        subscriber.subscribe(ADMIN_LIVE_CHANNEL, (err) => {
          if (err) {
            send({ type: 'error', message: 'Subscribe failed' })
            return
          }
          send({ type: 'connected', t: Date.now() })
        })
        subscriber.on('message', (_ch: string, message: string) => {
          try {
            const parsed = JSON.parse(message) as { event?: string; payload?: unknown; t?: number }
            send({ type: 'event', ...parsed })
          } catch {
            send({ type: 'event', raw: message })
          }
        })
      } catch {
        send({ type: 'error', message: 'Redis unavailable' })
      }
    },
    cancel() {
      if (heartbeatTimer) {
        clearInterval(heartbeatTimer)
        heartbeatTimer = null
      }
      if (subscriber) {
        subscriber
          .unsubscribe(ADMIN_LIVE_CHANNEL)
          .catch((err) => console.error('[live-stream] unsubscribe failed', err))
        subscriber.quit().catch((err) => console.error('[live-stream] quit failed', err))
        subscriber = null
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
