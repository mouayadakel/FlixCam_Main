/**
 * Soft-deletes all equipment that are NOT in the Excel source-of-truth file.
 * This includes:
 *   - QSM Rent seeds (QSM-001 to QSM-100)
 *   - Flix Stock imports (STAB-*, CASE-*, GRIP-*, etc.)
 *   - Any other equipment not in equipment-full-ai-filled_last_import.xlsx
 *
 * Only equipment that exists in the Excel (by SKU or name match) will remain visible.
 *
 * Usage:
 *   npx tsx scripts/soft-delete-non-excel-equipment.ts        # Dry run (no changes)
 *   npx tsx scripts/soft-delete-non-excel-equipment.ts --commit # Apply soft-deletes
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
    }
  }

  return { excelNamesNormalized, excelSkus }
}

async function main() {
  const args = new Set(process.argv.slice(2))
  const commit = args.has('--commit')

  console.log('Loading Excel source of truth...')
  const { excelNamesNormalized, excelSkus } = await loadExcelData()
  console.log(`  Excel: ${excelSkus.size} SKUs, ${excelNamesNormalized.size} unique names`)

  const equipment = await prisma.equipment.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      sku: true,
      product: {
        select: {
          translations: {
            where: { deletedAt: null },
            select: { locale: true, name: true },
          },
        },
      },
      nameEn: true,
      model: true,
    },
  })

  // Resolve display name for each equipment
  const toSoftDelete: Array<{ id: string; sku: string; displayName: string }> = []

  for (const e of equipment) {
    let displayName = ''
    const ptEn = e.product?.translations?.find((t) => t.locale === 'en')
    const ptAr = e.product?.translations?.find((t) => t.locale === 'ar')
    const ptZh = e.product?.translations?.find((t) => t.locale === 'zh')

    if (ptEn?.name) displayName = ptEn.name
    else if (ptAr?.name) displayName = ptAr.name
    else if (ptZh?.name) displayName = ptZh.name
    else if (e.nameEn) displayName = e.nameEn
    else if (e.model) displayName = e.model
    else displayName = e.sku

    const nameNorm = normalizeForCompare(displayName)

    // Keep if in Excel (by SKU or name)
    if (excelSkus.has(e.sku)) continue
    if (nameNorm && excelNamesNormalized.has(nameNorm)) continue

    toSoftDelete.push({ id: e.id, sku: e.sku, displayName })
  }

  console.log(`\nEquipment to soft-delete (not in Excel): ${toSoftDelete.length}`)

  if (toSoftDelete.length === 0) {
    console.log('Nothing to do. All equipment are in the Excel.')
    return
  }

  const qsmCount = toSoftDelete.filter((e) => e.sku.startsWith('QSM-')).length
  console.log(`  - QSM Rent seeds (QSM-*): ${qsmCount}`)
  console.log(`  - Other (Flix Stock, etc.): ${toSoftDelete.length - qsmCount}`)

  if (!commit) {
    console.log('\n[DRY RUN] No changes made. To apply, run with --commit:')
    console.log('  npx tsx scripts/soft-delete-non-excel-equipment.ts --commit')
    console.log('\nFirst 20 to be soft-deleted:')
    toSoftDelete.slice(0, 20).forEach((e) => console.log(`  ${e.sku} | ${e.displayName}`))
    return
  }

  const ids = toSoftDelete.map((e) => e.id)
  const result = await prisma.equipment.updateMany({
    where: { id: { in: ids } },
    data: { deletedAt: new Date(), deletedBy: 'system' },
  })

  console.log(`\n✅ Soft-deleted ${result.count} equipment.`)
  console.log(`   Remaining visible equipment: ${equipment.length - result.count} (from Excel only)`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
