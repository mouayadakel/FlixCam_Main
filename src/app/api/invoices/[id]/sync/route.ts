/**
 * @file route.ts
 * @description API route to sync local invoice to Daftra ERP v2
 * @module api/invoices/[id]/sync
 */

import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { DaftraService } from '@/lib/services/daftra.service'
import { InvoicePolicy } from '@/lib/policies/invoice.policy'
import { rateLimitAPI } from '@/lib/utils/rate-limit'
import { logger } from '@/lib/logger'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const rateLimit = rateLimitAPI(req)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const userId = session.user.id

    // Check if the user has permission to read and manage invoices
    const policy = await InvoicePolicy.canUpdate(userId, id)
    if (!policy.allowed) {
      return NextResponse.json(
        { error: policy.reason || 'Forbidden to manage this invoice' },
        { status: 403 }
      )
    }

    const result = await DaftraService.syncInvoice(id, userId)

    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error: any) {
    logger.error('[InvoiceSyncAPI] Sync error', {
      error: error instanceof Error ? error.message : String(error),
    })
    return NextResponse.json(
      { error: error.message || 'Internal server error during Daftra sync' },
      { status: 500 }
    )
  }
}
