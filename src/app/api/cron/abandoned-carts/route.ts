/**
 * @file route.ts
 * @description Cron: Abandoned cart recovery (2-3 hours after last update)
 * @module app/api/cron/abandoned-carts
 */

import { type NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/utils/cron-auth'
import { logger } from '@/lib/logger'
import { CheckoutRecoveryService } from '@/lib/services/checkout-recovery.service'

export const dynamic = 'force-dynamic'
export const maxDuration = 60


/**
 * GET /api/cron/abandoned-carts
 * Triggers background checkout recovery scans and client notifications.
 */
export async function GET(request: NextRequest) {
  try {
    if (!verifyCronSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const result = await CheckoutRecoveryService.recoverAbandonedCheckouts()

    logger.info('abandoned-carts: processed successfully', { 
      processed: result.processed, 
      failures: result.failures 
    })
    
    return NextResponse.json({ 
      success: true, 
      triggered: result.processed, 
      failures: result.failures 
    })
  } catch (error) {
    logger.error('abandoned-carts: error', {
      error: error instanceof Error ? error.message : String(error)
    })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
