/**
 * GET /api/bookings/cost-preview – Subtotal, VAT, deposit for given equipment and dates (admin).
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission } from '@/lib/auth/permissions'
import { PricingService } from '@/lib/services/pricing.service'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const allowed = await hasPermission(session.user.id, 'booking.create' as never)
  if (!allowed) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const equipmentIds = searchParams.get('equipmentIds')?.split(',').filter(Boolean) ?? []
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  if (!equipmentIds.length || !startDate || !endDate) {
    return NextResponse.json(
      { error: 'equipmentIds, startDate, and endDate are required' },
      { status: 400 }
    )
  }

  const start = new Date(startDate)
  const end = new Date(endDate)
  if (end <= start) {
    return NextResponse.json({ error: 'endDate must be after startDate' }, { status: 400 })
  }

  const equipment = equipmentIds.map((id) => ({ equipmentId: id, quantity: 1 }))
  const quote = await PricingService.generateQuote({
    equipment,
    startDate: start,
    endDate: end,
  })

  return NextResponse.json({
    subtotal: quote.subtotal,
    vatAmount: quote.vatAmount,
    depositAmount: quote.depositAmount,
    totalAmount: quote.totalAmount,
  })
}
