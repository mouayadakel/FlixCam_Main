/**
 * Audits docs/templates/equipment-import-from-flix-stock.xlsx and reports
 * missing or weak content per item (SEO, descriptions, specs, boxContents, etc.).
 *
 * Usage: npx tsx scripts/audit-equipment-import.ts
 * Output: docs/templates/EQUIPMENT_IMPORT_AUDIT.md
 */

import * as fs from 'fs'
import * as path from 'path'
import ExcelJS from 'exceljs'

const TEMPLATE_HEADER =
  'source_sheet,sku,model,category_slug,brand_slug,condition,quantityTotal,quantityAvailable,dailyPrice,weeklyPrice,monthlyPrice,purchasePrice,depositAmount,requiresDeposit,featured,isActive,requiresAssistant,budgetTier,warehouseLocation,barcode,tags,boxContents,bufferTime,bufferTimeUnit,featuredImageUrl,galleryImageUrls,videoUrl,name_ar,name_en,name_zh,description_ar,description_en,description_zh,shortDescription_ar,shortDescription_en,shortDescription_zh,longDescription_ar,longDescription_en,longDescription_zh,seoTitle_ar,seoTitle_en,seoTitle_zh,seoDescription_ar,seoDescription_en,seoDescription_zh,seoKeywords_ar,seoKeywords_en,seoKeywords_zh,specifications_notes'

const COLS = TEMPLATE_HEADER.split(',').slice(1) // no source_sheet in xlsx

/** Min lengths for "weak" content (chars) */
const MIN_LEN = {
  seoTitle_ar: 25,
  seoTitle_en: 25,
  seoTitle_zh: 25,
  seoDescription_ar: 120,
  seoDescription_en: 120,
  seoDescription_zh: 120,
  seoKeywords_ar: 40,
  seoKeywords_en: 40,
  seoKeywords_zh: 40,
  description_ar: 80,
  description_en: 80,
  description_zh: 80,
  shortDescription_ar: 15,
  shortDescription_en: 15,
  shortDescription_zh: 15,
  longDescription_ar: 120,
  longDescription_en: 120,
  longDescription_zh: 120,
  specifications_notes: 200,
}

/** Required 3-block spec sections */
const SPEC_BLOCKS = ['SHORT SPECS', 'FULL SPECS', 'TECHNICIAN SPECS']

function getStr(val: unknown): string {
  if (val == null) return ''
  if (typeof val === 'number' && !Number.isNaN(val)) return String(val)
  return String(val).trim()
}

function rowToObj(header: string[], row: ExcelJS.Row): Record<string, string> {
  const out: Record<string, string> = {}
  for (let c = 0; c < header.length; c++) {
    const key = header[c]
    const cell = row.getCell(c + 1)
    out[key] = getStr(cell?.value)
  }
  return out
}

function auditRow(
  sheetName: string,
  rowIndex: number,
  obj: Record<string, string>
): { item: string; issues: string[] } {
  const model = obj['model'] || obj['name_en'] || obj['name_ar'] || `Row ${rowIndex + 2}`
  const issues: string[] = []

  if (!getStr(obj['sku'])) issues.push('Missing **sku**')
  if (!getStr(obj['model'])) issues.push('Missing **model**')
  if (!getStr(obj['category_slug'])) issues.push('Missing **category_slug**')
  if (!getStr(obj['brand_slug'])) issues.push('Missing **brand_slug**')
  if (!getStr(obj['tags'])) issues.push('Missing or empty **tags**')
  if (!getStr(obj['boxContents'])) issues.push('Missing or empty **boxContents**')

  for (const key of Object.keys(MIN_LEN) as (keyof typeof MIN_LEN)[]) {
    if (key === 'specifications_notes') continue // handled below
    const min = MIN_LEN[key]
    const val = getStr(obj[key])
    if (!val) issues.push(`Missing **${key}**`)
    else if (val.length < min) issues.push(`**${key}** too short (${val.length} < ${min} chars)`)
  }

  const spec = getStr(obj['specifications_notes'])
  if (!spec) {
    issues.push('Missing **specifications_notes**')
  } else {
    const up = spec.toUpperCase()
    for (const block of SPEC_BLOCKS) {
      if (!up.includes(block.toUpperCase())) issues.push(`Specs missing block: **${block}**`)
    }
    if (spec.length < MIN_LEN.specifications_notes) {
      issues.push(`**specifications_notes** too short (${spec.length} < ${MIN_LEN.specifications_notes} chars)`)
    }
  }

  return { item: `${sheetName}: ${model}`, issues }
}

async function main() {
  const templatesDir = path.join(process.cwd(), 'docs', 'templates')
  const xlsxPath = path.join(templatesDir, 'equipment-import-from-flix-stock.xlsx')
  const outPath = path.join(templatesDir, 'EQUIPMENT_IMPORT_AUDIT.md')

  if (!fs.existsSync(xlsxPath)) {
    console.error('Not found:', xlsxPath)
    process.exit(1)
  }

  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(xlsxPath)

  const results: { item: string; issues: string[] }[] = []

  for (const worksheet of workbook.worksheets) {
    const sheetName = worksheet.name
    const rows = worksheet.getRows(1, worksheet.rowCount) ?? []
    if (rows.length < 2) continue

    const headerRow = rows[0]
    const header: string[] = []
    for (let c = 1; c <= (headerRow.cellCount || COLS.length); c++) {
      const v = getStr(headerRow.getCell(c)?.value)
      header.push(v || COLS[c - 1] || `col${c}`)
    }

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r]
      const obj = rowToObj(header, row)
      const model = getStr(obj['model'] || obj['name_en'])
      if (!model && !getStr(obj['name_ar'])) continue
      const audit = auditRow(sheetName, r, obj)
      if (audit.issues.length) results.push(audit)
    }
  }

  const lines: string[] = [
    '# Equipment Import Audit',
    '',
    `Generated: ${new Date().toISOString().slice(0, 19)}Z`,
    '',
    'Items with missing or weak content (SEO, descriptions, specs, boxContents, etc.).',
    '',
    '---',
    '',
  ]

  if (results.length === 0) {
    lines.push('No issues found. All items have required fields and meet minimum length thresholds.')
  } else {
    for (const { item, issues } of results) {
      lines.push(`## ${item}`)
      lines.push('')
      for (const i of issues) lines.push(`- ${i}`)
      lines.push('')
    }
  }

  lines.push('---')
  lines.push('')
  lines.push('**Thresholds:**')
  lines.push('- SEO titles: min 25 chars')
  lines.push('- SEO descriptions: min 120 chars')
  lines.push('- SEO keywords: min 40 chars')
  lines.push('- Descriptions: min 80 chars; short 15; long 120')
  lines.push('- specifications_notes: must contain SHORT SPECS, FULL SPECS, TECHNICIAN SPECS')
  lines.push('')

  fs.writeFileSync(outPath, lines.join('\n'), 'utf-8')
  console.log('Audit complete. Items with issues:', results.length)
  console.log('Report written to:', outPath)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
