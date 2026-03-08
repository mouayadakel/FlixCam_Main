/**
 * Reads Flix Stock inventory xlsx, extracts Name, Barcode, Quantity, WITB from each sheet,
 * and writes:
 * 1. An XLSX with the same sheet names as the source, each sheet using equipment-import-template columns.
 * 2. A combined CSV (equipment-import-template.csv) with a source_sheet column.
 *
 * Usage: tsx scripts/flix-stock-to-equipment-template.ts [path-to-flix-stock.xlsx]
 * Default path: ~/Downloads/Flix Stock invintory  (3).xlsx
 */

import * as fs from 'fs'
import * as path from 'path'
import { parseExcelBuffer } from '../src/lib/utils/excel-parser'
import ExcelJS from 'exceljs'

const TEMPLATE_HEADER =
  'source_sheet,sku,model,category_slug,brand_slug,condition,quantityTotal,quantityAvailable,dailyPrice,weeklyPrice,monthlyPrice,purchasePrice,depositAmount,requiresDeposit,featured,isActive,requiresAssistant,budgetTier,warehouseLocation,barcode,tags,boxContents,bufferTime,bufferTimeUnit,featuredImageUrl,galleryImageUrls,videoUrl,name_ar,name_en,name_zh,description_ar,description_en,description_zh,shortDescription_ar,shortDescription_en,shortDescription_zh,longDescription_ar,longDescription_en,longDescription_zh,seoTitle_ar,seoTitle_en,seoTitle_zh,seoDescription_ar,seoDescription_en,seoDescription_zh,seoKeywords_ar,seoKeywords_en,seoKeywords_zh,specifications_notes'

const TEMPLATE_HEADER_NO_SOURCE = TEMPLATE_HEADER.replace(/^source_sheet,/, '')

function normalizeHeader(h: string): string {
  return String(h ?? '').trim().toLowerCase()
}

function findColumn(
  row: Record<string, unknown>,
  ...candidates: string[]
): string | null {
  const keys = Object.keys(row)
  for (const candidate of candidates) {
    const c = candidate.toLowerCase().trim()
    const found = keys.find((k) => normalizeHeader(k) === c)
    if (found) return found
  }
  // Also match "Quantity " (with space) and "Quantity On Hand"
  if (candidates.some((x) => x.toLowerCase().includes('quantity'))) {
    const found = keys.find(
      (k) =>
        normalizeHeader(k) === 'quantity' ||
        normalizeHeader(k) === 'quantity on hand'
    )
    if (found) return found
  }
  return null
}

function getString(row: Record<string, unknown>, col: string | null): string {
  if (!col || row[col] == null) return ''
  const v = row[col]
  if (typeof v === 'number' && !Number.isNaN(v)) return String(v)
  return String(v).trim()
}

function getQuantity(row: Record<string, unknown>, col: string | null): string {
  if (!col) return ''
  const v = row[col]
  if (v == null) return ''
  if (typeof v === 'number' && !Number.isNaN(v) && v >= 0) return String(Math.floor(v))
  const s = String(v).trim()
  const n = parseInt(s, 10)
  return Number.isFinite(n) && n >= 0 ? String(n) : s || ''
}

function escapeCsv(val: string): string {
  if (!val.includes(',') && !val.includes('"') && !val.includes('\n')) return val
  return `"${val.replace(/"/g, '""')}"`
}

function rowToTemplateCsv(
  sourceSheet: string,
  model: string,
  barcode: string,
  quantityTotal: string,
  boxContents: string
): string {
  const qty = quantityTotal || '1'
  const parts = [
    escapeCsv(sourceSheet),
    '', // sku
    escapeCsv(model),
    '', // category_slug
    '', // brand_slug
    '', // condition
    qty,
    qty,
    '', // dailyPrice
    '', // weeklyPrice
    '', // monthlyPrice
    '', // purchasePrice
    '', // depositAmount
    '', // requiresDeposit
    '', // featured
    '', // isActive
    '', // requiresAssistant
    '', // budgetTier
    '', // warehouseLocation
    escapeCsv(barcode),
    '', // tags
    escapeCsv(boxContents),
    '0',
    'hours',
    '', // featuredImageUrl
    '', // galleryImageUrls
    '', // videoUrl
    '', // name_ar
    escapeCsv(model), // name_en
    '', // name_zh
    '', // description_ar
    '', // description_en
    '', // description_zh
    '', // shortDescription_ar
    '', // shortDescription_en
    '', // shortDescription_zh
    '', // longDescription_ar
    '', // longDescription_en
    '', // longDescription_zh
    '', // seoTitle_ar
    '', // seoTitle_en
    '', // seoTitle_zh
    '', // seoDescription_ar
    '', // seoDescription_en
    '', // seoDescription_zh
    '', // seoKeywords_ar
    '', // seoKeywords_en
    '', // seoKeywords_zh
    '', // specifications_notes
  ]
  return parts.join(',')
}

function rowToTemplateRow(
  model: string,
  barcode: string,
  quantityTotal: string,
  boxContents: string
): Record<string, string> {
  const qty = quantityTotal || '1'
  return {
    sku: '',
    model,
    category_slug: '',
    brand_slug: '',
    condition: '',
    quantityTotal: qty,
    quantityAvailable: qty,
    dailyPrice: '',
    weeklyPrice: '',
    monthlyPrice: '',
    purchasePrice: '',
    depositAmount: '',
    requiresDeposit: '',
    featured: '',
    isActive: '',
    requiresAssistant: '',
    budgetTier: '',
    warehouseLocation: '',
    barcode,
    tags: '',
    boxContents,
    bufferTime: '0',
    bufferTimeUnit: 'hours',
    featuredImageUrl: '',
    galleryImageUrls: '',
    videoUrl: '',
    name_ar: '',
    name_en: model,
    name_zh: '',
    description_ar: '',
    description_en: '',
    description_zh: '',
    shortDescription_ar: '',
    shortDescription_en: '',
    shortDescription_zh: '',
    longDescription_ar: '',
    longDescription_en: '',
    longDescription_zh: '',
    seoTitle_ar: '',
    seoTitle_en: '',
    seoTitle_zh: '',
    seoDescription_ar: '',
    seoDescription_en: '',
    seoDescription_zh: '',
    seoKeywords_ar: '',
    seoKeywords_en: '',
    seoKeywords_zh: '',
    specifications_notes: '',
  }
}

async function main() {
  const inputPath =
    process.argv[2] ||
    path.join(
      process.env.HOME || '',
      'Downloads',
      'Flix Stock invintory  (3).xlsx'
    )
  const templatesDir = path.join(process.cwd(), 'docs', 'templates')
  const outXlsxPath = path.join(templatesDir, 'equipment-import-from-flix-stock.xlsx')
  const outCsvPath = path.join(templatesDir, 'equipment-import-template.csv')

  if (!fs.existsSync(inputPath)) {
    console.error('File not found:', inputPath)
    process.exit(1)
  }

  const buffer = fs.readFileSync(inputPath)
  const { sheetNames, sheets } = await parseExcelBuffer(buffer)

  const templateColumns = TEMPLATE_HEADER_NO_SOURCE.split(',')
  const csvLines: string[] = [TEMPLATE_HEADER]
  const workbook = new ExcelJS.Workbook()

  for (const sheetName of sheetNames) {
    const rows = sheets[sheetName] ?? []
    if (rows.length === 0) continue

    const first = rows[0]
    const nameCol =
      findColumn(first, 'Name', '*', 'name') ||
      findColumn(first, 'Product', 'Product Name') ||
      (Object.keys(first).length > 0 ? Object.keys(first)[0] : null)
    const barcodeCol = findColumn(first, 'Barcode', 'Barcode ')
    const qtyCol =
      findColumn(first, 'Quantity', 'Quantity On Hand', 'Quantity ')
    const witbCol = findColumn(first, 'WITB', "What's in the box", 'Box Contents')

    const outRows: Record<string, string>[] = []
    for (const row of rows) {
      const model = getString(row, nameCol)
      if (!model) continue
      const barcode = getString(row, barcodeCol)
      const quantityTotal = getQuantity(row, qtyCol)
      const boxContents = getString(row, witbCol)

      outRows.push(
        rowToTemplateRow(model, barcode, quantityTotal, boxContents)
      )
      csvLines.push(
        rowToTemplateCsv(sheetName, model, barcode, quantityTotal, boxContents)
      )
    }

    const worksheet = workbook.addWorksheet(sheetName, {
      headerFooter: { firstHeader: TEMPLATE_HEADER_NO_SOURCE },
    })
    worksheet.addRow(templateColumns)
    for (const r of outRows) {
      worksheet.addRow(templateColumns.map((c) => r[c] ?? ''))
    }
  }

  if (!fs.existsSync(templatesDir)) {
    fs.mkdirSync(templatesDir, { recursive: true })
  }

  const xlsxBuf = await workbook.xlsx.writeBuffer()
  fs.writeFileSync(outXlsxPath, Buffer.from(xlsxBuf as ArrayBuffer))
  console.log('Wrote:', outXlsxPath, `(${sheetNames.length} sheets)`)

  fs.writeFileSync(outCsvPath, csvLines.join('\n') + '\n', 'utf-8')
  console.log('Wrote:', outCsvPath, `(${csvLines.length - 1} rows)`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
