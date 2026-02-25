/**
 * @file route.ts
 * @description Request approval for feature flag toggle
 * @module app/api/feature-flags/[id]/request-approval
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ApprovalService } from '@/lib/services/approval.service'
import { FeatureFlagService } from '@/lib/services/feature-flag.service'
import { rateLimitAPI } from '@/lib/utils/rate-limit'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const rateLimit = rateLimitAPI(request)

  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const session = await auth()

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { reason, targetState } = body

    if (!reason) {
      return NextResponse.json({ error: 'Reason is required' }, { status: 400 })
    }

    const flag = await FeatureFlagService.getById(id)
    if (!flag) {
      return NextResponse.json({ error: 'Feature flag not found' }, { status: 404 })
    }

    const approval = await ApprovalService.request({
      action: 'feature_flag.toggle',
      resourceType: 'feature_flag',
      resourceId: id,
      requestedBy: session.user.id,
      reason,
      metadata: {
        flagName: flag.name,
        currentState: flag.enabled,
        targetState: targetState ?? !flag.enabled,
      },
    })

    return NextResponse.json({ approval }, { status: 201 })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to request approval' },
      { status: 500 }
    )
  }
}
