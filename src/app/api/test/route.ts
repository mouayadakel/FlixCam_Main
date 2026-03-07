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
    // Test database connection
    const userCount = await prisma.user.count()
    const equipmentCount = await prisma.equipment.count()
    const categoryCount = await prisma.category.count()

    return NextResponse.json(
      {
        status: 'ok',
        database: 'connected',
        data: {
          users: userCount,
          equipment: equipmentCount,
          categories: categoryCount,
        },
        rateLimit: {
          remaining: rateLimit.remaining,
          resetAt: rateLimit.resetAt,
        },
      },
      {
        headers: {
          'X-RateLimit-Limit': '100',
          'X-RateLimit-Remaining': rateLimit.remaining.toString(),
          'X-RateLimit-Reset': rateLimit.resetAt.toString(),
        },
      }
    )
  } catch (error: any) {
    // Handle database connection errors gracefully
    const isConnectionError =
      error.message?.includes("Can't reach database") ||
      error.message?.includes('Environment variable not found: DATABASE_URL') ||
      error.message?.includes('P1001')

    return NextResponse.json(
      {
        status: isConnectionError ? 'database_not_configured' : 'error',
        database: 'disconnected',
        error: error.message,
        message: isConnectionError
          ? 'Database not configured. Please set up PostgreSQL and run migrations.'
          : 'An error occurred',
      },
      { status: isConnectionError ? 503 : 500 }
    )
  }
}
