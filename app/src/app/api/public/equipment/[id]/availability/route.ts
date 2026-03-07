/**
 * GET /api/public/equipment/[id]/availability
 * Public (no auth) equipment availability for a date range.
 * Returns { available, quantityAvailable } for use on product pages.
 */

import { NextRequest, NextResponse } from 'next/server'
import { EquipmentService } from '@/lib/services/equipment.service'
import { rateLimitByTier } from '@/lib/utils/rate-limit'

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const rate = rateLimitByTier(request, 'public')
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const { id } = await context.params
  const searchParams = request.nextUrl.searchParams
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  if (!startDate || !endDate) {
    return NextResponse.json(
      { error: 'startDate and endDate are required (YYYY-MM-DD)' },
      { status: 400 }
    )
  }

  try {
    const result = await EquipmentService.checkAvailability(
      id,
      new Date(startDate),
      new Date(endDate)
    )

    if ('reason' in result && !result.available) {
      return NextResponse.json({
        available: false,
        quantityAvailable: 0,
      })
    }

    const quantityAvailable = result.available
      ? (result.availableQuantity ?? 0) - (result.rentedQuantity ?? 0)
      : 0

    return NextResponse.json({
      available: result.available,
      quantityAvailable: Math.max(0, quantityAvailable),
    })
  } catch (error) {
    console.error('Public availability check error:', error)
    return NextResponse.json({ error: 'Failed to check availability' }, { status: 500 })
  }
}
