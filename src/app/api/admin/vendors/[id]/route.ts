/**
 * GET /api/admin/vendors/[id] - Get vendor detail
 * PATCH /api/admin/vendors/[id] - Update vendor, approve, suspend
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { VendorService } from '@/lib/services/vendor.service'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const patchSchema = z.object({
  companyName: z.string().min(1).max(255).optional(),
  companyNameAr: z.string().max(255).optional().nullable(),
  description: z.string().optional().nullable(),
  phone: z.string().max(50).optional().nullable(),
  email: z.string().email().optional().nullable(),
  commercialReg: z.string().optional().nullable(),
  vatNumber: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  iban: z.string().optional().nullable(),
  commissionRate: z.number().min(0).max(100).optional(),
  isNameVisible: z.boolean().optional(),
  action: z.enum(['approve', 'suspend', 'reactivate']).optional(),
})

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params
  const vendor = await VendorService.getVendorById(id, session.user.id)
  return NextResponse.json(vendor)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().fieldErrors },
      { status: 400 }
    )
  }

  if (parsed.data.action === 'approve') {
    const vendor = await VendorService.approveVendor(id, session.user.id)
    return NextResponse.json(vendor)
  }
  if (parsed.data.action === 'suspend') {
    const vendor = await VendorService.suspendVendor(id, session.user.id)
    return NextResponse.json(vendor)
  }
  if (parsed.data.action === 'reactivate') {
    const vendor = await VendorService.reactivateVendor(id, session.user.id)
    return NextResponse.json(vendor)
  }

  const { action: _action, ...updateData } = parsed.data
  const vendor = await VendorService.updateVendor(id, updateData, session.user.id)
  return NextResponse.json(vendor)
}
