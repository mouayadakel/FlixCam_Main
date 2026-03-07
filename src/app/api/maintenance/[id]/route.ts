/**
 * @file api/maintenance/[id]/route.ts
 * @description API route for maintenance operations by ID
 * @module api/maintenance
 * @author Engineering Team
 * @created 2026-01-28
 */

import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { MaintenanceService } from '@/lib/services/maintenance.service'
import { MaintenancePolicy } from '@/lib/policies/maintenance.policy'
import { updateMaintenanceSchema } from '@/lib/validators/maintenance.validator'
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
    const policy = await MaintenancePolicy.canView(userId, id)
    if (!policy.allowed) {
      return NextResponse.json({ error: policy.reason || 'Forbidden' }, { status: 403 })
    }

    const maintenance = await MaintenanceService.getById(id, userId)

    return NextResponse.json({
      success: true,
      data: maintenance,
    })
  } catch (error: any) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    console.error('Get maintenance error:', error)
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
    const policy = await MaintenancePolicy.canUpdate(userId, id)
    if (!policy.allowed) {
      return NextResponse.json({ error: policy.reason || 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const validated = updateMaintenanceSchema.parse(body)

    // Get audit context
    const headers = req.headers
    const auditContext = {
      ipAddress: headers.get('x-forwarded-for') || headers.get('x-real-ip') || undefined,
      userAgent: headers.get('user-agent') || undefined,
    }

    const maintenance = await MaintenanceService.update(id, validated, userId, auditContext)

    return NextResponse.json({
      success: true,
      data: maintenance,
      message: 'تم تحديث طلب الصيانة بنجاح',
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

    console.error('Update maintenance error:', error)
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
    const policy = await MaintenancePolicy.canDelete(userId, id)
    if (!policy.allowed) {
      return NextResponse.json({ error: policy.reason || 'Forbidden' }, { status: 403 })
    }

    // Get audit context
    const headers = req.headers
    const auditContext = {
      ipAddress: headers.get('x-forwarded-for') || headers.get('x-real-ip') || undefined,
      userAgent: headers.get('user-agent') || undefined,
    }

    await MaintenanceService.delete(id, userId, auditContext)

    return NextResponse.json({
      success: true,
      message: 'تم حذف طلب الصيانة بنجاح',
    })
  } catch (error: any) {
    if (error instanceof ForbiddenError) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    console.error('Delete maintenance error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  }
}
