/**
 * @file route.ts
 * @description Public health check for load balancers and monitoring
 * @module app/api/health
 */

import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

/**
 * GET /api/health
 * Public endpoint — no auth required. Used by load balancers and monitoring.
 */
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  })
}
