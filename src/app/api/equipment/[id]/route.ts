/**
 * @file route.ts
 * @description API route for individual equipment operations
 * @module app/api/equipment/[id]
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { EquipmentService } from '@/lib/services/equipment.service'

/**
 * GET /api/equipment/[id] - Get equipment by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const equipment = await EquipmentService.updateEquipment({
      id: params.id,
      ...body,
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
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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
