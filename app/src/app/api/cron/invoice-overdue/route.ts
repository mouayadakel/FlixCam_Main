/**
 * @file route.ts
 * @description Cron: Mark overdue invoices and notify customers
 * @module app/api/cron/invoice-overdue
 */

import { type NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { NotificationChannel } from '@prisma/client'
import { startOfDay } from 'date-fns'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function verifyCronSecret(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const auth = request.headers.get('authorization')
  return auth === `Bearer ${secret}` || auth === secret
}

/**
 * GET /api/cron/invoice-overdue
 * Finds invoices with dueDate < today, status not PAID/CANCELLED/OVERDUE, marks OVERDUE and notifies.
 */
export async function GET(request: NextRequest) {
  try {
    if (!verifyCronSecret(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = startOfDay(new Date())

    const invoices = await prisma.invoice.findMany({
      where: {
        dueDate: { lt: today },
        status: { notIn: ['PAID', 'CANCELLED', 'OVERDUE'] },
        deletedAt: null,
      },
      include: { customer: { select: { id: true } } },
    })

    let processed = 0
    for (const invoice of invoices) {
      try {
        await prisma.$transaction([
          prisma.invoice.update({
            where: { id: invoice.id },
            data: { status: 'OVERDUE' },
          }),
          prisma.notification.create({
            data: {
              userId: invoice.customerId,
              channel: NotificationChannel.IN_APP,
              type: 'invoice.overdue',
              title: 'Invoice Overdue',
              message: `Invoice #${invoice.invoiceNumber} is now overdue. Please pay as soon as possible.`,
              data: { invoiceId: invoice.id, invoiceNumber: invoice.invoiceNumber },
            },
          }),
        ])
        processed++
      } catch (err) {
        logger.error('invoice-overdue: failed for invoice', {
          invoiceId: invoice.id,
          error: err instanceof Error ? err.message : String(err),
        })
      }
    }

    logger.info('invoice-overdue: processed', { count: processed })
    return NextResponse.json({ processed })
  } catch (error) {
    logger.error('invoice-overdue: error', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
