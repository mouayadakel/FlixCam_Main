/**
 * @file route.ts
 * @description API route for AI demand forecasting
 * @module api/ai/demand-forecast
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { AIService } from '@/lib/services/ai.service'
import { AIPolicy } from '@/lib/policies/ai.policy'
import { demandForecastInputSchema } from '@/lib/validators/ai.validator'
import { handleApiError } from '@/lib/utils/api-helpers'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const policy = await AIPolicy.canViewDemandForecast(session.user.id)
    if (!policy.allowed) {
      return NextResponse.json({ error: policy.reason }, { status: 403 })
    }

    const body = await request.json()
    const validated = demandForecastInputSchema.parse({
      ...body,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
    })

    const forecasts = await AIService.forecastDemand(validated)

    return NextResponse.json({ forecasts }, { status: 200 })
  } catch (error) {
    return handleApiError(error)
  }
}
