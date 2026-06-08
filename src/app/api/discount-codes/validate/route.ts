/**
 * @file route.ts
 * @description POST endpoint for validating promo codes (Coupon model)
 * @module app/api/discount-codes/validate
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { CouponStatus, CouponType } from '@prisma/client'
import { Decimal } from '@prisma/client/runtime/library'
import { prisma } from '@/lib/db/prisma'
import { logger } from '@/lib/logger'
import { checkRateLimitUpstash } from '@/lib/utils/rate-limit-upstash'

const validateCodeSchema = z.object({
  code: z.string().min(1, 'Code is required').max(50),
  bookingTotal: z.number().positive('Booking total must be positive'),
  userId: z.string().optional(),
})

/**
 * POST /api/discount-codes/validate
 * Validates a coupon code and returns the calculated discount amount.
 */
export async function POST(request: NextRequest) {
  try {
    const { allowed } = await checkRateLimitUpstash(request, 'public')
    if (!allowed) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.' },
        { status: 429 }
      )
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const parsed = validateCodeSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { valid: false, error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const { code, bookingTotal } = parsed.data
    const now = new Date()

    const coupon = await prisma.coupon.findFirst({
      where: {
        code: code.toUpperCase(),
        deletedAt: null,
        status: CouponStatus.ACTIVE,
        validFrom: { lte: now },
        validUntil: { gte: now },
      },
    })

    if (!coupon) {
      return NextResponse.json({ valid: false, error: 'Invalid discount code' })
    }

    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      return NextResponse.json({ valid: false, error: 'This code has reached its usage limit' })
    }

    if (coupon.minimumAmount !== null && new Decimal(bookingTotal).lt(coupon.minimumAmount)) {
      const minStr = coupon.minimumAmount.toString()
      return NextResponse.json({
        valid: false,
        error: `Minimum order amount of ${minStr} SAR required`,
      })
    }

    let discountAmountDecimal: Decimal
    if (coupon.type === CouponType.PERCENT) {
      const pct = coupon.discountPercentage ?? new Decimal(0)
      discountAmountDecimal = new Decimal(bookingTotal).times(pct).dividedBy(100)
    } else {
      discountAmountDecimal = coupon.discountValue ?? new Decimal(0)
    }

    if (coupon.maximumDiscount !== null && discountAmountDecimal.gt(coupon.maximumDiscount)) {
      discountAmountDecimal = coupon.maximumDiscount
    }

    if (discountAmountDecimal.gt(bookingTotal)) {
      discountAmountDecimal = new Decimal(bookingTotal)
    }

    const discountAmount = discountAmountDecimal.toDecimalPlaces(2).toNumber()
    const message =
      coupon.type === CouponType.PERCENT
        ? `${coupon.discountPercentage?.toString() ?? ''}% discount applied`
        : `${coupon.discountValue?.toString() ?? ''} SAR discount applied`

    return NextResponse.json({
      valid: true,
      discountAmount,
      message,
      codeId: coupon.id,
    })
  } catch (error) {
    logger.error('Discount code validation failed', { error })
    return NextResponse.json(
      { valid: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
