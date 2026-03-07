/**
 * @file api/invoices/[id]/route.ts
 * @description API route for invoice operations by ID
 * @module api/invoices
 * @author Engineering Team
 * @created 2026-01-28
 */

import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { InvoiceService } from '@/lib/services/invoice.service'
import { InvoicePolicy } from '@/lib/policies/invoice.policy'
import { updateInvoiceSchema } from '@/lib/validators/invoice.validator'
import { ValidationError, ForbiddenError } from '@/lib/errors'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const userId = session.user.id

    // Check policy
    const policy = await InvoicePolicy.canView(userId, id)
    if (!policy.allowed) {
      return NextResponse.json({ error: policy.reason || 'Forbidden' }, { status: 403 })
    }

    const invoice = await InvoiceService.getById(id, userId)

    return NextResponse.json({
      success: true,
      data: invoice,
    })
  } catch (error: any) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    console.error('Get invoice error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const userId = session.user.id

    // Check policy
    const policy = await InvoicePolicy.canUpdate(userId, id)
    if (!policy.allowed) {
      return NextResponse.json({ error: policy.reason || 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const validated = updateInvoiceSchema.parse(body)

    // Get audit context
    const headers = req.headers
    const auditContext = {
      ipAddress: headers.get('x-forwarded-for') || headers.get('x-real-ip') || undefined,
      userAgent: headers.get('user-agent') || undefined,
    }

    const invoice = await InvoiceService.update(id, validated, userId, auditContext)

    return NextResponse.json({
      success: true,
      data: invoice,
      message: 'تم تحديث الفاتورة بنجاح',
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

    console.error('Update invoice error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const userId = session.user.id

    // Check policy
    const policy = await InvoicePolicy.canDelete(userId, id)
    if (!policy.allowed) {
      return NextResponse.json({ error: policy.reason || 'Forbidden' }, { status: 403 })
    }

    // Get audit context
    const headers = req.headers
    const auditContext = {
      ipAddress: headers.get('x-forwarded-for') || headers.get('x-real-ip') || undefined,
      userAgent: headers.get('user-agent') || undefined,
    }

    await InvoiceService.delete(id, userId, auditContext)

    return NextResponse.json({
      success: true,
      message: 'تم حذف الفاتورة بنجاح',
    })
  } catch (error: any) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    console.error('Delete invoice error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
