/**
 * @file route.ts
 * @description API route for equipment CRUD operations
 * @module app/api/equipment
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { EquipmentService } from '@/lib/services/equipment.service'
import { createEquipmentSchema } from '@/lib/validators/equipment.validator'

function coerceEquipmentBody(body: Record<string, unknown>) {
  const out: Record<string, unknown> = { ...body }
  const numberFields = [
    'quantityTotal',
    'quantityAvailable',
    'dailyPrice',
    'weeklyPrice',
    'monthlyPrice',
    'purchasePrice',
    'depositAmount',
    'bufferTime',
  ]
  for (const key of numberFields) {
    const v = out[key]
    if (typeof v === 'string' && v.trim() !== '') {
      const n = Number(v)
      out[key] = Number.isNaN(n) ? v : n
    }
  }

  const booleanFields = ['featured', 'isActive', 'requiresAssistant', 'requiresDeposit']
  for (const key of booleanFields) {
    const v = out[key]
    if (typeof v === 'string') {
      if (v === 'true') out[key] = true
      if (v === 'false') out[key] = false
    }
  }

  return out
}

/**
 * GET /api/equipment - Get equipment list
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!(await hasPermission(session.user.id, PERMISSIONS.EQUIPMENT_READ))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const searchParams = request.nextUrl.searchParams
    const skipRaw = parseInt(searchParams.get('skip') ?? searchParams.get('page') ?? '0', 10)
    const takeRaw = parseInt(searchParams.get('take') ?? searchParams.get('limit') ?? '50', 10)
    const skip = Number.isNaN(skipRaw) || skipRaw < 0 ? 0 : Math.min(skipRaw, 10000)
    const take = Number.isNaN(takeRaw) || takeRaw < 1 ? 50 : Math.min(takeRaw, 500)

    const filters = {
      search: searchParams.get('search') || searchParams.get('q') || undefined,
      categoryId: searchParams.get('categoryId') || undefined,
      brandId: searchParams.get('brandId') || undefined,
      condition: searchParams.get('condition') as any,
      isActive:
        searchParams.get('isActive') === 'true'
          ? true
          : searchParams.get('isActive') === 'false'
            ? false
            : undefined,
      featured:
        searchParams.get('featured') === 'true'
          ? true
          : searchParams.get('featured') === 'false'
            ? false
            : undefined,
      skip,
      take,
    }

    const result = await EquipmentService.getEquipmentList(filters)

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error fetching equipment:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch equipment' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/equipment - Create new equipment
 */
export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!(await hasPermission(session.user.id, PERMISSIONS.EQUIPMENT_CREATE))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const bodyRaw = (await request.json()) as Record<string, unknown>
    const body = coerceEquipmentBody(bodyRaw)
    const { featured: _featured, ...rest } = body

    const parsed = createEquipmentSchema.safeParse(rest)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const equipment = await EquipmentService.createEquipment({
      ...parsed.data,
      createdBy: session.user.id,
    })

    return NextResponse.json(equipment, { status: 201 })
  } catch (error) {
    console.error('Error creating equipment:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create equipment' },
      { status: 400 }
    )
  }
}
