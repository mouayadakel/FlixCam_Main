/**
 * @file route.ts
 * @description API endpoint for analyzing uploaded sheet
 * @module app/api/admin/imports/analyze
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { rateLimitAPI } from '@/lib/utils/rate-limit'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/imports/analyze
 * Analyze uploaded sheet for data quality and AI readiness
 */
export async function POST(request: NextRequest) {
  const rateLimit = rateLimitAPI(request)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'Missing file' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const { parseSpreadsheetBuffer } = await import('@/lib/utils/excel-parser')
    const wb = await parseSpreadsheetBuffer(buffer, file.name)

    const analysis = {
      sheets: [] as any[],
      summary: {
        totalSheets: wb.sheetNames.length,
        totalRows: 0,
        missingFields: [] as string[],
        aiFillableFields: [] as string[],
        estimatedCost: 0,
      },
    }

    // Analyze each sheet
    for (const sheetName of wb.sheetNames) {
      const data = wb.getSheetData(sheetName) as Record<string, any>[]
      const columns = data.length > 0 ? Object.keys(data[0]) : []

      // Check for common field names
      const hasName = columns.some((col) => /name|product|title|اسم/i.test(col))
      const hasDescription = columns.some((col) => /description|desc|وصف/i.test(col))
      const hasBrand = columns.some((col) => /brand|manufacturer|الماركة/i.test(col))
      const hasPrice = columns.some((col) => /price|pricing|سعر/i.test(col))
      const hasImage = columns.some((col) => /image|photo|img|صورة/i.test(col))
      const hasSEO = columns.some((col) => /seo|meta/i.test(col))

      // Count missing fields
      const missingFields: string[] = []
      if (!hasName) missingFields.push('Name')
      if (!hasDescription) missingFields.push('Description')
      if (!hasBrand) missingFields.push('Brand')
      if (!hasPrice) missingFields.push('Price')
      if (!hasSEO) missingFields.push('SEO fields')

      // AI fillable fields
      const aiFillableFields: string[] = []
      if (!hasSEO) aiFillableFields.push('SEO Title', 'SEO Description', 'SEO Keywords')
      if (hasName && !hasDescription) aiFillableFields.push('Description')
      // Translations are always AI fillable if we have English

      // Estimate cost (rough: $0.01 per product for AI processing)
      const estimatedCost = data.length * 0.01

      analysis.sheets.push({
        name: sheetName,
        rowCount: data.length,
        columns,
        dataQuality: {
          hasName,
          hasDescription,
          hasBrand,
          hasPrice,
          hasImage,
          hasSEO,
          completeness: Math.round(
            (((hasName ? 1 : 0) +
              (hasDescription ? 1 : 0) +
              (hasBrand ? 1 : 0) +
              (hasPrice ? 1 : 0) +
              (hasImage ? 1 : 0) +
              (hasSEO ? 1 : 0)) /
              6) *
              100
          ),
        },
        missingFields,
        aiFillableFields,
        estimatedCost,
      })

      analysis.summary.totalRows += data.length
      analysis.summary.missingFields.push(...missingFields)
      analysis.summary.estimatedCost += estimatedCost
    }

    // Deduplicate missing fields
    analysis.summary.missingFields = [...new Set(analysis.summary.missingFields)]
    analysis.summary.aiFillableFields = [
      'SEO Title',
      'SEO Description',
      'SEO Keywords',
      'Arabic Translation',
      'Chinese Translation',
    ]

    return NextResponse.json(analysis)
  } catch (error: any) {
    console.error('Sheet analysis failed:', error)
    return NextResponse.json({ error: error.message || 'Failed to analyze sheet' }, { status: 500 })
  }
}
