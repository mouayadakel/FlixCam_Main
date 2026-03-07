/**
 * POST /api/admin/vendors/[id]/toggle-visibility - Toggle show/hide vendor name on public site
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { VendorService } from '@/lib/services/vendor.service'

export const dynamic = 'force-dynamic'

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const vendor = await VendorService.toggleVisibility(id, session.user.id)
  return NextResponse.json(vendor)
}
