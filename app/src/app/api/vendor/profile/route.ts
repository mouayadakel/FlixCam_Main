/**
 * GET /api/vendor/profile - Get vendor profile
 * PATCH /api/vendor/profile - Update vendor profile (vendor-editable fields)
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
  bankName: z.string().max(255).optional().nullable(),
  iban: z.string().max(50).optional().nullable(),
})

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const vendor = await VendorService.getVendorByUserId(session.user.id)
  if (!vendor) {
    return NextResponse.json({ error: 'Vendor account not found or not approved' }, { status: 403 })
  }

  return NextResponse.json(vendor)
}

export async function PATCH(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const vendor = await VendorService.getVendorByUserId(session.user.id)
  if (!vendor) {
    return NextResponse.json({ error: 'Vendor account not found or not approved' }, { status: 403 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const parsed = patchSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const data = Object.fromEntries(
    Object.entries(parsed.data).map(([k, v]) => [k, v === null ? undefined : v])
  ) as Parameters<typeof VendorService.updateVendor>[1]
  const updated = await VendorService.updateVendor(vendor.id, data, session.user.id)
  return NextResponse.json(updated)
}
