/**
 * @file api/delivery/[bookingId]/route.ts
 * @description API route for delivery operations by booking ID
 * @module api/delivery
 * @author Engineering Team
 * @created 2026-01-28
 */

import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { DeliveryService } from '@/lib/services/delivery.service'
import { DeliveryPolicy } from '@/lib/policies/delivery.policy'
import { updateDeliverySchema, updateDeliveryStatusSchema } from '@/lib/validators/delivery.validator'
import { ValidationError, ForbiddenError } from '@/lib/errors'

export async function GET(
  req: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Check policy
    const policy = await DeliveryPolicy.canView(userId)
    if (!policy.allowed) {
      return NextResponse.json(
        { error: policy.reason || 'Forbidden' },
        { status: 403 }
      )
    }

    const deliveries = await DeliveryService.getDeliveriesByBooking(
      params.bookingId,
      userId
    )

    return NextResponse.json({
      success: true,
      data: deliveries,
    })
  } catch (error: any) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      )
    }

    console.error('Get deliveries error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { bookingId: string } }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Check policy
    const policy = await DeliveryPolicy.canUpdate(userId)
    if (!policy.allowed) {
      return NextResponse.json(
        { error: policy.reason || 'Forbidden' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const validated = updateDeliverySchema.parse(body)

    // Get audit context
    const headers = req.headers
    const auditContext = {
      ipAddress: headers.get('x-forwarded-for') || headers.get('x-real-ip') || undefined,
      userAgent: headers.get('user-agent') || undefined,
    }

    const result = await DeliveryService.updateDelivery(
      params.bookingId,
      validated,
      userId,
      auditContext
    )

    return NextResponse.json({
      success: true,
      data: result,
      message: 'تم تحديث التوصيل بنجاح',
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

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'بيانات غير صالحة', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Update delivery error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
