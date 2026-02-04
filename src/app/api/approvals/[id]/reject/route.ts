/**
 * @file route.ts
 * @description Reject request endpoint
 * @module app/api/approvals/[id]/reject
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ApprovalService } from '@/lib/services/approval.service'
import { rateLimitAPI } from '@/lib/utils/rate-limit'

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const rateLimit = rateLimitAPI(request)
  
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429 }
    )
  }

  try {
    const session = await auth()
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { reason } = body

    if (!reason) {
      return NextResponse.json(
        { error: 'Reason is required for rejection' },
        { status: 400 }
      )
    }

    const approval = await ApprovalService.reject({
      approvalId: params.id,
      rejectedBy: session.user.id,
      reason,
    })

    return NextResponse.json({ approval })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to reject request' },
      { status: 500 }
    )
  }
}
