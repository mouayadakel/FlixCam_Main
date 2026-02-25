/**
 * @file api/invoices/generate/[bookingId]/route.ts
 * @description API route for generating invoice from booking
 * @module api/invoices
 * @author Engineering Team
 * @created 2026-01-28
 */

import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { InvoiceService } from '@/lib/services/invoice.service'
import { InvoicePolicy } from '@/lib/policies/invoice.policy'
import { ValidationError, ForbiddenError } from '@/lib/errors'

export async function POST(req: NextRequest, { params }: { params: Promise<{ bookingId: string }> }) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { bookingId } = await params
    const userId = session.user.id

    // Check policy
    const policy = await InvoicePolicy.canCreate(userId)
    if (!policy.allowed) {
      return NextResponse.json({ error: policy.reason || 'Forbidden' }, { status: 403 })
    }

    // Get audit context
    const headers = req.headers
    const auditContext = {
      ipAddress: headers.get('x-forwarded-for') || headers.get('x-real-ip') || undefined,
      userAgent: headers.get('user-agent') || undefined,
    }

    const invoice = await InvoiceService.generateFromBooking(bookingId, userId, auditContext)

    return NextResponse.json({
      success: true,
      data: invoice,
      message: 'تم إنشاء الفاتورة من الحجز بنجاح',
    })
  } catch (error: any) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    console.error('Generate invoice error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
