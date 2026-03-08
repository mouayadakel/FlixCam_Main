/**
 * GET /api/vendor/dashboard - Vendor dashboard stats
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { VendorService } from '@/lib/services/vendor.service'
import { handleApiError } from '@/lib/utils/api-helpers'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const vendor = await VendorService.getVendorByUserId(session.user.id)
    if (!vendor) {
      return NextResponse.json({ error: 'Vendor account not found or not approved' }, { status: 403 })
    }

    const stats = await VendorService.getVendorDashboardStats(vendor.id, session.user.id)
    return NextResponse.json(stats)
  } catch (error) {
    return handleApiError(error)
  }
}
