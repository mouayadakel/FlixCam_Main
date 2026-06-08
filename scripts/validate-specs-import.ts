#!/usr/bin/env tsx
import fs from 'node:fs'
import path from 'node:path'
import ExcelJS from 'exceljs'
import { normalizeImportedSpecifications } from '../src/lib/utils/specifications-import.utils'

type RowClassification = 'valid_structured' | 'convertible_flat' | 'notes_only' | 'invalid'

type RowResult = {
  sheet: string
  rowNumber: number
  classification: RowClassification
  source: string
  confidence: number
  warnings: string[]
  suggestion?: string
}

const TEMPLATE_BLOCK = `1. SHORT SPECS
- Bullet 1
- Bullet 2
2. FULL SPECS
sensor: Full-frame CMOS
resolution: 4K DCI 60fps
3. TECHNICIAN SPECS
power_input: 12V DC`

function usage() {
  console.log('Usage: tsx scripts/validate-specs-import.ts <input.xlsx|csv> [output.json]')
}

function classifyRow(result: ReturnType<typeof normalizeImportedSpecifications>): RowClassification {
  if (!result.structured) return 'invalid'
  if (result.source === 'notes_sectioned') return 'notes_only'
  if (result.source === 'flat_converted') return 'convertible_flat'
  return 'valid_structured'
}

function rowToObject(headers: string[], values: unknown[]): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  headers.forEach((header, idx) => {
    if (!header) return
    out[header] = values[idx]
  })
  return out
}

async function readWorkbookRows(filePath: string): Promise<Array<{ sheet: string; rowNumber: number; row: Record<string, unknown> }>> {
  const workbook = new ExcelJS.Workbook()
  const ext = path.extname(filePath).toLowerCase()
  if (ext === '.csv') {
    await workbook.csv.readFile(filePath)
  } else {
    await workbook.xlsx.readFile(filePath)
  }

  const rows: Array<{ sheet: string; rowNumber: number; row: Record<string, unknown> }> = []
  workbook.eachSheet((sheet) => {
    const headerValues = (sheet.getRow(1).values as unknown[]).slice(1).map((v) => String(v ?? '').trim())
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return
      const values = (row.values as unknown[]).slice(1)
      const rowObj = rowToObject(headerValues, values)
      rows.push({ sheet: sheet.name, rowNumber, row: rowObj })
    })
  })
  return rows
}

async function main() {
  const [, , inputArg, outputArg] = process.argv
  if (!inputArg) {
    usage()
    process.exit(1)
  }
  const inputPath = path.resolve(process.cwd(), inputArg)
  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`)
    process.exit(1)
  }

  const rawRows = await readWorkbookRows(inputPath)
  const results: RowResult[] = []

  for (const entry of rawRows) {
    const specsRaw = entry.row.Specifications ?? entry.row.specifications ?? null
    const specsRawNotes =
      entry.row.specifications_notes ??
      entry.row['Specifications Notes'] ??
      entry.row.Specifications_Notes ??
      null

    if (!specsRaw && !specsRawNotes) continue

    const normalized = normalizeImportedSpecifications({
      specsRaw,
      specsRawNotes,
      categoryHint: entry.sheet,
    })
    const classification = classifyRow(normalized)

    results.push({
      sheet: entry.sheet,
      rowNumber: entry.rowNumber,
      classification,
      source: normalized.source,
      confidence: normalized.confidence,
      warnings: normalized.warnings,
      suggestion: classification === 'invalid' || classification === 'notes_only' ? TEMPLATE_BLOCK : undefined,
    })
  }

  const summary = {
    totalRowsWithSpecs: results.length,
    valid_structured: results.filter((r) => r.classification === 'valid_structured').length,
    convertible_flat: results.filter((r) => r.classification === 'convertible_flat').length,
    notes_only: results.filter((r) => r.classification === 'notes_only').length,
    invalid: results.filter((r) => r.classification === 'invalid').length,
  }

  console.log('Specifications Import Validator')
  console.log('================================')
  console.log(`Input: ${inputPath}`)
  console.log(`Rows with specs: ${summary.totalRowsWithSpecs}`)
  console.log(`- valid_structured: ${summary.valid_structured}`)
  console.log(`- convertible_flat: ${summary.convertible_flat}`)
  console.log(`- notes_only: ${summary.notes_only}`)
  console.log(`- invalid: ${summary.invalid}`)

  const outputPath =
    outputArg != null
      ? path.resolve(process.cwd(), outputArg)
      : path.resolve(process.cwd(), 'specs-import-validation-report.json')

  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        input: inputPath,
        summary,
        rows: results,
      },
      null,
      2
    )
  )
  console.log(`Report written to: ${outputPath}`)
}

void main()

