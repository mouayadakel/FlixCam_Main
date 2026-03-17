/**
 * Inspect Excel file structure - print sheet names and first row headers
 */
import * as fs from 'fs'
import * as path from 'path'
import { parseSpreadsheetBuffer } from '../src/lib/utils/excel-parser'

const EXCEL_PATH = path.join(process.cwd(), 'equipment-full-ai-filled_last_import.xlsx')

async function main() {
  const buffer = fs.readFileSync(EXCEL_PATH)
  const wb = await parseSpreadsheetBuffer(buffer, 'equipment-full-ai-filled_last_import.xlsx')

  console.log('Sheets:', wb.sheetNames)
  for (const sheetName of wb.sheetNames) {
    const rows = wb.getSheetData(sheetName)
    const headers = rows.length > 0 ? Object.keys(rows[0] ?? {}) : []
    console.log(`\nSheet "${sheetName}" - Headers:`, headers)
    if (rows.length > 1) {
      const sample = rows[1] ?? {}
      console.log('  Sample row 2:', JSON.stringify(sample, null, 2).slice(0, 500))
      // Check for QSM in any value
      const hasQsm = Object.values(sample).some((v) => String(v ?? '').toUpperCase().includes('QSM'))
      console.log('  Has QSM in row 2:', hasQsm)
    }
  }
}

async function findQsmInExcel() {
  const buffer = fs.readFileSync(EXCEL_PATH)
  const wb = await parseSpreadsheetBuffer(buffer, 'equipment-full-ai-filled_last_import.xlsx')
  const qsmRows: Array<{ sheet: string; rowNum: number; sku: string; name: string }> = []
  for (const sheetName of wb.sheetNames) {
    const rows = wb.getSheetData(sheetName)
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] ?? {}
      const sku = String(row['sku'] ?? '').trim()
      if (sku.toUpperCase().includes('QSM')) {
        const name = String(row['name_en'] ?? row['model'] ?? row['name_ar'] ?? '').trim()
        qsmRows.push({ sheet: sheetName, rowNum: i + 2, sku, name })
      }
    }
  }
  console.log('\n--- Rows with QSM in sku column ---')
  console.log('Count:', qsmRows.length)
  qsmRows.forEach((r) => console.log(r))
}

main()
  .then(() => findQsmInExcel())
  .catch(console.error)
