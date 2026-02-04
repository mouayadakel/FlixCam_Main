/**
 * @file route.ts
 * @description API route for AI risk assessment
 * @module api/ai/risk-assessment
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { AIService } from '@/lib/services/ai.service'
import { AIPolicy } from '@/lib/policies/ai.policy'
import { riskAssessmentInputSchema } from '@/lib/validators/ai.validator'
import { handleApiError } from '@/lib/utils/api-helpers'

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const policy = await AIPolicy.canViewRiskAssessment(session.user.id)
    if (!policy.allowed) {
      return NextResponse.json({ error: policy.reason }, { status: 403 })
    }

    const body = await request.json()
    const validated = riskAssessmentInputSchema.parse(body)

    const assessment = await AIService.assessRisk(validated)

    return NextResponse.json(assessment, { status: 200 })
  } catch (error) {
    return handleApiError(error)
  }
}
