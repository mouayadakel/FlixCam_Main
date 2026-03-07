/**
 * @file route.ts
 * @description Public health check for load balancers and monitoring
 * @module app/api/health
 */

import { NextResponse } from 'next/server'
import { handleApiError } from '@/lib/utils/api-helpers'

export const dynamic = 'force-dynamic'

/**
 * GET /api/health
 * Public endpoint — no auth required. Used by load balancers and monitoring.
 */
export async function GET() {
  try {
    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    })
  } catch (error) {
    return handleApiError(error)
  }
}
