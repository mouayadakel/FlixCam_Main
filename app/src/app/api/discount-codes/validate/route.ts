/**
 * @file route.ts
 * @description POST endpoint for validating discount/promo codes
 * @module app/api/discount-codes/validate
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
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
 * Validates a discount code and returns the calculated discount amount.
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

    const { code, bookingTotal, userId } = parsed.data
    const now = new Date()

    const discountCode = await prisma.discountCode.findFirst({
      where: {
        code: code.toUpperCase(),
        isActive: true,
        deletedAt: null,
      },
    })

    if (!discountCode) {
      return NextResponse.json({ valid: false, error: 'Invalid discount code' })
    }

    if (discountCode.validFrom > now) {
      return NextResponse.json({ valid: false, error: 'This code is not yet active' })
    }

    if (discountCode.validUntil && discountCode.validUntil < now) {
      return NextResponse.json({ valid: false, error: 'This code has expired' })
    }

    if (
      discountCode.usageLimit !== null &&
      discountCode.timesUsed >= discountCode.usageLimit
    ) {
      return NextResponse.json({ valid: false, error: 'This code has reached its usage limit' })
    }

    if (userId && discountCode.usageLimitPerUser !== null) {
      const userUsageCount = await prisma.discountCodeUsage.count({
        where: {
          discountCodeId: discountCode.id,
          userId,
        },
      })

      if (userUsageCount >= discountCode.usageLimitPerUser) {
        return NextResponse.json({
          valid: false,
          error: 'You have already used this code the maximum number of times',
        })
      }
    }

    if (
      discountCode.minOrderAmount !== null &&
      bookingTotal < discountCode.minOrderAmount
    ) {
      return NextResponse.json({
        valid: false,
        error: `Minimum order amount of ${discountCode.minOrderAmount} SAR required`,
      })
    }

    let discountAmount: number

    if (discountCode.type === 'PERCENTAGE') {
      const raw = (bookingTotal * discountCode.value) / 100
      discountAmount =
        discountCode.maxDiscountAmount !== null
          ? Math.min(raw, discountCode.maxDiscountAmount)
          : raw
    } else {
      discountAmount = Math.min(discountCode.value, bookingTotal)
    }

    discountAmount = Math.round(discountAmount * 100) / 100

    const message =
      discountCode.type === 'PERCENTAGE'
        ? `${discountCode.value}% discount applied`
        : `${discountCode.value} SAR discount applied`

    return NextResponse.json({
      valid: true,
      discountAmount,
      message,
      codeId: discountCode.id,
    })
  } catch (error) {
    logger.error('Discount code validation failed', { error })
    return NextResponse.json(
      { valid: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
