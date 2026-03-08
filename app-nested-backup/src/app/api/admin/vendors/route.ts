/**
 * GET /api/admin/vendors - List vendors
 * POST /api/admin/vendors - Create vendor (invite)
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { VendorService } from '@/lib/services/vendor.service'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(255).optional(),
  phone: z.string().max(50).optional(),
  companyName: z.string().min(1).max(255),
  companyNameAr: z.string().max(255).optional(),
  description: z.string().optional(),
  commercialReg: z.string().optional(),
  vatNumber: z.string().optional(),
  bankName: z.string().optional(),
  iban: z.string().optional(),
  commissionRate: z.number().min(0).max(100).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const skip = parseInt(searchParams.get('skip') || '0')
    const take = parseInt(searchParams.get('take') || '50')

    const result = await VendorService.getVendorList(
      {
        status: status as 'PENDING' | 'APPROVED' | 'SUSPENDED' | 'REJECTED' | undefined,
        search: search ?? undefined,
        skip,
        take,
      },
      session.user.id
    )
    return NextResponse.json(result)
  } catch (err) {
    console.error('[GET /api/admin/vendors]', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    const status =
      err && typeof err === 'object' && 'statusCode' in err
        ? (err as { statusCode: number }).statusCode
        : 500
    return NextResponse.json({ error: message }, { status })
  }
}

export async function POST(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 })
  }

  const parsed = createSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const vendor = await VendorService.createVendor(parsed.data, session.user.id)
  return NextResponse.json(vendor, { status: 201 })
}
