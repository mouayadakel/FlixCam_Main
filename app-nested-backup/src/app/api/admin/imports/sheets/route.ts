/**
 * @file route.ts
 * @description API endpoint for parsing Excel/CSV files and returning sheet metadata
 * @module app/api/admin/imports/sheets
 */

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { rateLimitAPI } from '@/lib/utils/rate-limit'

export const dynamic = 'force-dynamic'
export const maxDuration = 60 // Allow up to 1 min for large file parsing

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const MAX_ROWS = 5000

/**
 * POST /api/admin/imports/sheets
 * Parse file and return sheet metadata
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

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit` },
        { status: 413 }
      )
    }

    // Validate MIME type (browsers sometimes send empty type for .xlsx)
    const allowedMimeTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
      'application/csv',
      'text/csv', // .csv
      'text/tab-separated-values', // .tsv
    ]
    const ext = file.name?.toLowerCase().match(/\.[^.]+$/)?.[0] ?? ''
    const allowedByExt = ['.xlsx', '.xls', '.csv', '.tsv'].includes(ext)
    const allowedByType = file.type && allowedMimeTypes.includes(file.type)

    if (!allowedByType && !allowedByExt) {
      return NextResponse.json(
        { error: 'Unsupported file type. Use .xlsx, .xls, .csv or .tsv' },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const { parseSpreadsheetBuffer } = await import('@/lib/utils/excel-parser')
    const wb = await parseSpreadsheetBuffer(buffer, file.name)

    if (wb.sheetNames.length === 0) {
      return NextResponse.json({ error: 'File contains no sheets' }, { status: 400 })
    }

    // Extract metadata for each sheet
    const sheetsMetadata = wb.sheetNames.map((sheetName) => {
      const data = wb.getSheetData(sheetName) as Record<string, any>[]
      const rowCount = data.length

      // Get column names (from first row)
      const columns = data.length > 0 ? Object.keys(data[0]) : []

      // Get first 10 rows for preview and include Excel row numbers
      // Excel row 1 is header, so data rows start at row 2
      const previewRows = data.slice(0, 10).map((row, index) => {
        const rowNumber = index + 2 // Excel row number (row 1 = header, row 2 = first data row)
        return {
          ...row,
          rowNumber,
        }
      })

      // Check if exceeds max rows
      if (rowCount > MAX_ROWS) {
        return {
          name: sheetName,
          rowCount,
          columns,
          previewRows,
          exceedsMaxRows: true,
          maxRows: MAX_ROWS,
        }
      }

      return {
        name: sheetName,
        rowCount,
        columns,
        previewRows,
        exceedsMaxRows: false,
      }
    })

    // Check total rows across all sheets
    const totalRows = sheetsMetadata.reduce((sum, sheet) => sum + (sheet?.rowCount || 0), 0)
    if (totalRows > MAX_ROWS) {
      return NextResponse.json(
        {
          error: `Total rows (${totalRows}) exceeds maximum (${MAX_ROWS})`,
          sheets: sheetsMetadata,
        },
        { status: 413 }
      )
    }

    return NextResponse.json({
      filename: file.name,
      fileSize: file.size,
      mimeType: file.type,
      totalSheets: wb.sheetNames.length,
      totalRows,
      sheets: sheetsMetadata,
    })
  } catch (error: any) {
    console.error('Sheet parsing failed:', error)
    return NextResponse.json({ error: error.message || 'Failed to parse file' }, { status: 500 })
  }
}
