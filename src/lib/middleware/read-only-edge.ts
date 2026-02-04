/**
 * @file read-only-edge.ts
 * @description Edge-safe read-only mode enforcement for Next.js middleware.
 * Uses only @upstash/redis (HTTP) so it can run in the Edge runtime.
 * Must not import ioredis or any Node-only modules.
 * @module lib/middleware
 */

import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const REDIS_KEY = 'app:read_only_mode'

/** Upstash Redis URL (Edge-compatible). */
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL || ''
/** Upstash Redis token. */
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN || ''

/**
 * Get read-only mode in Edge using Upstash Redis only.
 * Returns false when Upstash is not configured (allow writes).
 */
async function getReadOnlyModeEdge(): Promise<boolean> {
  if (!UPSTASH_URL || !UPSTASH_TOKEN) {
    return false
  }
  try {
    const { Redis } = await import('@upstash/redis')
    const redis = new Redis({
      url: UPSTASH_URL,
      token: UPSTASH_TOKEN,
    })
    const value = await redis.get(REDIS_KEY)
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
