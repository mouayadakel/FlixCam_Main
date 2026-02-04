/**
 * @file route.ts
 * @description API route for checking equipment availability
 * @module app/api/equipment/[id]/availability
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { EquipmentService } from '@/lib/services/equipment.service'

/**
 * GET /api/equipment/[id]/availability - Check equipment availability
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

    const searchParams = request.nextUrl.searchParams
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const excludeBookingId = searchParams.get('excludeBookingId') || undefined

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      )
    }

    const availability = await EquipmentService.checkAvailability(
      params.id,
      new Date(startDate),
      new Date(endDate),
      excludeBookingId
    )

    return NextResponse.json(availability)
  } catch (error) {
    console.error('Error checking availability:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to check availability' },
      { status: 500 }
    )
  }
}
