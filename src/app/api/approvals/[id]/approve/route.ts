/**
 * @file route.ts
 * @description Approve request endpoint
 * @module app/api/approvals/[id]/approve
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ApprovalService } from '@/lib/services/approval.service'
import { FeatureFlagService } from '@/lib/services/feature-flag.service'
import { PaymentService } from '@/lib/services/payment.service'
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
    const { notes } = body

    const approval = await ApprovalService.approve({
      approvalId: id,
      approvedBy: session.user.id,
      notes,
    })

    // If this is a feature flag approval, apply the change
    if (approval.resourceType === 'feature_flag' && approval.status === 'approved') {
      const metadata = approval.metadata as any
      if (metadata?.targetState !== undefined) {
        await FeatureFlagService.update(approval.resourceId, {
          enabled: metadata.targetState,
          userId: session.user.id,
        })
      }
    }

    // If this is a payment refund approval, execute the refund (per ROLES_AND_SECURITY: approval then execute)
    if (
      approval.resourceType === 'payment' &&
      approval.action === 'payment.refund' &&
      approval.status === 'approved'
    ) {
      await PaymentService.processRefund(approval.resourceId, approval.id, session.user.id)
    }

    return NextResponse.json({ approval })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to approve request' },
      { status: 500 }
    )
  }
}
