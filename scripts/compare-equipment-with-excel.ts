/**
 * Compares equipment in the database with equipment in the Excel source-of-truth file.
 * Reports:
 * 1. Equipment in DB but NOT in Excel (outside Excel) + why
 * 2. Items in Excel with SKU containing "QSM"
 *
 * Usage: tsx scripts/compare-equipment-with-excel.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import { parseSpreadsheetBuffer } from '../src/lib/utils/excel-parser'
import { prisma } from '../src/lib/db/prisma'

const EXCEL_PATH = path.join(process.cwd(), 'equipment-full-ai-filled_last_import.xlsx')

// Column header variants for name and SKU (Excel uses name_en, model, sku)
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
  // Try explicit name headers first
  let v = getFirstValue(row, NAME_HEADERS)
  if (v) return v
  // Fallback: any header containing "name", "title", "product"
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
    rawRow: Record<string, unknown>
  }> = []
  const excelNamesNormalized = new Set<string>()
  const excelSkus = new Set<string>()

  for (const sheetName of wb.sheetNames) {
    const rows = wb.getSheetData(sheetName)
    const headers = rows.length > 0 ? Object.keys(rows[0] ?? {}) : []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] ?? {}
      const name = findNameFromRow(row, headers)
      const sku = findSkuFromRow(row, headers)

      if (!name && !sku) continue

      const nameNorm = normalizeForCompare(name)
      if (nameNorm) excelNamesNormalized.add(nameNorm)
      if (sku) excelSkus.add(sku)

      excelItems.push({
        sheet: sheetName,
        rowNum: i + 2,
        name: name || '—',
        nameNormalized: nameNorm,
        sku: sku,
        rawRow: row,
      })
    }
  }

  return { excelItems, excelNamesNormalized, excelSkus }
}

async function loadDbEquipment() {
  const equipment = await prisma.equipment.findMany({
    where: { deletedAt: null },
    include: {
      product: {
        include: {
          translations: {
            where: { deletedAt: null },
            select: { locale: true, name: true },
          },
        },
      },
      brand: { select: { name: true } },
      category: { select: { name: true } },
    },
  })

  const dbItems: Array<{
    id: string
    sku: string
    model: string | null
    nameEn: string | null
    nameZh: string | null
    displayName: string
    displayNameNormalized: string
    source: string
  }> = []

  for (const e of equipment) {
    let displayName = ''
    let source = ''

    const ptEn = e.product?.translations?.find((t) => t.locale === 'en')
    const ptAr = e.product?.translations?.find((t) => t.locale === 'ar')
    const ptZh = e.product?.translations?.find((t) => t.locale === 'zh')

    if (ptEn?.name) {
      displayName = ptEn.name
      source = 'ProductTranslation (en)'
    } else if (ptAr?.name) {
      displayName = ptAr.name
      source = 'ProductTranslation (ar)'
    } else if (ptZh?.name) {
      displayName = ptZh.name
      source = 'ProductTranslation (zh)'
    } else if (e.nameEn) {
      displayName = e.nameEn
      source = 'Equipment.nameEn'
    } else if (e.model) {
      displayName = e.model
      source = 'Equipment.model'
    } else {
      displayName = e.sku
      source = 'Equipment.sku'
    }

    const nameNorm = normalizeForCompare(displayName)
    dbItems.push({
      id: e.id,
      sku: e.sku,
      model: e.model,
      nameEn: e.nameEn,
      nameZh: e.nameZh,
      displayName,
      displayNameNormalized: nameNorm,
      source,
    })
  }

  return dbItems
}

async function run() {
  console.log('Loading Excel source of truth...')
  const { excelItems, excelNamesNormalized, excelSkus } = await loadExcelData()
  console.log(`  Excel: ${excelItems.length} items, ${excelNamesNormalized.size} unique names, ${excelSkus.size} SKUs`)

  console.log('Loading database equipment...')
  const dbItems = await loadDbEquipment()
  console.log(`  DB: ${dbItems.length} equipment`)

  // 1. Equipment in DB but NOT in Excel (by name)
  const outsideExcel: typeof dbItems = []
  for (const db of dbItems) {
    if (!db.displayNameNormalized) continue
    if (excelNamesNormalized.has(db.displayNameNormalized)) continue
    // Also check SKU match (some Excel might use SKU as identifier)
    if (excelSkus.has(db.sku)) continue
    outsideExcel.push(db)
  }

  // 2. QSM items in Excel
  const qsmItemsInExcel = excelItems.filter((item) => item.sku && item.sku.toUpperCase().includes('QSM'))

  // 3. QSM items in DB (for reference - these are NOT in the Excel)
  const qsmItemsInDb = dbItems.filter((item) => item.sku.toUpperCase().includes('QSM'))

  // --- Report ---
  console.log('\n' + '='.repeat(80))
  console.log('REPORT: Equipment vs Excel Source of Truth')
  console.log('='.repeat(80))

  console.log('\n--- 1. Equipment OUTSIDE the Excel (in DB but not in Excel) ---')
  console.log(`Count: ${outsideExcel.length}`)

  if (outsideExcel.length > 0) {
    console.log('\nPossible reasons:')
    console.log('  - Created manually (admin/vendor) before or after Excel import')
    console.log('  - Different naming in Excel (e.g. "Sony FX3" vs "Sony FX3 Cinema Camera")')
    console.log('  - Removed from Excel but still in DB (legacy/archived)')
    console.log('  - Import from different source (e.g. Flix Stock script) with different SKU/name format')
    console.log('  - Vendor equipment added outside import flow')
    console.log('  - Soft-deleted in Excel but active in DB')

    console.log('\nList (id, sku, displayName, source):')
    for (const item of outsideExcel.slice(0, 100)) {
      console.log(`  ${item.id} | ${item.sku} | ${item.displayName} | ${item.source}`)
    }
    if (outsideExcel.length > 100) {
      console.log(`  ... and ${outsideExcel.length - 100} more`)
    }
  }

  console.log('\n--- 2. QSM SKU Items in Excel ---')
  console.log(`Count: ${qsmItemsInExcel.length}`)
  if (qsmItemsInExcel.length === 0) {
    console.log('  (No rows in the Excel file have SKU containing "QSM". The Excel uses BRAND-MODEL-### format.)')
  } else {
    console.log('\n| # | Sheet | Row | Name | SKU |')
    console.log('|---|-------|-----|------|-----|')
    qsmItemsInExcel.forEach((item, i) => {
      console.log(`| ${i + 1} | ${item.sheet} | ${item.rowNum} | ${item.name} | ${item.sku} |`)
    })
  }

  console.log('\n--- 3. QSM SKU Items in DB (not in Excel) ---')
  console.log(`Count: ${qsmItemsInDb.length}`)
  if (qsmItemsInDb.length > 0) {
    console.log('  These exist in the database but are NOT in equipment-full-ai-filled_last_import.xlsx')
    console.log('\n| # | SKU | Display Name |')
    console.log('|---|-----|--------------|')
    qsmItemsInDb.forEach((item, i) => {
      console.log(`| ${i + 1} | ${item.sku} | ${item.displayName} |`)
    })
  }

  console.log('\n' + '='.repeat(80))
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
