/**
 * GET /api/admin/vendors/payouts - List all vendor payouts
 * PATCH /api/admin/vendors/payouts - Mark payout as paid (body: { payoutId, bankRef?, notes? })
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { PayoutService } from '@/lib/services/payout.service'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const markPaidSchema = z.object({
  payoutId: z.string().min(1),
  bankRef: z.string().optional(),
  notes: z.string().optional(),
})

export async function GET(request: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const vendorId = searchParams.get('vendorId')
  const status = searchParams.get('status')
  const skip = parseInt(searchParams.get('skip') || '0')
  const take = parseInt(searchParams.get('take') || '50')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  const filters: {
    vendorId?: string
    status?: 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED'
    skip: number
    take: number
    startDate?: Date
    endDate?: Date
  } = { skip, take }
  if (vendorId) filters.vendorId = vendorId
  if (status && ['PENDING', 'PROCESSING', 'PAID', 'FAILED'].includes(status)) {
    filters.status = status as 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED'
  }
  if (startDate) filters.startDate = new Date(startDate)
  if (endDate) filters.endDate = new Date(endDate)

  const result = await PayoutService.getAllPayouts(filters, session.user.id)
  return NextResponse.json(result)
}

export async function PATCH(request: NextRequest) {
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

  const parsed = markPaidSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten().fieldErrors }, { status: 400 })
  }

  const payout = await PayoutService.markPayoutPaid(parsed.data.payoutId, session.user.id, {
    bankRef: parsed.data.bankRef,
    notes: parsed.data.notes,
  })
  return NextResponse.json(payout)
}
