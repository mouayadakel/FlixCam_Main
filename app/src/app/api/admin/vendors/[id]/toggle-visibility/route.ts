/**
 * POST /api/admin/vendors/[id]/toggle-visibility - Toggle show/hide vendor name on public site
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { VendorService } from '@/lib/services/vendor.service'
import { handleApiError } from '@/lib/utils/api-helpers'

export const dynamic = 'force-dynamic'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const vendor = await VendorService.toggleVisibility(id, session.user.id)
    return NextResponse.json(vendor)
  } catch (error) {
    return handleApiError(error)
  }
}
