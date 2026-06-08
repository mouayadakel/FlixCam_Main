/**
 * @file route.ts
 * @description Vercel Cron: trigger nightly backfill scan. Protected by CRON_SECRET.
 * @module app/api/cron/backfill
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/utils/cron-auth'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * GET /api/cron/backfill
 * Header: Authorization: Bearer <CRON_SECRET> or x-cron-secret: <CRON_SECRET>
 */
export async function GET(request: NextRequest) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { scanAndQueue } = await import('@/lib/services/catalog-scanner.service')
    const { jobId, report } = await scanAndQueue({
      types: ['text', 'photo', 'spec'],
      trigger: 'scheduled',
    })
    return NextResponse.json({
      data: {
        jobId,
        totalProducts: report.totalProducts,
        catalogQualityScore: report.catalogQualityScore,
        byGapType: report.byGapType,
      },
    })
  } catch (error) {
    console.error('Cron backfill failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Backfill failed' },
      { status: 500 }
    )
  }
}
