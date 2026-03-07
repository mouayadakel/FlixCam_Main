/**
 * POST /api/public/kit-match-prebuilt
 * Body: { selectedEquipmentIds: string[], shootTypeSlug?: string }
 * Returns pre-built kits that overlap with the customer's selection (overlap %, savings).
 */

import { NextRequest, NextResponse } from 'next/server'
import { rateLimitByTier } from '@/lib/utils/rate-limit'
import { ShootTypeService } from '@/lib/services/shoot-type.service'
import { z } from 'zod'

const bodySchema = z.object({
  selectedEquipmentIds: z.array(z.string()).default([]),
  shootTypeSlug: z.string().optional(),
})

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const rate = rateLimitByTier(request, 'public')
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const { selectedEquipmentIds } = bodySchema.parse(body)
    const data = await ShootTypeService.findMatchingPrebuiltKits(selectedEquipmentIds)
    return NextResponse.json({ data })
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: err.issues }, { status: 400 })
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal Server Error' },
      { status: 500 }
    )
  }
}
