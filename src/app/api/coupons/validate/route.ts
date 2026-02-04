/**
 * @file api/coupons/validate/route.ts
 * @description API route for validating coupons
 * @module api/coupons
 * @author Engineering Team
 * @created 2026-01-28
 */

import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { CouponService } from '@/lib/services/coupon.service'
import { validateCouponSchema } from '@/lib/validators/coupon.validator'
import { ValidationError } from '@/lib/errors'

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const validated = validateCouponSchema.parse(body)

    const result = await CouponService.validate(
      validated.code,
      validated.amount,
      validated.equipmentIds,
      session.user.id
    )

    return NextResponse.json({
      success: result.valid,
      data: result,
    })
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'بيانات غير صالحة', details: error.errors },
        { status: 400 }
      )
    }

    console.error('Validate coupon error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
