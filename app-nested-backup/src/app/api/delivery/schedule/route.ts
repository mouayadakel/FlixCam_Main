/**
 * @file api/delivery/schedule/route.ts
 * @description API route for scheduling deliveries
 * @module api/delivery
 * @author Engineering Team
 * @created 2026-01-28
 */

import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { DeliveryService } from '@/lib/services/delivery.service'
import { DeliveryPolicy } from '@/lib/policies/delivery.policy'
import { scheduleDeliverySchema } from '@/lib/validators/delivery.validator'
import { ValidationError, ForbiddenError } from '@/lib/errors'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Check policy
    const policy = await DeliveryPolicy.canSchedule(userId)
    if (!policy.allowed) {
      return NextResponse.json({ error: policy.reason || 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const validated = scheduleDeliverySchema.parse(body)

    // Get audit context
    const headers = req.headers
    const auditContext = {
      ipAddress: headers.get('x-forwarded-for') || headers.get('x-real-ip') || undefined,
      userAgent: headers.get('user-agent') || undefined,
    }

    const result = await DeliveryService.scheduleDelivery(validated, userId, auditContext)

    return NextResponse.json({
      success: true,
      data: result,
      message: 'تم جدولة التوصيل بنجاح',
    })
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'بيانات غير صالحة', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Schedule delivery error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
