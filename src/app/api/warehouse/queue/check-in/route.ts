/**
 * @file api/warehouse/queue/check-in/route.ts
 * @description API route for check-in queue
 * @module api/warehouse
 * @author Engineering Team
 * @created 2026-01-28
 */

import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { WarehouseService } from '@/lib/services/warehouse.service'
import { WarehousePolicy } from '@/lib/policies/warehouse.policy'
import { ForbiddenError } from '@/lib/errors'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Check policy
    const policy = await WarehousePolicy.canViewInventory(userId)
    if (!policy.allowed) {
      return NextResponse.json(
        { error: policy.reason || 'Forbidden' },
        { status: 403 }
      )
    }

    const bookings = await WarehouseService.getReadyForCheckIn(userId)

    return NextResponse.json({
      success: true,
      data: bookings,
    })
  } catch (error: any) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      )
    }

    console.error('Check-in queue error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
