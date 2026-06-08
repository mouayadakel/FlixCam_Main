import { type NextRequest, NextResponse } from 'next/server'
import { verifyCronSecret } from '@/lib/utils/cron-auth'
import { logger } from '@/lib/logger'
import { MoyasarWebhookProcessorService } from '@/lib/services/moyasar-webhook-processor.service'

export const dynamic = 'force-dynamic'
export const maxDuration = 60


export async function GET(request: NextRequest) {
  try {
    if (!verifyCronSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const rawLimit = Number(searchParams.get('limit') || 50)
    const limit = Number.isFinite(rawLimit) ? Math.max(1, Math.min(200, rawLimit)) : 50

    const result = await MoyasarWebhookProcessorService.processPending(limit)

    return NextResponse.json({
      ok: true,
      ...result,
    })
  } catch (error: unknown) {
    logger.error('moyasar-webhooks cron failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
