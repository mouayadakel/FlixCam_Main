/**
 * @file read-only-edge.ts
 * @description Edge-safe read-only mode enforcement for Next.js middleware.
 * Uses raw fetch() to Upstash REST API so it can run in the Edge runtime without
 * pulling in Node-only modules (@upstash/redis/nodejs, etc.).
 * @module lib/middleware
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const REDIS_KEY = 'app:read_only_mode'

/** Upstash Redis REST URL. */
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || ''
/** Upstash Redis REST token. */
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || ''

/**
 * Get read-only mode in Edge using Upstash REST API (fetch only).
 * Returns false when Upstash is not configured (allow writes).
 */
async function getReadOnlyModeEdge(): Promise<boolean> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    return false
  }
  try {
    const url = `${UPSTASH_URL.replace(/\/$/, '')}/get/${encodeURIComponent(REDIS_KEY)}`
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
      },
    })
    const data = (await res.json()) as { result?: string | boolean } | null
    const value = data?.result
    return value === '1' || value === true
  } catch {
    return false
  }
}

/**
 * Middleware to enforce read-only mode in Edge.
 * Blocks write operations (POST, PUT, PATCH, DELETE) when read-only is enabled in Upstash.
 */
export async function enforceReadOnly(request: NextRequest): Promise<NextResponse | null> {
  const readOnlyMode = await getReadOnlyModeEdge()
  if (!readOnlyMode) {
    return null
  }

  const method = request.method
  const isWriteOperation = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)

  if (isWriteOperation) {
    return NextResponse.json(
      {
        error: 'Read-only mode is enabled',
        message: 'The system is currently in read-only mode. Write operations are disabled.',
      },
      { status: 503 }
    )
  }

  return null
}
