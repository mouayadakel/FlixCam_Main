/**
 * @file route.ts
 * @description Test API endpoint
 * @module app/api/test
 */

import { NextResponse } from 'next/server'
import { rateLimitAPI } from '@/lib/utils/rate-limit'
import { prisma } from '@/lib/db/prisma'

export async function GET(request: Request) {
  // Rate limiting
  const rateLimit = rateLimitAPI(request)

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests', resetAt: rateLimit.resetAt },
      {
        status: 429,
        headers: {
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': rateLimit.resetAt.toString(),
        },
      }
    )
  }

  try {
    // Lightweight connectivity probe only — do not expose row counts or
    // internal error details on a public, unauthenticated endpoint.
    await prisma.$queryRaw`SELECT 1`

    return NextResponse.json(
      { status: 'ok', database: 'connected' },
      {
        headers: {
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': rateLimit.resetAt.toString(),
        },
      }
    )
  } catch {
    // Never echo the raw error to unauthenticated callers.
    return NextResponse.json(
      { status: 'error', database: 'disconnected' },
      { status: 503 }
    )
  }
}
