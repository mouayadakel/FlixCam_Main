/**
 * @file api/coupons/route.ts
 * @description API route for coupons (list and create)
 * @module api/coupons
 * @author Engineering Team
 * @created 2026-01-28
 */

import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { CouponService } from '@/lib/services/coupon.service'
import { CouponPolicy } from '@/lib/policies/coupon.policy'
import { createCouponSchema, couponFilterSchema } from '@/lib/validators/coupon.validator'
import { ValidationError, ForbiddenError } from '@/lib/errors'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Check policy
    const policy = await CouponPolicy.canView(userId)
    if (!policy.allowed) {
      return NextResponse.json({ error: policy.reason || 'Forbidden' }, { status: 403 })
    }

    // Parse query params
    const { searchParams } = new URL(req.url)
    const filters: any = {}

    if (searchParams.get('status')) {
      filters.status = searchParams.get('status')
    }

    if (searchParams.get('type')) {
      filters.type = searchParams.get('type')
    }

    if (searchParams.get('search')) {
      filters.search = searchParams.get('search')
    }

    if (searchParams.get('dateFrom')) {
      filters.dateFrom = new Date(searchParams.get('dateFrom')!)
    }

    if (searchParams.get('dateTo')) {
      filters.dateTo = new Date(searchParams.get('dateTo')!)
    }

    if (searchParams.get('active') === 'true') {
      filters.active = true
    } else if (searchParams.get('active') === 'false') {
      filters.active = false
    }

    if (searchParams.get('page')) {
      filters.page = parseInt(searchParams.get('page')!)
    }

    if (searchParams.get('pageSize')) {
      filters.pageSize = parseInt(searchParams.get('pageSize')!)
    }

    // Validate filters
    const validated = couponFilterSchema.parse(filters)

    const result = await CouponService.list(userId, validated)

    return NextResponse.json({
      success: true,
      data: result.coupons,
      total: result.total,
      page: result.page,
      pageSize: result.pageSize,
    })
  } catch (error: any) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    if (error.name === 'ZodError') {
      return NextResponse.json(
        { error: 'بيانات غير صالحة', details: error.errors },
        { status: 400 }
      )
    }

    console.error('List coupons error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Check policy
    const policy = await CouponPolicy.canCreate(userId)
    if (!policy.allowed) {
      return NextResponse.json({ error: policy.reason || 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const validated = createCouponSchema.parse(body)

    // Get audit context
    const headers = req.headers
    const auditContext = {
      ipAddress: headers.get('x-forwarded-for') || headers.get('x-real-ip') || undefined,
      userAgent: headers.get('user-agent') || undefined,
    }

    const coupon = await CouponService.create(validated, userId, auditContext)

    return NextResponse.json({
      success: true,
      data: coupon,
      message: 'تم إنشاء الكوبون بنجاح',
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

    console.error('Create coupon error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
