/**
 * @file route.ts
 * @description API route for equipment CRUD operations
 * @module app/api/equipment
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { EquipmentService } from '@/lib/services/equipment.service'

/**
 * GET /api/equipment - Get equipment list
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const filters = {
      search: searchParams.get('search') || undefined,
      categoryId: searchParams.get('categoryId') || undefined,
      brandId: searchParams.get('brandId') || undefined,
      condition: searchParams.get('condition') as any,
      isActive: searchParams.get('isActive') === 'true' ? true : searchParams.get('isActive') === 'false' ? false : undefined,
      featured: searchParams.get('featured') === 'true' ? true : searchParams.get('featured') === 'false' ? false : undefined,
      skip: parseInt(searchParams.get('skip') || '0'),
      take: parseInt(searchParams.get('take') || '50'),
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

    const body = await request.json()
    const equipment = await EquipmentService.createEquipment({
      ...body,
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
