/**
 * GET /api/vendor/earnings - Vendor earnings breakdown
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { VendorService } from '@/lib/services/vendor.service'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const vendor = await VendorService.getVendorByUserId(session.user.id)
  if (!vendor) {
    return NextResponse.json(
      { error: 'Vendor account not found or not approved' },
      { status: 403 }
    )
  }

  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  const filters: { startDate?: Date; endDate?: Date } = {}
  if (startDate) filters.startDate = new Date(startDate)
  if (endDate) filters.endDate = new Date(endDate)

  const earnings = await VendorService.getVendorEarnings(
    vendor.id,
    filters,
    session.user.id
  )
  return NextResponse.json(earnings)
}
