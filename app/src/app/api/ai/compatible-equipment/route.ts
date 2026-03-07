/**
 * @file route.ts
 * @description Admin API for compatible equipment (e.g. lenses for selected cameras)
 * @module api/ai/compatible-equipment
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { AIService } from '@/lib/services/ai.service'
import { AIPolicy } from '@/lib/policies/ai.policy'
import { handleApiError } from '@/lib/utils/api-helpers'
import { z } from 'zod'

const bodySchema = z.object({
  selectedEquipmentIds: z.array(z.string()).default([]),
  targetCategoryId: z.string().min(1),
})

export async function POST(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const policy = await AIPolicy.canUseAI(session.user.id)
    if (!policy.allowed) {
      return NextResponse.json({ error: policy.reason }, { status: 403 })
    }
    const body = await request.json()
    const { selectedEquipmentIds, targetCategoryId } = bodySchema.parse(body)
    const data = await AIService.getCompatibleEquipment({
      selectedEquipmentIds,
      targetCategoryId,
    })
    return NextResponse.json({ data }, { status: 200 })
  } catch (error) {
    return handleApiError(error)
  }
}
