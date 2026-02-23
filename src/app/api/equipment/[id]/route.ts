/**
 * @file route.ts
 * @description API route for individual equipment operations
 * @module app/api/equipment/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { EquipmentService } from '@/lib/services/equipment.service'
import { updateEquipmentSchema } from '@/lib/validators/equipment.validator'

function coerceEquipmentBody(body: Record<string, unknown>) {
  const out: Record<string, unknown> = { ...body }
  const numberFields = [
    'quantityTotal',
    'quantityAvailable',
    'dailyPrice',
    'weeklyPrice',
    'monthlyPrice',
    'bufferTime',
  ]
  for (const key of numberFields) {
    const v = out[key]
    if (typeof v === 'string' && v.trim() !== '') {
      const n = Number(v)
      out[key] = Number.isNaN(n) ? v : n
    }
  }

  const booleanFields = ['featured', 'isActive']
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
 * GET /api/equipment/[id] - Get equipment by ID
 */
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!(await hasPermission(session.user.id, PERMISSIONS.EQUIPMENT_READ))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const equipment = await EquipmentService.getEquipmentById(params.id)

    return NextResponse.json(equipment)
  } catch (error) {
    console.error('Error fetching equipment:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Equipment not found' },
      { status: 404 }
    )
  }
}

/**
 * PATCH /api/equipment/[id] - Update equipment
 */
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!(await hasPermission(session.user.id, PERMISSIONS.EQUIPMENT_UPDATE))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const bodyRaw = (await request.json()) as Record<string, unknown>
    const body = coerceEquipmentBody(bodyRaw)
    const { featured: _featured, ...rest } = body

    const parsed = updateEquipmentSchema.safeParse({ id: params.id, ...rest })
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
    }

    const equipment = await EquipmentService.updateEquipment({
      ...parsed.data,
      updatedBy: session.user.id,
    })

    return NextResponse.json(equipment)
  } catch (error) {
    console.error('Error updating equipment:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update equipment' },
      { status: 400 }
    )
  }
}

/**
 * DELETE /api/equipment/[id] - Delete equipment (soft delete)
 */
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await auth()

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (!(await hasPermission(session.user.id, PERMISSIONS.EQUIPMENT_DELETE))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await EquipmentService.deleteEquipment(params.id, session.user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting equipment:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete equipment' },
      { status: 400 }
    )
  }
}
