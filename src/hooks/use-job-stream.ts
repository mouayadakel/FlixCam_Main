/**
 * @file use-job-stream.ts
 * @description Hook for SSE-based backfill job progress (replaces setInterval polling)
 * @module hooks
 */

import { useState, useEffect, useRef, useCallback } from 'react'

export interface JobStreamData {
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'PAUSED'
  progress: number
  processed: number
  total: number
  succeeded: number
  failed: number
  costUsd?: number
}

interface UseJobStreamOptions {
  onComplete?: (data: JobStreamData) => void
  onError?: (error: string) => void
}

export function useJobStream(jobId: string | null, options?: UseJobStreamOptions) {
  const [data, setData] = useState<JobStreamData | null>(null)
  const [isStreaming, setIsStreaming] = useState(false)
  const esRef = useRef<EventSource | null>(null)
  const onCompleteRef = useRef(options?.onComplete)
  const onErrorRef = useRef(options?.onError)

  useEffect(() => {
    onCompleteRef.current = options?.onComplete
    onErrorRef.current = options?.onError
  }, [options?.onComplete, options?.onError])

  const stopStream = useCallback(() => {
    esRef.current?.close()
    esRef.current = null
    setIsStreaming(false)
  }, [])

  useEffect(() => {
    if (!jobId) {
      queueMicrotask(() => {
        setData(null)
        setIsStreaming(false)
      })
      return
    }

    setIsStreaming(true)
    const es = new EventSource(`/api/admin/ai/backfill/${jobId}/stream`)
    esRef.current = es

    es.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as JobStreamData & { error?: string }
        if (parsed.error) {
          onErrorRef.current?.(parsed.error)
          stopStream()
          return
        }
        setData(parsed)
        if (parsed.status === 'COMPLETED' || parsed.status === 'FAILED') {
          onCompleteRef.current?.(parsed)
          stopStream()
        }
      } catch {
        console.error('[useJobStream] Failed to parse SSE data:', event.data)
      }
    }

    es.onerror = () => {
      onErrorRef.current?.('Connection lost')
      stopStream()
    }

    return stopStream
  }, [jobId, stopStream])

  return { data, isStreaming, stopStream }
}
