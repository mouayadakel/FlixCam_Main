/**
 * @file api/warehouse/inventory/route.ts
 * @description API route for warehouse inventory
 * @module api/warehouse
 * @author Engineering Team
 * @created 2026-01-28
 */

import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { WarehouseService } from '@/lib/services/warehouse.service'
import { WarehousePolicy } from '@/lib/policies/warehouse.policy'
import { inventoryFilterSchema } from '@/lib/validators/warehouse.validator'
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

    // Parse query params
    const { searchParams } = new URL(req.url)
    const filters: any = {}

    if (searchParams.get('warehouseLocation')) {
      filters.warehouseLocation = searchParams.get('warehouseLocation')
    }

    if (searchParams.get('condition')) {
      filters.condition = searchParams.get('condition')
    }

    if (searchParams.get('available')) {
      filters.available = searchParams.get('available') === 'true'
    }

    // Validate filters
    const validated = inventoryFilterSchema.parse(filters)

    const inventory = await WarehouseService.getInventory(userId, validated)

    return NextResponse.json({
      success: true,
      data: inventory,
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

    console.error('Inventory error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
