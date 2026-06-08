/**
 * Factory for secure GET cron API routes.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/utils/cron-auth'
import { logger } from '@/lib/logger'
import type { CronJobResult } from './cron-utils'

export const cronRouteConfig = {
  dynamic: 'force-dynamic' as const,
  maxDuration: 120,
}

export function createCronGetRoute(
  jobName: string,
  handler: () => Promise<CronJobResult>
) {
  return async function GET(request: NextRequest) {
    if (!verifyCronSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
      const result = await handler()
      return NextResponse.json(result)
    } catch (error) {
      logger.error(`[Cron] ${jobName} failed`, {
        error: error instanceof Error ? error.message : String(error),
      })
      return NextResponse.json(
        {
          ok: false,
          job: jobName,
          error: error instanceof Error ? error.message : 'Internal server error',
        },
        { status: 500 }
      )
    }
  }
}
