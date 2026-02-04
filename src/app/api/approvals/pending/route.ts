/**
 * @file route.ts
 * @description Pending approvals API endpoint
 * @module app/api/approvals/pending
 */

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { ApprovalService } from '@/lib/services/approval.service'
import { rateLimitAPI } from '@/lib/utils/rate-limit'

// Force dynamic rendering for this API route
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
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

    const approvals = await ApprovalService.getPending(session.user.id)

    return NextResponse.json({ approvals })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Failed to fetch pending approvals' },
      { status: 500 }
    )
  }
}
