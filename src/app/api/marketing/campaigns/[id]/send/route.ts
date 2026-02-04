/**
 * @file api/marketing/campaigns/[id]/send/route.ts
 * @description API route for sending marketing campaigns
 * @module api/marketing
 * @author Engineering Team
 * @created 2026-01-28
 */

import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { MarketingService } from '@/lib/services/marketing.service'
import { MarketingPolicy } from '@/lib/policies/marketing.policy'
import { ValidationError, ForbiddenError } from '@/lib/errors'

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Check policy
    const policy = await MarketingPolicy.canSend(userId)
    if (!policy.allowed) {
      return NextResponse.json(
        { error: policy.reason || 'Forbidden' },
        { status: 403 }
      )
    }

    // Get audit context
    const headers = req.headers
    const auditContext = {
      ipAddress: headers.get('x-forwarded-for') || headers.get('x-real-ip') || undefined,
      userAgent: headers.get('user-agent') || undefined,
    }

    const campaign = await MarketingService.send(params.id, userId, auditContext)

    return NextResponse.json({
      success: true,
      data: campaign,
      message: 'تم إرسال الحملة بنجاح',
    })
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    if (error instanceof ForbiddenError) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      )
    }

    console.error('Send campaign error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
