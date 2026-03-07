'use client'

import { useEffect, useRef } from 'react'

export interface AdminLiveMessage {
  type: 'heartbeat' | 'connected' | 'event' | 'error'
  event?: string
  payload?: unknown
  t?: number
  noRedis?: boolean
  message?: string
}

/**
 * Subscribe to admin live SSE stream. Call onEvent when server pushes booking/payment events so UI can refetch.
 */
export function useAdminLive(onEvent?: (event: string, payload: unknown) => void): void {
  const onEventRef = useRef(onEvent)
  useEffect(() => {
    onEventRef.current = onEvent
  }, [onEvent])

  useEffect(() => {
    if (typeof EventSource === 'undefined') return

    const url = '/api/admin/live/stream'
    const es = new EventSource(url)

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data) as AdminLiveMessage
        if (data.type === 'event' && data.event && onEventRef.current) {
          onEventRef.current(data.event, data.payload)
        }
      } catch {
        // ignore parse errors
      }
    }

    es.onerror = () => {
      // EventSource will reconnect automatically; optional: close and retry with backoff
    }

    return () => {
      es.close()
    }
  }, [])
}
