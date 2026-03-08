/**
 * Applies a fixed price list to equipment-import-from-flix-stock.xlsx by matching
 * model names (normalized), then writes back the XLSX and regenerates
 * equipment-import-template.csv.
 *
 * Usage: npx tsx scripts/apply-equipment-prices.ts
 */

import * as fs from 'fs'
import * as path from 'path'
import ExcelJS from 'exceljs'

const TEMPLATE_HEADER =
  'source_sheet,sku,model,category_slug,brand_slug,condition,quantityTotal,quantityAvailable,dailyPrice,weeklyPrice,monthlyPrice,purchasePrice,depositAmount,requiresDeposit,featured,isActive,requiresAssistant,budgetTier,warehouseLocation,barcode,tags,boxContents,bufferTime,bufferTimeUnit,featuredImageUrl,galleryImageUrls,videoUrl,name_ar,name_en,name_zh,description_ar,description_en,description_zh,shortDescription_ar,shortDescription_en,shortDescription_zh,longDescription_ar,longDescription_en,longDescription_zh,seoTitle_ar,seoTitle_en,seoTitle_zh,seoDescription_ar,seoDescription_en,seoDescription_zh,seoKeywords_ar,seoKeywords_en,seoKeywords_zh,specifications_notes'

const TEMPLATE_COLS = TEMPLATE_HEADER.split(',').slice(1)

/** Price list: name (display) -> [daily, weekly, monthly] */
const PRICE_LIST: [string, number, number, number][] = [
  ['Sony FX3', 350, 1400, 4200],
  ['Sony A7S III', 350, 1400, 4200],
  ['Sony A7R V (A7R5)', 400, 1600, 4800],
  ['GoPro HERO 13 Black', 90, 360, 1080],
  ['Brinno Construction Trio Pack', 120, 480, 1200],
  ['Sony FE 24-70mm f/2.8 GM II', 149, 596, 1788],
  ['Sony FE 70-200mm f/2.8 GM OSS II', 125, 500, 1500],
  ['Sony FE 50mm f/1.2 GM', 125, 500, 1500],
  ['Sony FE 85mm f/1.4 GM', 125, 500, 1500],
  ['Sigma 24-70mm f/2.8 Art', 120, 480, 1440],
  ['Sigma 35mm / 50mm f/1.4 Art', 100, 400, 1200],
  ['Nanlux Evoke 1200D', 600, 2400, 7200],
  ['Aputure LS 600d Pro / 600x Pro', 275, 1100, 3300],
  ['Aputure LS 300x', 250, 1000, 3000],
  ['Amaran COB 200d S', 250, 1000, 3000],
  ['Amaran P60x Panel', 50, 200, 600],
  ['Godox FL150R Flexible LED', 50, 200, 600],
  ['Aputure Spotlight Mount Set (36°/26°)', 75, 300, 900],
  ['Aputure Light Dome II / Softboxes', 30, 120, 360],
  ['Heavy Duty / C-Stands', 35, 140, 420],
  ['DJI Ronin RS3 / RS4 Pro', 200, 800, 2400],
  ['Manfrotto Carbon Fiber Tripod', 100, 400, 1200],
  ['Atomos Neon 24"', 350, 1400, 4200],
  ['SmallHD 703 Bolt Director\'s Monitor', 250, 1000, 3000],
  ['SmallHD Ultra 7-inch', 150, 600, 1800],
  ['Teradek Bolt 6 (LT/XT)', 300, 1200, 3600],
  ['Teradek Bolt 500/1000', 200, 800, 2400],
  ['Tilta Nucleus M', 150, 600, 1800],
  ['Zoom F6 Field Recorder', 100, 400, 1200],
  ['Rode NTG4+ / Boom Kit', 80, 320, 960],
  ['Sennheiser EW 112 P G4', 75, 300, 900],
  ['Blackmagic ATEM Television Studio 4K8', 400, 1600, 4800],
  ['Blackmagic Ultimatte 12 4K', 350, 1400, 4200],
  ['V-Mount / B-Mount Batteries', 35, 140, 420],
]

function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[\/\-_,.°"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Aliases from CSV/inventory model text to price-list name */
const MODEL_ALIASES: Record<string, string> = {
  'sony a7siii': 'Sony A7S III',
  'sony a7s iii': 'Sony A7S III',
  'sony a7r5': 'Sony A7R V (A7R5)',
  'gopro 13black': 'GoPro HERO 13 Black',
  'ronin rs4 pro combo': 'DJI Ronin RS3 / RS4 Pro',
  'teradek wireless transmeter bolt 6': 'Teradek Bolt 6 (LT/XT)',
  'teradek bolt 6': 'Teradek Bolt 6 (LT/XT)',
  'tilta nucleus m': 'Tilta Nucleus M',
  'nanlux 1200d': 'Nanlux Evoke 1200D',
  'nanlux evoke 1200d': 'Nanlux Evoke 1200D',
  'black magic ultimatte 12 4k': 'Blackmagic Ultimatte 12 4K',
  'blackmagic ultimatte 12 4k': 'Blackmagic Ultimatte 12 4K',
  'black magic atem tv studio 4k8': 'Blackmagic ATEM Television Studio 4K8',
  'blackmagic atem tv studio 4k8': 'Blackmagic ATEM Television Studio 4K8',
  'sony e mount sigma art dg dn 24-70 mm': 'Sigma 24-70mm f/2.8 Art',
  'sony e mount sigma art dg dn 50 mm': 'Sigma 35mm / 50mm f/1.4 Art',
  'sony e mount sigma art dg dn 35mm': 'Sigma 35mm / 50mm f/1.4 Art',
  'aputure 300d': 'Aputure LS 300x',
  "atomos neon 24''": 'Atomos Neon 24"',
  'atomos neon 24"': 'Atomos Neon 24"',
}

function buildMatcher(): (model: string) => [number, number, number] | null {
  const byNorm = PRICE_LIST.map(([name, d, w, m]) => ({
    norm: normalize(name),
    name,
    daily: d,
    weekly: w,
    monthly: m,
  }))
  byNorm.sort((a, b) => b.norm.length - a.norm.length)
  const byName = new Map<string, [number, number, number]>()
  PRICE_LIST.forEach(([name, d, w, m]) => byName.set(name, [d, w, m]))

  return (model: string) => {
    const mNorm = normalize(model)
    if (!mNorm) return null
    const aliased = MODEL_ALIASES[mNorm] ?? model
    const fromAlias = byName.get(aliased)
    if (fromAlias) return fromAlias
    for (const p of byNorm) {
      if (mNorm === p.norm || mNorm.includes(p.norm) || p.norm.includes(mNorm)) {
        return [p.daily, p.weekly, p.monthly]
      }
    }
    return null
  }
}

function escapeCsv(val: string): string {
  const v = String(val ?? '')
  if (!v.includes(',') && !v.includes('"') && !v.includes('\n')) return v
  return `"${v.replace(/"/g, '""')}"`
}

async function main() {
  const templatesDir = path.join(process.cwd(), 'docs', 'templates')
  const xlsxPath = path.join(templatesDir, 'equipment-import-from-flix-stock.xlsx')
  const csvPath = path.join(templatesDir, 'equipment-import-template.csv')

  if (!fs.existsSync(xlsxPath)) {
    console.error('Not found:', xlsxPath)
    process.exit(1)
  }

  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(xlsxPath)
  const matchPrice = buildMatcher()

  const csvLines: string[] = [TEMPLATE_HEADER]
  let updated = 0

  for (const worksheet of workbook.worksheets) {
    const sheetName = worksheet.name
    const rows = worksheet.getRows(1, worksheet.rowCount) ?? []
    if (rows.length < 2) continue

    const headerRow = rows[0]
    const colCount = 20
    let modelCol = 2,
      dailyCol = 10,
      weeklyCol = 11,
      monthlyCol = 12
    for (let c = 1; c <= colCount; c++) {
      const v = String(headerRow.getCell(c)?.value ?? '').trim()
      if (v === 'model') modelCol = c
      if (v === 'dailyPrice') dailyCol = c
      if (v === 'weeklyPrice') weeklyCol = c
      if (v === 'monthlyPrice') monthlyCol = c
    }

    for (let r = 1; r < rows.length; r++) {
      const row = rows[r]
      const model = String(row.getCell(modelCol)?.value ?? '').trim()
      const prices = matchPrice(model)
      if (prices) {
        row.getCell(dailyCol).value = prices[0]
        row.getCell(weeklyCol).value = prices[1]
        row.getCell(monthlyCol).value = prices[2]
        updated++
      }

      const cells: string[] = [escapeCsv(sheetName)]
      for (let c = 1; c <= TEMPLATE_COLS.length; c++) {
        const val = row.getCell(c)?.value
        cells.push(escapeCsv(val != null ? String(val) : ''))
      }
      csvLines.push(cells.join(','))
    }
  }

  await workbook.xlsx.writeFile(xlsxPath)
  fs.writeFileSync(csvPath, csvLines.join('\n') + '\n', 'utf-8')

  console.log('Updated', updated, 'rows with prices.')
  console.log('Wrote:', xlsxPath)
  console.log('Wrote:', csvPath)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
