/**
 * @file api/reports/[type]/route.ts
 * @description API route for generating reports by type
 * @module api/reports
 * @author Engineering Team
 * @created 2026-01-28
 */

import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { ReportsService } from '@/lib/services/reports.service'
import { ReportsPolicy } from '@/lib/policies/reports.policy'
import { reportFilterSchema, reportTypeSchema } from '@/lib/validators/reports.validator'
import { ValidationError, ForbiddenError } from '@/lib/errors'

export async function POST(
  req: NextRequest,
  { params }: { params: { type: string } }
) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    // Validate report type
    const reportType = reportTypeSchema.parse(params.type)

    // Check policy
    const policy = await ReportsPolicy.canView(userId, reportType)
    if (!policy.allowed) {
      return NextResponse.json(
        { error: policy.reason || 'Forbidden' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const filter = reportFilterSchema.parse(body)

    // Generate report based on type
    let report: any

    switch (reportType) {
      case 'revenue':
        report = await ReportsService.generateRevenueReport(filter, userId)
        break
      case 'bookings':
        report = await ReportsService.generateBookingReport(filter, userId)
        break
      case 'equipment':
        report = await ReportsService.generateEquipmentReport(filter, userId)
        break
      case 'customers':
        report = await ReportsService.generateCustomerReport(filter, userId)
        break
      case 'financial':
        report = await ReportsService.generateFinancialReport(filter, userId)
        break
      case 'inventory':
        report = await ReportsService.generateInventoryReport(filter, userId)
        break
      default:
        return NextResponse.json(
          { error: 'نوع التقرير غير مدعوم' },
          { status: 400 }
        )
    }

    return NextResponse.json({
      success: true,
      data: report,
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

    console.error('Generate report error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
