/**
 * @file api/payments/[id]/refund/route.ts
 * @description API route for payment refunds
 * @module api/payments
 * @author Engineering Team
 * @created 2026-01-28
 */

import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { PaymentService } from '@/lib/services/payment.service'
import { PaymentPolicy } from '@/lib/policies/payment.policy'
import { paymentRefundSchema } from '@/lib/validators/payment.validator'
import { ValidationError, ForbiddenError } from '@/lib/errors'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const userId = session.user.id

    // Check policy
    const policy = await PaymentPolicy.canRefund(userId)
    if (!policy.allowed) {
      return NextResponse.json({ error: policy.reason || 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const validated = paymentRefundSchema.parse(body)

    // Request refund (creates approval request)
    const result = await PaymentService.requestRefund({
      paymentId: id,
      amount: validated.refundAmount,
      reason: validated.refundReason,
      userId,
    })

    return NextResponse.json({
      success: true,
      data: {
        payment: {
          id: result.payment.id,
          amount: Number(result.payment.amount),
          status: result.payment.status,
        },
        approval: {
          id: result.approval.id,
          status: result.approval.status,
          action: result.approval.action,
        },
        refundAmount: Number(result.refundAmount),
      },
      message: 'تم طلب الاسترداد بنجاح. في انتظار الموافقة.',
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

    console.error('Request refund error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
