/**
 * @file route.ts
 * @description Pre-import preview API — parses Excel file, runs column mapping,
 * and returns first N rows with resolved fields. No DB writes.
 * @module app/api/admin/imports/preview
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { rateLimitAPI } from '@/lib/utils/rate-limit'
import {
  mapColumns,
  type ColumnMapping,
  AI_FILLABLE_FIELDS,
} from '@/lib/services/column-mapper.service'

export const dynamic = 'force-dynamic'

const PREVIEW_ROWS = 5

interface PreviewRow {
  excelRowNumber: number
  rawData: Record<string, unknown>
  resolvedFields: Record<string, unknown>
  missingRequired: string[]
  willAiFill: string[]
}

interface SheetPreview {
  sheetName: string
  totalRows: number
  headers: string[]
  columnMappings: ColumnMapping[]
  unmappedHeaders: string[]
  previewRows: PreviewRow[]
}

/**
 * Resolve a field value from a row using column mappings (same logic as import-worker)
 */
function resolveField(
  row: Record<string, unknown>,
  fieldName: string,
  mappings: ColumnMapping[]
): unknown {
  const mapping = mappings.find((m) => m.mappedField === fieldName)
  if (!mapping) return undefined
  const exact = row[mapping.sourceHeader]
  if (exact !== undefined && exact !== null && String(exact).trim() !== '') return exact
  const target = mapping.sourceHeader.trim().toLowerCase()
  for (const key of Object.keys(row)) {
    if (key.trim().toLowerCase() === target) {
      const val = row[key]
      if (val !== undefined && val !== null && String(val).trim() !== '') return val
      break
    }
  }
  return undefined
}

const REQUIRED_FIELDS = ['name', 'daily_price']
const CORE_FIELDS = [
  'name',
  'brand',
  'model',
  'sku',
  'barcode',
  'daily_price',
  'weekly_price',
  'monthly_price',
  'deposit',
  'quantity',
  'condition',
  'warehouse_location',
  'short_description',
  'long_description',
  'seo_title',
  'seo_description',
  'seo_keywords',
  'featured_image',
  'gallery',
  'video',
  'specifications',
  'box_contents',
  'tags',
  'buffer_time',
  'buffer_time_unit',
]

export async function POST(request: NextRequest) {
  const rateLimit = rateLimitAPI(request)
  if (!rateLimit.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await hasPermission(session.user.id, PERMISSIONS.IMPORT_CREATE))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Missing file' }, { status: 400 })

    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
      'text/tab-separated-values',
      'application/csv',
    ]
    const ext = file.name?.toLowerCase().match(/\.[^.]+$/)?.[0] ?? ''
    const allowedByExt = ['.xlsx', '.xls', '.csv', '.tsv'].includes(ext)
    if (!allowed.includes(file.type) && !allowedByExt) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const { parseSpreadsheetBuffer } = await import('@/lib/utils/excel-parser')
    const wb = await parseSpreadsheetBuffer(buffer, file.name)

    const sheets: SheetPreview[] = []

    for (const sheetName of wb.sheetNames) {
      const data = wb.getSheetData(sheetName)

      if (data.length === 0) continue

      const headers = Object.keys(data[0])
      let columnMappings: ColumnMapping[] = []
      try {
        columnMappings = await mapColumns(headers, { useHistory: true })
      } catch {
        columnMappings = headers.map((h) => ({
          sourceHeader: h,
          mappedField: null,
          confidence: 0,
          method: 'skip' as const,
        }))
      }

      const unmappedHeaders = columnMappings
        .filter((m) => !m.mappedField || m.confidence < 50)
        .map((m) => m.sourceHeader)

      const aiFillableSet = new Set(
        AI_FILLABLE_FIELDS ?? [
          'short_description',
          'long_description',
          'seo_title',
          'seo_description',
          'seo_keywords',
          'specifications',
          'box_contents',
          'tags',
          'name_ar',
          'short_desc_ar',
          'long_desc_ar',
          'seo_title_ar',
          'seo_desc_ar',
          'seo_keywords_ar',
          'name_zh',
          'short_desc_zh',
          'long_desc_zh',
          'seo_title_zh',
          'seo_desc_zh',
          'seo_keywords_zh',
        ]
      )

      const previewRows: PreviewRow[] = []
      const previewSlice = data.slice(0, PREVIEW_ROWS)

      for (let i = 0; i < previewSlice.length; i++) {
        const row = previewSlice[i]
        const resolvedFields: Record<string, unknown> = {}
        const missingRequired: string[] = []
        const willAiFill: string[] = []

        for (const field of CORE_FIELDS) {
          const value = resolveField(row, field, columnMappings)
          if (value !== undefined) {
            resolvedFields[field] = value
          }
        }

        // Check required fields
        for (const req of REQUIRED_FIELDS) {
          if (!resolvedFields[req] || String(resolvedFields[req]).trim() === '') {
            missingRequired.push(req)
          }
        }

        // Check which fields AI will fill
        for (const aiField of aiFillableSet) {
          if (!resolvedFields[aiField] || String(resolvedFields[aiField]).trim() === '') {
            willAiFill.push(aiField)
          }
        }

        previewRows.push({
          excelRowNumber: i + 2,
          rawData: row,
          resolvedFields,
          missingRequired,
          willAiFill,
        })
      }

      sheets.push({
        sheetName,
        totalRows: data.length,
        headers,
        columnMappings,
        unmappedHeaders,
        previewRows,
      })
    }

    if (sheets.length === 0) {
      return NextResponse.json({ error: 'No data found in file' }, { status: 400 })
    }

    // Summary stats
    const totalRows = sheets.reduce((sum, s) => sum + s.totalRows, 0)
    const totalMapped = sheets.reduce(
      (sum, s) => sum + s.columnMappings.filter((m) => m.mappedField && m.confidence >= 50).length,
      0
    )
    const totalHeaders = sheets.reduce((sum, s) => sum + s.headers.length, 0)

    return NextResponse.json({
      filename: file.name,
      sheets,
      summary: {
        totalSheets: sheets.length,
        totalRows,
        mappedFieldsRatio: `${totalMapped}/${totalHeaders}`,
        previewRowCount: PREVIEW_ROWS,
      },
    })
  } catch (error: any) {
    console.error('Import preview failed', error)
    return NextResponse.json({ error: error.message || 'Preview failed' }, { status: 500 })
  }
}
