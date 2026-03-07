import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions'
import { rateLimitAPI } from '@/lib/utils/rate-limit'
import { prisma } from '@/lib/db/prisma'
import { Prisma } from '@prisma/client'
import { getRowNameValue } from '@/lib/services/import-validation.service'

export const dynamic = 'force-dynamic'

const getExcelRowNumber = (row: Record<string, any>, fallback: number) => {
  return (
    (row?.rowNumber as number | undefined) ?? (row?.__rowNum__ as number | undefined) ?? fallback
  )
}

// POST /api/admin/imports/excel
// form-data: file (xlsx/csv), mapping (json string [{sheetName, categoryId, subCategoryId}])
export const maxDuration = 120 // Allow long-running imports (up to 2 min)

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
    const approvedSuggestionsRaw = formData.get('approvedSuggestions') as string | null

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
      return NextResponse.json(
        { error: 'Unsupported file type. Use .xlsx, .xls, .csv or .tsv' },
        { status: 400 }
      )
    }

    const mapping: Array<{ sheetName: string; categoryId: string; subCategoryId?: string | null }> =
      mappingRaw ? JSON.parse(mappingRaw) : []
    const selectedSheets: string[] | undefined = selectedSheetsRaw
      ? JSON.parse(selectedSheetsRaw)
      : undefined
    const selectedRows: Record<string, number[]> | undefined = selectedRowsRaw
      ? JSON.parse(selectedRowsRaw)
      : undefined
    const approvedSuggestions: Array<{
      sheetName: string
      excelRowNumber: number
      aiSuggestions: {
        translations?: Record<
          string,
          { name: string; shortDescription: string; longDescription: string }
        >
        seo?: { metaTitle: string; metaDescription: string; metaKeywords: string }
        seoByLocale?: {
          ar?: { metaTitle: string; metaDescription: string; metaKeywords: string }
          zh?: { metaTitle: string; metaDescription: string; metaKeywords: string }
        }
        specifications?: Record<string, unknown>
        boxContents?: string
        tags?: string
        confidence?: number
      }
    }> = approvedSuggestionsRaw ? JSON.parse(approvedSuggestionsRaw) : []

    // Ensure every selected sheet has a category (otherwise every row fails with "Category mapping missing")
    const sheetsNeedingCategory = (
      selectedSheets && selectedSheets.length > 0 ? selectedSheets : mapping.map((m) => m.sheetName)
    ).filter((sheetName) => !mapping.find((m) => m.sheetName === sheetName)?.categoryId?.trim())
    if (sheetsNeedingCategory.length > 0) {
      return NextResponse.json(
        {
          error:
            'Each sheet must have a category selected. Select a category for: ' +
            sheetsNeedingCategory.join(', '),
        },
        { status: 400 }
      )
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const { parseSpreadsheetBuffer } = await import('@/lib/utils/excel-parser')
    const wb = await parseSpreadsheetBuffer(buffer, file.name)

    const { ImportService } = await import('@/lib/services/import.service')
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

      wb.sheetNames.forEach((sheetName) => {
        if (totalRows >= MAX_ROWS) return
        // Filter by selectedSheets if provided
        if (selectedSheets && selectedSheets.length > 0 && !selectedSheets.includes(sheetName))
          return
        if (mappedSheets.size > 0 && !mappedSheets.has(sheetName)) return

        const data = wb.getSheetData(sheetName) as Record<string, any>[]
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

    const skippedRowsCount = Object.values(skippedRowsBySheet).reduce(
      (sum, rows) => sum + rows.length,
      0
    )

    // Try queue first; if Redis/worker unavailable, process synchronously so import still works
    // Note: Rows are stored in DB (ImportJobRow); worker reads from DB, not from queue payload
    try {
      const { addImportJob } = await import('@/lib/queue/import.queue')
      await addImportJob(job.id, {
        mapping,
        selectedSheets,
        selectedRows,
        approvedSuggestions,
      })
    } catch (queueErr: any) {
      console.warn('Import queue unavailable, processing synchronously:', queueErr?.message)
      try {
        const { processImportJob } = await import('@/lib/services/import-worker')
        await processImportJob(job.id, { approvedSuggestions })
      } catch (syncErr: any) {
        console.error('Sync import failed:', syncErr)
        return NextResponse.json(
          {
            error:
              'Import job created but processing failed. The server processes imports automatically; if this persists, check server logs and database connectivity.',
          },
          { status: 500 }
        )
      }
    }

    return NextResponse.json(
      { jobId: job.id, totalRows, skippedRowsCount, skippedRowsBySheet },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Import upload failed', error)
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 })
  }
}
