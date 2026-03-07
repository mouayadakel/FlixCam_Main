/**
 * POST /api/public/kit-compatibility
 * Body: { selectedEquipmentIds: string[], targetCategoryId: string }
 * Returns compatible equipment (e.g. lenses matching selected cameras' mount).
 */

import { NextRequest, NextResponse } from 'next/server'
import { rateLimitByTier } from '@/lib/utils/rate-limit'
import { AIService } from '@/lib/services/ai.service'
import { z } from 'zod'

const bodySchema = z.object({
  selectedEquipmentIds: z.array(z.string()).default([]),
  targetCategoryId: z.string().min(1),
})

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const rate = rateLimitByTier(request, 'public')
  if (!rate.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const body = await request.json()
    const { selectedEquipmentIds, targetCategoryId } = bodySchema.parse(body)
    const data = await AIService.getCompatibleEquipment({
      selectedEquipmentIds,
      targetCategoryId,
    })
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
