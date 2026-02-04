/**
 * @file api/reports/[type]/export/route.ts
 * @description API route for report export (PDF/Excel)
 * @module api/reports
 * @author Engineering Team
 * @created 2026-01-28
 */

import { auth } from '@/lib/auth'
import { NextRequest, NextResponse } from 'next/server'
import { ReportsService } from '@/lib/services/reports.service'
import { ReportsPolicy } from '@/lib/policies/reports.policy'
import { PdfService } from '@/lib/services/pdf.service'
import { reportFilterSchema, reportTypeSchema } from '@/lib/validators/reports.validator'
import { ValidationError, ForbiddenError } from '@/lib/errors'

/**
 * POST /api/reports/[type]/export
 * Body: { ...filter, format: 'pdf' | 'xlsx' }
 * Returns PDF or Excel file.
 */
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
    const reportType = reportTypeSchema.parse(params.type)
    const policy = await ReportsPolicy.canView(userId, reportType)
    if (!policy.allowed) {
      return NextResponse.json(
        { error: policy.reason || 'Forbidden' },
        { status: 403 }
      )
    }

    const body = await req.json()
    const format = body.format === 'xlsx' ? 'xlsx' : 'pdf'
    const { format: _f, ...filterBody } = body
    const filter = reportFilterSchema.parse(filterBody)

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

    let columns = report.columns ?? []
    let rows = report.rows ?? report.data ?? []
    const title = report.title ?? String(reportType)

    // Build table from revenue report when no columns/rows
    if (reportType === 'revenue' && (!columns.length || !rows.length)) {
      if (Array.isArray(report.revenueByPeriod) && report.revenueByPeriod.length > 0) {
        columns = [
          { key: 'period', label: 'Period' },
          { key: 'revenue', label: 'Revenue' },
          { key: 'bookings', label: 'Bookings' },
        ]
        rows = report.revenueByPeriod.map((r: { period: string; revenue: number; bookings: number }) => ({
          period: r.period,
          revenue: r.revenue,
          bookings: r.bookings,
        }))
      } else {
        columns = [{ key: 'metric', label: 'Metric' }, { key: 'value', label: 'Value' }]
        rows = [
          { metric: 'Total Revenue', value: report.totalRevenue ?? 0 },
          { metric: 'Total Bookings', value: report.totalBookings ?? 0 },
          { metric: 'Average Booking Value', value: report.averageBookingValue ?? 0 },
          { metric: 'VAT Amount', value: report.vatAmount ?? 0 },
          { metric: 'Net Revenue', value: report.netRevenue ?? 0 },
        ]
      }
    }

    if (format === 'xlsx') {
      const buffer = PdfService.generateReportExcelBuffer(
        title,
        columns.map((c: any) => ({ key: typeof c === 'string' ? c : c.key ?? c.id, label: typeof c === 'string' ? c : c.label ?? c.key ?? c.id })),
        Array.isArray(rows) ? rows : []
      )
      const filename = `report-${reportType}-${Date.now()}.xlsx`
      return new NextResponse(new Uint8Array(buffer), {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}"`,
          'Content-Length': String(buffer.length),
        },
      })
    }

    const normalizedColumns = columns.map((c: any) =>
      typeof c === 'string' ? { key: c, label: c } : { key: c.key ?? c.id, label: c.label ?? c.key ?? c.id }
    )
    const normalizedRows = Array.isArray(rows) ? rows : []
    const buffer = PdfService.generateReportPdfBuffer({
      title,
      columns: normalizedColumns,
      rows: normalizedRows,
      locale: 'en',
    })
    const filename = `report-${reportType}-${Date.now()}.pdf`
    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(buffer.length),
      },
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
    console.error('Report export error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
