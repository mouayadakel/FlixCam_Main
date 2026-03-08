#!/usr/bin/env npx tsx
/// <reference types="node" />
/**
 * Analyze an equipment import Excel/CSV file and report issues.
 * Run from app/: npx tsx scripts/analyze-import-file.ts /path/to/equipment-full-ai-filled_last_import.xlsx
 *
 * Reports:
 * - Sheet names and row counts
 * - Headers (column names) per sheet
 * - Which column is used as "Name" (first match from NAME_KEYS)
 * - Rows with missing Name (will be skipped on import)
 * - Sample of first 3 rows
 */

import * as fs from 'fs'
import * as path from 'path'

const NAME_KEYS = [
  'Name',
  'name',
  'Product Name',
  'Product',
  'اسم',
  'الاسم',
  '*',
  'Equipment Name',
  'Equipment',
  'Item',
  'Item Name',
  'Title',
  'Product Title',
  'item name',
  'title',
  'model',
  'Model',
  'name_en',
  'name_ar',
  'name_zh',
  'Name (EN)',
  'Name (AR)',
  'Name (ZH)',
]

function getRowNameValue(row: Record<string, unknown>): { value: string; keyUsed: string | null } {
  for (const key of NAME_KEYS) {
    const value = row[key]
    if (value !== undefined && value !== null) {
      const normalized = String(value).trim()
      if (normalized) return { value: normalized, keyUsed: key }
    }
  }
  // Also check any header that contains "name" or "model" (case-insensitive)
  for (const [k, v] of Object.entries(row)) {
    if (v === undefined || v === null) continue
    const s = String(v).trim()
    if (!s) continue
    const lower = k.toLowerCase()
    if (lower === 'name' || lower === 'model' || lower.includes('name') || lower === 'product') {
      return { value: s, keyUsed: k }
    }
  }
  return { value: '', keyUsed: null }
}

async function main() {
  const filePath = process.argv[2]
  if (!filePath) {
    console.error('Usage: npx tsx scripts/analyze-import-file.ts <path-to-xlsx-or-csv>')
    process.exit(1)
  }
  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath)
    process.exit(1)
  }

  const ext = path.extname(filePath).toLowerCase()
  const buf = fs.readFileSync(filePath)

  if (ext === '.csv' || ext === '.tsv') {
    const text = buf.toString('utf-8')
    const lines = text.split(/\r?\n/).filter((l) => l.trim())
    const delimiter = ext === ".tsv" ? "\t" : ","
    const trimQuotes = new RegExp('^["\']|["\']$', 'g')
    const headers = lines[0].split(delimiter).map((h) => h.trim().replace(trimQuotes, ''))
    console.log('=== CSV/TSV Analysis ===')
    console.log('Headers:', headers.join(' | '))
    const nameKey = NAME_KEYS.find((k) => headers.includes(k)) ?? headers.find((h) => h.toLowerCase().includes('name') || h.toLowerCase() === 'model')
    console.log('Name column (detected):', nameKey ?? 'NONE – add a column named Name, name_en, model, or Product')
    const missing: number[] = []
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(delimiter)
      const row: Record<string, unknown> = {}
      headers.forEach((h, idx) => {
        row[h] = values[idx]?.trim().replace(trimQuotes, '') ?? ''
      })
      const { value } = getRowNameValue(row)
      if (!value) missing.push(i + 1)
    }
    if (missing.length) {
      console.log('Rows with missing Name (will be excluded):', missing.slice(0, 20).join(', '), missing.length > 20 ? `... (${missing.length} total)` : '')
    }
    console.log('Total data rows:', lines.length - 1)
    console.log('Valid rows (have name):', lines.length - 1 - missing.length)
    return
  }

  // XLSX
  const { parseExcelBuffer } = await import('../src/lib/utils/excel-parser')
  const parsed = await parseExcelBuffer(buf)
  console.log('=== XLSX Analysis ===')
  console.log('Sheets:', parsed.sheetNames.join(', '))

  for (const sheetName of parsed.sheetNames) {
    const rows = parsed.getSheetData(sheetName)
    console.log('\n--- Sheet:', sheetName, '---')
    if (rows.length === 0) {
      console.log('  No data rows')
      continue
    }
    const headers = Object.keys(rows[0] as Record<string, unknown>)
    console.log('  Headers:', headers.join(' | '))

    const nameKey = NAME_KEYS.find((k) => headers.includes(k))
      ?? headers.find((h) => h.toLowerCase().includes('name') || h.toLowerCase() === 'model')
    console.log('  Name column (detected):', nameKey ?? 'NONE – import expects one of: Name, name_en, model, Product, etc.')

    const missingRows: number[] = []
    const sample: Array<{ excelRow: number; nameValue: string; keyUsed: string | null }> = []
    rows.forEach((row, idx) => {
      const excelRow = idx + 2 // 1-based + header row
      const { value, keyUsed } = getRowNameValue(row as Record<string, unknown>)
      if (!value) missingRows.push(excelRow)
      if (idx < 5) sample.push({ excelRow, nameValue: value || '(empty)', keyUsed })
    })

    console.log('  Total data rows:', rows.length)
    console.log('  Rows with missing Name (will be excluded):', missingRows.length ? missingRows.slice(0, 30).join(', ') + (missingRows.length > 30 ? ` ... (${missingRows.length} total)` : '') : 'None')
    console.log('  Sample first 5 rows:')
    sample.forEach((s) => {
      console.log(`    Excel row ${s.excelRow}: name="${s.nameValue.substring(0, 50)}${s.nameValue.length > 50 ? '...' : ''}" (from key: ${s.keyUsed ?? '—'})`)
    })
  }

  console.log('\n=== Recommendations ===')
  console.log('1. If "Name column (detected): NONE" – ensure the sheet has a column named exactly one of: Name, name_en, model, Product, Equipment Name, Item, Title.')
  console.log('2. If "Rows 2,3,4,5" are excluded – those rows have an empty cell in the name column. Fill them or delete those rows.')
  console.log('3. equipment-full-ai-filled files use columns: model, name_en, name_ar, name_zh. The importer now accepts name_en and model as name.')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
