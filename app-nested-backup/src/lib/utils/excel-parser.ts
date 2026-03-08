/**
 * @file excel-parser.ts
 * @description Secure Excel/CSV parser using exceljs (replaces vulnerable xlsx)
 * @module lib/utils/excel-parser
 */

import ExcelJS from 'exceljs'

export interface SheetData {
  name: string
  rows: Record<string, unknown>[]
  rowCount: number
  columns: string[]
}

/**
 * Parse Excel buffer to sheet data (xlsx only - use parseCsvForBuffer for csv/tsv)
 */
export async function parseExcelBuffer(buffer: Buffer | Uint8Array): Promise<{
  sheetNames: string[]
  getSheetData: (sheetName: string) => Record<string, unknown>[]
  sheets: Record<string, Record<string, unknown>[]>
}> {
  const workbook = new ExcelJS.Workbook()
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer)
  await workbook.xlsx.load(buf as unknown as Parameters<ExcelJS.Workbook['xlsx']['load']>[0])

  const sheets: Record<string, Record<string, unknown>[]> = {}
  const sheetNames: string[] = []

  for (const worksheet of workbook.worksheets) {
    if (!worksheet.name) continue
    sheetNames.push(worksheet.name)

    const rows: Record<string, unknown>[] = []
    let headers: string[] = []

    const seenHeaders = new Set<string>()
    worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      const values = row.values as (unknown | undefined)[]
      if (!values || values.length === 0) return

      const rowData = values.slice(1) as unknown[]

      if (rowNumber === 1) {
        headers = rowData.map((v, i) => {
          let h = String(v ?? '').trim() || `Column${i + 1}`
          if (seenHeaders.has(h)) {
            let suffix = 1
            while (seenHeaders.has(`${h}_${suffix}`)) suffix++
            h = `${h}_${suffix}`
          }
          seenHeaders.add(h)
          return h
        })
        return
      }

      const obj: Record<string, unknown> = {}
      headers.forEach((h, i) => {
        obj[h] = rowData[i] ?? null
      })
      rows.push(obj)
    })

    sheets[worksheet.name] = rows
  }

  return {
    sheetNames,
    getSheetData: (name) => sheets[name] ?? [],
    sheets,
  }
}

/**
 * Parse CSV/TSV buffer to sheet-like structure (single "sheet")
 */
export function parseCsvBuffer(buffer: Buffer | Uint8Array, delimiter: ',' | '\t' = ','): Record<string, unknown>[] {
  const buf = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer)
  const text = buf.toString('utf-8')
  const lines = text.split(/\r?\n/).filter((l) => l.trim())
  if (lines.length === 0) return []

  const headers = lines[0].split(delimiter).map((h) => h.trim().replace(/^["']|["']$/g, ''))
  const rows: Record<string, unknown>[] = []

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i], delimiter)
    const obj: Record<string, unknown> = {}
    headers.forEach((h, idx) => {
      obj[h] = values[idx] ?? null
    })
    rows.push(obj)
  }

  return rows
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const result: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      inQuotes = !inQuotes
    } else if (!inQuotes && c === delimiter) {
      result.push(current.trim())
      current = ''
    } else {
      current += c
    }
  }
  result.push(current.trim())
  return result
}

/**
 * Parse buffer based on extension - returns unified structure for xlsx, csv, tsv
 */
export async function parseSpreadsheetBuffer(
  buffer: Buffer,
  filename: string
): Promise<{
  sheetNames: string[]
  getSheetData: (sheetName: string) => Record<string, unknown>[]
  sheets: Record<string, Record<string, unknown>[]>
}> {
  const ext = filename?.toLowerCase().match(/\.[^.]+$/)?.[0] ?? ''

  if (ext === '.csv') {
    const rows = parseCsvBuffer(buffer, ',')
    const sheetName = 'Sheet1'
    return {
      sheetNames: [sheetName],
      getSheetData: () => rows,
      sheets: { [sheetName]: rows },
    }
  }

  if (ext === '.tsv') {
    const rows = parseCsvBuffer(buffer, '\t')
    const sheetName = 'Sheet1'
    return {
      sheetNames: [sheetName],
      getSheetData: () => rows,
      sheets: { [sheetName]: rows },
    }
  }

  if (ext === '.xlsx') {
    return await parseExcelBuffer(buffer)
  }

  if (ext === '.xls') {
    throw new Error('Legacy .xls format not supported. Please convert to .xlsx')
  }

  throw new Error(`Unsupported file type: ${ext}. Use .xlsx, .csv or .tsv`)
}
