/**
 * @file api/coupons/bulk/route.ts
 * @description API route for bulk generating unique randomized promotional coupon codes
 * @module api/coupons/bulk
 */

import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db/prisma'
import { CouponPolicy } from '@/lib/policies/coupon.policy'
import { AuditService } from '@/lib/services/audit.service'
import { Decimal } from '@prisma/client/runtime/library'

export const dynamic = 'force-dynamic'

function generateRandomCode(length: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    const policy = await CouponPolicy.canCreate(userId)
    if (!policy.allowed) {
      return NextResponse.json({ error: policy.reason || 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const {
      prefix = 'PROMO',
      count = 10,
      codeLength = 6,
      type = 'percent',
      value = 10,
      minPurchaseAmount,
      maxDiscountAmount,
      usageLimit = 1,
      validFrom,
      validUntil,
      description = 'منشأة عبر التوليد التلقائي | Auto-bulk generated',
      canCombineWithOtherOffers = true,
    } = body

    if (count <= 0 || count > 500) {
      return NextResponse.json({ error: 'العدد يجب أن يكون بين 1 و 500 | Count must be between 1 and 500' }, { status: 400 })
    }

    if (value <= 0) {
      return NextResponse.json({ error: 'قيمة الخصم غير صالحة | Invalid discount value' }, { status: 400 })
    }

    const fromDate = validFrom ? new Date(validFrom) : new Date()
    const untilDate = validUntil ? new Date(validUntil) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    const now = new Date()
    let initialStatus: 'ACTIVE' | 'SCHEDULED' | 'EXPIRED' = 'ACTIVE'
    if (fromDate > now) initialStatus = 'SCHEDULED'
    else if (untilDate < now) initialStatus = 'EXPIRED'

    const generatedCodes = new Set<string>()
    const couponsData: any[] = []

    const existing = await prisma.coupon.findMany({
      where: { deletedAt: null },
      select: { code: true }
    })
    const existingCodes = new Set(existing.map((c) => c.code))

    let attempts = 0
    const maxAttempts = count * 10

    while (generatedCodes.size < count && attempts < maxAttempts) {
      attempts++
      const randomSuffix = generateRandomCode(codeLength)
      const cleanPrefix = prefix.toUpperCase().replace(/[^A-Z0-9]/g, '').trim()
      const code = cleanPrefix ? `${cleanPrefix}-${randomSuffix}` : randomSuffix

      if (!existingCodes.has(code) && !generatedCodes.has(code)) {
        generatedCodes.add(code)
        
        couponsData.push({
          code,
          name: description,
          type: type === 'percent' ? 'PERCENT' : 'FIXED',
          discountValue: type === 'fixed' ? new Decimal(value) : null,
          discountPercentage: type === 'percent' ? new Decimal(value) : null,
          minimumAmount: minPurchaseAmount ? new Decimal(minPurchaseAmount) : null,
          maximumDiscount: maxDiscountAmount ? new Decimal(maxDiscountAmount) : null,
          validFrom: fromDate,
          validUntil: untilDate,
          usageLimit: usageLimit ?? null,
          usedCount: 0,
          status: initialStatus,
          description,
          canCombineWithOtherOffers,
          createdBy: userId,
        })
      }
    }

    if (generatedCodes.size < count) {
      return NextResponse.json({ error: 'حدثت تصادمات كثيرة في الكود، يرجى زيادة الطول أو تغيير البادئة' }, { status: 500 })
    }

    const createdCoupons = await prisma.$transaction(
      couponsData.map((data) => prisma.coupon.create({ data }))
    )

    await AuditService.log({
      action: 'coupon.bulk_created',
      userId,
      resourceType: 'coupon',
      resourceId: createdCoupons[0]?.id || 'bulk',
      ipAddress: req.headers.get('x-forwarded-for') || undefined,
      userAgent: req.headers.get('user-agent') || undefined,
      metadata: { prefix, count: createdCoupons.length, type, value },
    })

    return NextResponse.json({
      success: true,
      count: createdCoupons.length,
      data: createdCoupons.map((c) => ({
        id: c.id,
        code: c.code,
        status: c.status.toLowerCase(),
      })),
      message: `تم توليد ${createdCoupons.length} كوبون بنجاح ✅`
    })
  } catch (error: any) {
    console.error('Bulk generate coupons error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
