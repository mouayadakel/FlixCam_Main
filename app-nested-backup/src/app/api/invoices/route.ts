/**
 * @file api/invoices/route.ts
 * @description API route for invoices (list and create)
 * @module api/invoices
 * @author Engineering Team
 * @created 2026-01-28
 */

import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { InvoiceService } from '@/lib/services/invoice.service'
import { InvoicePolicy } from '@/lib/policies/invoice.policy'
import { createInvoiceSchema, invoiceFilterSchema } from '@/lib/validators/invoice.validator'
import { ValidationError, ForbiddenError } from '@/lib/errors'

export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Check policy
    const policy = await InvoicePolicy.canView(userId)
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

    if (searchParams.get('customerId')) {
      filters.customerId = searchParams.get('customerId')
    }

    if (searchParams.get('bookingId')) {
      filters.bookingId = searchParams.get('bookingId')
    }

    if (searchParams.get('dateFrom')) {
      filters.dateFrom = new Date(searchParams.get('dateFrom')!)
    }

    if (searchParams.get('dateTo')) {
      filters.dateTo = new Date(searchParams.get('dateTo')!)
    }

    if (searchParams.get('overdue') === 'true') {
      filters.overdue = true
    }

    if (searchParams.get('page')) {
      filters.page = parseInt(searchParams.get('page')!)
    }

    if (searchParams.get('pageSize')) {
      filters.pageSize = parseInt(searchParams.get('pageSize')!)
    }

    // Validate filters
    const validated = invoiceFilterSchema.parse(filters)

    const result = await InvoiceService.list(userId, validated)

    return NextResponse.json({
      success: true,
      data: result.invoices,
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

    console.error('List invoices error:', error)
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
    const policy = await InvoicePolicy.canCreate(userId)
    if (!policy.allowed) {
      return NextResponse.json({ error: policy.reason || 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const validated = createInvoiceSchema.parse(body)

    // Get audit context
    const headers = req.headers
    const auditContext = {
      ipAddress: headers.get('x-forwarded-for') || headers.get('x-real-ip') || undefined,
      userAgent: headers.get('user-agent') || undefined,
    }

    const invoice = await InvoiceService.create(validated, userId, auditContext)

    return NextResponse.json({
      success: true,
      data: invoice,
      message: 'تم إنشاء الفاتورة بنجاح',
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

    console.error('Create invoice error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
