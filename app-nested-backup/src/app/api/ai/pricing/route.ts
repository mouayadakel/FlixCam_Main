/**
 * @file route.ts
 * @description API route for AI pricing suggestions
 * @module api/ai/pricing
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { AIService } from '@/lib/services/ai.service'
import { AIPolicy } from '@/lib/policies/ai.policy'
import { pricingSuggestionInputSchema } from '@/lib/validators/ai.validator'
import { handleApiError } from '@/lib/utils/api-helpers'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const policy = await AIPolicy.canViewPricingSuggestions(session.user.id)
    if (!policy.allowed) {
      return NextResponse.json({ error: policy.reason }, { status: 403 })
    }

    const body = await request.json()
    const validated = pricingSuggestionInputSchema.parse(body)

    const suggestion = await AIService.suggestPricing(validated)

    return NextResponse.json(suggestion, { status: 200 })
  } catch (error) {
    return handleApiError(error)
  }
}
