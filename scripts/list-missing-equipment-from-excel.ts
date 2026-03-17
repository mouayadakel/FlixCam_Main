/**
 * Lists all equipment in the Excel file that are NOT on the website (not in DB).
 * Output: missing items by name, grouped by sheet.
 *
 * Usage: npx tsx scripts/list-missing-equipment-from-excel.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import { parseSpreadsheetBuffer } from '../src/lib/utils/excel-parser'
import { prisma } from '../src/lib/db/prisma'

const EXCEL_PATH = path.join(process.cwd(), 'equipment-full-ai-filled_last_import.xlsx')

const NAME_HEADERS = [
  'name_en',
  'name',
  'name (en)',
  'model',
  'Name',
  'product name',
  'product title',
  'title',
  'اسم',
  '*',
  'item name',
  'english name',
]
const SKU_HEADERS = ['sku', 'SKU', 'internal reference', 'product code', 'item code', 'article number']

function normalizeForCompare(s: string): string {
  return String(s ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function getFirstValue(row: Record<string, unknown>, candidateHeaders: string[]): string {
  const keys = Object.keys(row)
  for (const want of candidateHeaders) {
    const key = keys.find((k) => k.trim().toLowerCase() === want.trim().toLowerCase())
    if (key) {
      const v = row[key]
      if (v != null && String(v).trim() !== '') return String(v).trim()
    }
  }
  return ''
}

function findNameFromRow(row: Record<string, unknown>, headers: string[]): string {
  let v = getFirstValue(row, NAME_HEADERS)
  if (v) return v
  for (const h of headers) {
    if (/name|title|product|اسم/i.test(h)) {
      const val = row[h]
      if (val != null && String(val).trim() !== '') return String(val).trim()
    }
  }
  return ''
}

function findSkuFromRow(row: Record<string, unknown>, headers: string[]): string {
  let v = getFirstValue(row, SKU_HEADERS)
  if (v) return v
  for (const h of headers) {
    if (/^sku|barcode|code|reference$/i.test(h)) {
      const val = row[h]
      if (val != null && String(val).trim() !== '') return String(val).trim()
    }
  }
  return ''
}

async function loadExcelData() {
  if (!fs.existsSync(EXCEL_PATH)) {
    throw new Error(`Excel file not found: ${EXCEL_PATH}`)
  }
  const buffer = fs.readFileSync(EXCEL_PATH)
  const wb = await parseSpreadsheetBuffer(buffer, 'equipment-full-ai-filled_last_import.xlsx')

  const excelItems: Array<{
    sheet: string
    rowNum: number
    name: string
    nameNormalized: string
    sku: string
  }> = []

  for (const sheetName of wb.sheetNames) {
    const rows = wb.getSheetData(sheetName)
    const headers = rows.length > 0 ? Object.keys(rows[0] ?? {}) : []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] ?? {}
      const name = findNameFromRow(row, headers)
      const sku = findSkuFromRow(row, headers)

      if (!name && !sku) continue

      excelItems.push({
        sheet: sheetName,
        rowNum: i + 2,
        name: name || '—',
        nameNormalized: normalizeForCompare(name),
        sku: sku,
      })
    }
  }

  return excelItems
}

async function loadDbEquipment() {
  const equipment = await prisma.equipment.findMany({
    where: { deletedAt: null },
    select: {
      sku: true,
      nameEn: true,
      model: true,
      product: {
        select: {
          translations: {
            where: { deletedAt: null },
            select: { locale: true, name: true },
          },
        },
      },
    },
  })

  const dbNamesNormalized = new Set<string>()
  const dbSkus = new Set<string>()

  for (const e of equipment) {
    const ptEn = e.product?.translations?.find((t) => t.locale === 'en')
    const ptAr = e.product?.translations?.find((t) => t.locale === 'ar')
    const ptZh = e.product?.translations?.find((t) => t.locale === 'zh')

    let displayName = ''
    if (ptEn?.name) displayName = ptEn.name
    else if (ptAr?.name) displayName = ptAr.name
    else if (ptZh?.name) displayName = ptZh.name
    else if (e.nameEn) displayName = e.nameEn
    else if (e.model) displayName = e.model
    else displayName = e.sku

    dbNamesNormalized.add(normalizeForCompare(displayName))
    dbSkus.add(e.sku)
  }

  return { dbNamesNormalized, dbSkus }
}

async function main() {
  console.log('Loading Excel...')
  const excelItems = await loadExcelData()
  console.log('Loading DB equipment...')
  const { dbNamesNormalized, dbSkus } = await loadDbEquipment()

  const missing: Array<{ sheet: string; rowNum: number; name: string; sku: string }> = []

  for (const item of excelItems) {
    if (dbSkus.has(item.sku)) continue
    if (item.nameNormalized && dbNamesNormalized.has(item.nameNormalized)) continue
    missing.push({
      sheet: item.sheet,
      rowNum: item.rowNum,
      name: item.name,
      sku: item.sku,
    })
  }

  // Group by sheet
  const bySheet = new Map<string, typeof missing>()
  for (const m of missing) {
    if (!bySheet.has(m.sheet)) bySheet.set(m.sheet, [])
    bySheet.get(m.sheet)!.push(m)
  }

  console.log('\n' + '='.repeat(70))
  console.log('MISSING EQUIPMENT: In Excel but NOT on website')
  console.log('='.repeat(70))
  console.log(`Total missing: ${missing.length}\n`)

  const sheetOrder = [
    'Camera',
    'Camera Acc',
    'Lenses',
    'Tripodgimbals',
    'Boxes',
    'Light',
    'Light Acc',
    'Grips',
    'Monitors',
    'Battery',
    'Sound',
    'Live and Mixing',
  ]

  for (const sheetName of sheetOrder) {
    const items = bySheet.get(sheetName)
    if (!items || items.length === 0) continue

    console.log(`\n--- ${sheetName} (${items.length}) ---`)
    items
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((item) => {
        console.log(`  ${item.name}`)
      })
  }

  // Any sheets not in sheetOrder
  for (const [sheetName, items] of bySheet) {
    if (sheetOrder.includes(sheetName)) continue
    console.log(`\n--- ${sheetName} (${items.length}) ---`)
    items
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((item) => {
        console.log(`  ${item.name}`)
      })
  }

  console.log('\n' + '='.repeat(70))
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
