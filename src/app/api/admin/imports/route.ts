import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { rateLimitAPI } from '@/lib/utils/rate-limit'
import { ImportService } from '@/lib/services/import.service'
import { addImportJob } from '@/lib/queue/import.queue'
import { prisma } from '@/lib/db/prisma'
import { Prisma } from '@prisma/client'
import * as XLSX from 'xlsx'

export const dynamic = 'force-dynamic'

const NAME_KEYS = ['Name', 'name', 'Product Name', 'Product', 'اسم']

const getRowNameValue = (row: Record<string, any>) => {
  for (const key of NAME_KEYS) {
    const value = row[key]
    if (value !== undefined && value !== null) {
      const normalized = String(value).trim()
      if (normalized) return normalized
    }
  }
  return ''
}

const getExcelRowNumber = (row: Record<string, any>, fallback: number) => {
  return (row?.rowNumber as number | undefined) ??
    (row?.__rowNum__ as number | undefined) ??
    fallback
}

// POST /api/admin/imports/excel
// form-data: file (xlsx/csv), mapping (json string [{sheetName, categoryId, subCategoryId}])
export async function POST(request: NextRequest) {
  const rateLimit = rateLimitAPI(request)
  if (!rateLimit.allowed) return NextResponse.json({ error: 'Too many requests' }, { status: 429 })

  const session = await auth()
  if (!session?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await hasPermission(session.user.id, PERMISSIONS.IMPORT_CREATE))) {
    return NextResponse.json({ error: 'Forbidden - import.create required' }, { status: 403 })
  }

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const mappingRaw = formData.get('mapping') as string | null
    const rowsRaw = formData.get('rows') as string | null
    const selectedSheetsRaw = formData.get('selectedSheets') as string | null
    const selectedRowsRaw = formData.get('selectedRows') as string | null

    if (!file) return NextResponse.json({ error: 'Missing file' }, { status: 400 })

    const allowed = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ]
    if (!allowed.includes(file.type)) {
      return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 })
    }

    const mapping: Array<{ sheetName: string; categoryId: string; subCategoryId?: string | null }> = mappingRaw
      ? JSON.parse(mappingRaw)
      : []
    const selectedSheets: string[] | undefined = selectedSheetsRaw ? JSON.parse(selectedSheetsRaw) : undefined
    const selectedRows: Record<string, number[]> | undefined = selectedRowsRaw ? JSON.parse(selectedRowsRaw) : undefined

    const buffer = Buffer.from(await file.arrayBuffer())
    const wb = XLSX.read(buffer, { type: 'buffer' })

    const job = await ImportService.createJob({
      filename: file.name,
      mimeType: file.type,
      createdBy: session.user.id,
    })

    const rowsToInsert: Array<{ rowNumber: number; payload: any }> = []
    let totalRows = 0
    const MAX_ROWS = 5000
    const skippedRowsBySheet: Record<string, number[]> = {}

    if (rowsRaw) {
      const parsed = JSON.parse(rowsRaw) as { sheetName: string; rows: Record<string, any>[] }
      const mapEntry = mapping.find((m) => m.sheetName === parsed.sheetName)
      parsed.rows.slice(0, MAX_ROWS).forEach((row, index) => {
        const excelRowNumber = getExcelRowNumber(row, index + 1)
        const productName = getRowNameValue(row)
        if (!productName) {
          skippedRowsBySheet[parsed.sheetName] = [
            ...(skippedRowsBySheet[parsed.sheetName] ?? []),
            excelRowNumber,
          ]
          return
        }
        rowsToInsert.push({
          rowNumber: totalRows + 1,
          payload: {
            sheetName: parsed.sheetName,
            categoryId: mapEntry?.categoryId || null,
            subCategoryId: mapEntry?.subCategoryId || null,
            excelRowNumber,
            row,
          },
        })
        totalRows += 1
      })
    } else {
      const mappedSheets = new Set(mapping.map((m) => m.sheetName))

      wb.SheetNames.forEach((sheetName) => {
        if (totalRows >= MAX_ROWS) return
        // Filter by selectedSheets if provided
        if (selectedSheets && selectedSheets.length > 0 && !selectedSheets.includes(sheetName)) return
        if (mappedSheets.size > 0 && !mappedSheets.has(sheetName)) return
        
        const sheet = wb.Sheets[sheetName]
        if (!sheet) return
        
        const data = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, {
          defval: null,
          raw: false,
        })
        const mapEntry = mapping.find((m) => m.sheetName === sheetName)
        
        const sheetSelectedRows = selectedRows?.[sheetName] || []
        const hasRowSelection = sheetSelectedRows.length > 0

        data.forEach((row, index) => {
          if (totalRows >= MAX_ROWS) return
          const excelRowNumber = index + 2
          if (hasRowSelection && !sheetSelectedRows.includes(excelRowNumber)) return
          const productName = getRowNameValue(row)
          if (!productName) {
            skippedRowsBySheet[sheetName] = [
              ...(skippedRowsBySheet[sheetName] ?? []),
              excelRowNumber,
            ]
            return
          }
          rowsToInsert.push({
            rowNumber: totalRows + 1,
            payload: {
              sheetName,
              categoryId: mapEntry?.categoryId || null,
              subCategoryId: mapEntry?.subCategoryId || null,
              excelRowNumber,
              row,
            },
          })
          totalRows += 1
        })
      })
    }

    if (rowsToInsert.length === 0) {
      return NextResponse.json({ error: 'No rows found in file' }, { status: 400 })
    }

    await ImportService.appendRows(job.id, rowsToInsert)

    // Update job with selected sheets/rows for reference
    await prisma.importJob.update({
      where: { id: job.id },
      data: {
        selectedSheets: selectedSheets != null ? selectedSheets : Prisma.JsonNull,
        selectedRows: selectedRows != null ? selectedRows : Prisma.JsonNull,
      },
    })

    // Add job to queue for background processing
    await addImportJob(job.id, {
      fileBuffer: buffer,
      mapping,
      selectedSheets,
      selectedRows,
    })

    const skippedRowsCount = Object.values(skippedRowsBySheet).reduce((sum, rows) => sum + rows.length, 0)
    return NextResponse.json(
      { jobId: job.id, totalRows, skippedRowsCount, skippedRowsBySheet },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Import upload failed', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
