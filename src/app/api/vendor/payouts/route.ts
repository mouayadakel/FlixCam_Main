/**
 * GET /api/vendor/payouts - Vendor payout history
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { VendorService } from '@/lib/services/vendor.service'
import { PayoutService } from '@/lib/services/payout.service'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const vendor = await VendorService.getVendorByUserId(session.user.id)
  if (!vendor) {
    return NextResponse.json({ error: 'Vendor account not found or not approved' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const skip = parseInt(searchParams.get('skip') || '0')
  const take = parseInt(searchParams.get('take') || '20')
  const status = searchParams.get('status')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  const filters: {
    skip: number
    take: number
    status?: 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED'
    startDate?: Date
    endDate?: Date
  } = { skip, take }
  if (status && ['PENDING', 'PROCESSING', 'PAID', 'FAILED'].includes(status)) {
    filters.status = status as 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED'
  }
  if (startDate) filters.startDate = new Date(startDate)
  if (endDate) filters.endDate = new Date(endDate)

  const [payoutsResult, summary] = await Promise.all([
    PayoutService.getPayoutsByVendor(vendor.id, filters, session.user.id),
    PayoutService.getPayoutSummary(vendor.id, session.user.id),
  ])

  return NextResponse.json({ ...payoutsResult, summary })
}
