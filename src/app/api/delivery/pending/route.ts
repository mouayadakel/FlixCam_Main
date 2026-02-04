/**
 * @file api/delivery/pending/route.ts
 * @description API route for getting pending deliveries
 * @module api/delivery
 * @author Engineering Team
 * @created 2026-01-28
 */

import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { DeliveryService } from '@/lib/services/delivery.service'
import { DeliveryPolicy } from '@/lib/policies/delivery.policy'
import { deliveryFilterSchema } from '@/lib/validators/delivery.validator'
import { ForbiddenError } from '@/lib/errors'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Check policy
    const policy = await DeliveryPolicy.canView(userId)
    if (!policy.allowed) {
      return NextResponse.json(
        { error: policy.reason || 'Forbidden' },
        { status: 403 }
      )
    }

    // Parse query params
    const { searchParams } = new URL(req.url)
    const filters: any = {}

    if (searchParams.get('type')) {
      filters.type = searchParams.get('type')
    }

    if (searchParams.get('driverId')) {
      filters.driverId = searchParams.get('driverId')
    }

    if (searchParams.get('dateFrom')) {
      filters.dateFrom = new Date(searchParams.get('dateFrom')!)
    }

    if (searchParams.get('dateTo')) {
      filters.dateTo = new Date(searchParams.get('dateTo')!)
    }

    // Validate filters
    const validated = deliveryFilterSchema.parse(filters)

    const deliveries = await DeliveryService.getPendingDeliveries(userId, validated)

    return NextResponse.json({
      success: true,
      data: deliveries,
    })
  } catch (error: any) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      )
    }

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'بيانات غير صالحة', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Get pending deliveries error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
