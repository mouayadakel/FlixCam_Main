/**
 * @file route.ts
 * @description Preview price calculation with rules
 * @module app/api/pricing-rules/preview
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { previewPricingSchema } from '@/lib/validators/pricing-rule.validator'
import { calculatePrice } from '@/lib/pricing-engine'
import { handleApiError } from '@/lib/utils/api-helpers'
import { UnauthorizedError } from '@/lib/errors'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user) throw new UnauthorizedError()

    const body = await request.json()
    const parsed = previewPricingSchema.parse(body)

    const result = await calculatePrice({
      equipmentIds: parsed.equipmentIds?.length ? parsed.equipmentIds : undefined,
      studioId: parsed.studioId ?? undefined,
      startDate: new Date(parsed.startDate),
      endDate: new Date(parsed.endDate),
      customerId: parsed.customerId ?? undefined,
    })

    return NextResponse.json(result)
  } catch (error) {
    return handleApiError(error)
  }
}
