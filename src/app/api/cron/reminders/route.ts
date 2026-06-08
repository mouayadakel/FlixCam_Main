/**
 * @file route.ts
 * @description Secure cron endpoint to trigger automated booking reminders via WhatsApp
 * @module api/cron/reminders
 */

import { NextRequest, NextResponse } from 'next/server'
import { WhatsAppReminderService } from '@/lib/services/whatsapp-reminder.service'
import { logger } from '@/lib/logger'
import { verifyCronSecret } from '@/lib/utils/cron-auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  return triggerReminders(req)
}

export async function POST(req: NextRequest) {
  return triggerReminders(req)
}

async function triggerReminders(req: NextRequest) {
  if (!process.env.CRON_SECRET) {
    logger.error('[CronRemindersAPI] CRON_SECRET is not configured; refusing to run.')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  if (!verifyCronSecret(req, { allowQuerySecret: true })) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    logger.info('[CronRemindersAPI] Starting automated WhatsApp scheduled notifications run...')

    const [pickupResult, returnResult, overdueResult] = await Promise.all([
      WhatsAppReminderService.sendPickupReminders(),
      WhatsAppReminderService.sendReturnReminders(),
      WhatsAppReminderService.sendOverdueAlerts(),
    ])

    logger.info('[CronRemindersAPI] Reminders run completed successfully', {
      pickups: pickupResult,
      returns: returnResult,
      overdue: overdueResult,
    })

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      summary: {
        pickups: pickupResult,
        returns: returnResult,
        overdue: overdueResult,
      },
    })
  } catch (error: any) {
    logger.error('[CronRemindersAPI] Execution failed', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      { error: error.message || 'Reminders execution failed' },
      { status: 500 }
    )
  }
}
