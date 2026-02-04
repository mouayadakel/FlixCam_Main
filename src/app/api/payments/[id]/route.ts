/**
 * @file api/payments/[id]/route.ts
 * @description API route for payment operations by ID
 * @module api/payments
 * @author Engineering Team
 * @created 2026-01-28
 */

import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { PaymentService } from '@/lib/services/payment.service'
import { PaymentPolicy } from '@/lib/policies/payment.policy'
import { updatePaymentSchema } from '@/lib/validators/payment.validator'
import { ValidationError, ForbiddenError } from '@/lib/errors'

export async function GET(
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
    const policy = await PaymentPolicy.canView(userId, params.id)
    if (!policy.allowed) {
      return NextResponse.json(
        { error: policy.reason || 'Forbidden' },
        { status: 403 }
      )
    }

    const payment = await PaymentService.getById(params.id, userId)

    return NextResponse.json({
      success: true,
      data: {
        id: payment.id,
        bookingId: payment.bookingId,
        amount: Number(payment.amount),
        status: payment.status,
        tapTransactionId: payment.tapTransactionId,
        tapChargeId: payment.tapChargeId,
        refundAmount: payment.refundAmount ? Number(payment.refundAmount) : null,
        refundReason: payment.refundReason,
        booking: payment.booking
          ? {
              id: payment.booking.id,
              bookingNumber: payment.booking.bookingNumber,
              customerId: payment.booking.customerId,
              totalPrice: Number(payment.booking.totalAmount),
              customer: payment.booking.customer,
            }
          : null,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
        createdBy: payment.createdBy,
        updatedBy: payment.updatedBy,
      },
    })
  } catch (error: any) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json(
        { error: error.message },
        { status: 403 }
      )
    }

    console.error('Get payment error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
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
    const policy = await PaymentPolicy.canUpdate(userId, params.id)
    if (!policy.allowed) {
      return NextResponse.json(
        { error: policy.reason || 'Forbidden' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const validated = updatePaymentSchema.parse(body)

    // Update payment status
    if (validated.status) {
      if (validated.status === 'SUCCESS') {
        // Process payment
        if (validated.tapTransactionId && validated.tapChargeId) {
          await PaymentService.process({
            paymentId: params.id,
            tapTransactionId: validated.tapTransactionId,
            tapChargeId: validated.tapChargeId,
            userId,
          })
        }
      } else if (validated.status === 'FAILED') {
        await PaymentService.markFailed(params.id, userId)
      }
    }

    const payment = await PaymentService.getById(params.id, userId)

    return NextResponse.json({
      success: true,
      data: {
        id: payment.id,
        bookingId: payment.bookingId,
        amount: Number(payment.amount),
        status: payment.status,
        tapTransactionId: payment.tapTransactionId,
        tapChargeId: payment.tapChargeId,
        refundAmount: payment.refundAmount ? Number(payment.refundAmount) : null,
        refundReason: payment.refundReason,
        booking: payment.booking
          ? {
              id: payment.booking.id,
              bookingNumber: payment.booking.bookingNumber,
              customerId: payment.booking.customerId,
              totalPrice: Number(payment.booking.totalAmount),
              customer: payment.booking.customer,
            }
          : null,
        createdAt: payment.createdAt,
        updatedAt: payment.updatedAt,
      },
      message: 'تم تحديث الدفع بنجاح',
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

    console.error('Update payment error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
