/**
 * @file api/payments/route.ts
 * @description API route for payments (list)
 * @module api/payments
 * @author Engineering Team
 * @created 2026-01-28
 */

import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { PaymentService } from '@/lib/services/payment.service'
import { PaymentPolicy } from '@/lib/policies/payment.policy'
import { paymentFilterSchema } from '@/lib/validators/payment.validator'
import { ForbiddenError } from '@/lib/errors'
import { PaymentStatus } from '@prisma/client'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Check policy
    const policy = await PaymentPolicy.canView(userId)
    if (!policy.allowed) {
      return NextResponse.json({ error: policy.reason || 'Forbidden' }, { status: 403 })
    }

    // Parse query params
    const { searchParams } = new URL(req.url)
    const filters: any = {}

    if (searchParams.get('status')) {
      filters.status = searchParams.get('status') as PaymentStatus
    }

    if (searchParams.get('bookingId')) {
      filters.bookingId = searchParams.get('bookingId')
    }

    if (searchParams.get('customerId')) {
      filters.customerId = searchParams.get('customerId')
    }

    if (searchParams.get('dateFrom')) {
      filters.dateFrom = new Date(searchParams.get('dateFrom')!)
    }

    if (searchParams.get('dateTo')) {
      filters.dateTo = new Date(searchParams.get('dateTo')!)
    }

    if (searchParams.get('minAmount')) {
      filters.minAmount = parseFloat(searchParams.get('minAmount')!)
    }

    if (searchParams.get('maxAmount')) {
      filters.maxAmount = parseFloat(searchParams.get('maxAmount')!)
    }

    if (searchParams.get('hasRefund') === 'true') {
      filters.hasRefund = true
    } else if (searchParams.get('hasRefund') === 'false') {
      filters.hasRefund = false
    }

    if (searchParams.get('page')) {
      filters.page = parseInt(searchParams.get('page')!)
    }

    if (searchParams.get('pageSize')) {
      filters.pageSize = parseInt(searchParams.get('pageSize')!)
    }

    // Validate filters
    const validated = paymentFilterSchema.parse(filters)

    const result = await PaymentService.list(userId, validated)

    return NextResponse.json({
      success: true,
      data: result.payments,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
      summary: result.summary,
    })
  } catch (error: any) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'بيانات غير صالحة', details: error.errors },
        { status: 400 }
      )
    }

    console.error('List payments error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
