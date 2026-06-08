#!/usr/bin/env node
/**
 * Merge NEW rows from Flix Stock export into Flixcam master XLSX + Gemini fills
 * SEO, descriptions, specs (specifications_notes), tags, and pricing hints.
 *
 *   GEMINI_API_KEY is read from project .env (same entry you already use for the app).
 *   You can still override with exported env vars.
 *
 *   node scripts/merge-new-stock-into-flixcam.cjs \\
 *     --master ./Flixcam_invetory.xlsx \\
 *     --stock "./Flix Stock invintory  (4).xlsx" \\
 *     --out ./Flixcam_invetory.updated.xlsx
 *
 *   --keywords alexa,komodo,red   Only NEW rows whose name contains one of these (comma list)
 *   --no-backup                  When --out is same as --master, skip .SAFE-BEFORE-MERGE copy (not recommended)
 */

const fs = require('fs')
const path = require('path')
/** Load GEMINI_API_KEY (and optional GEMINI_MODEL, PRICING_*) from repo .env */
const repoRoot = path.join(__dirname, '..')
require('dotenv').config({ path: path.join(repoRoot, '.env') })
require('dotenv').config({ path: path.join(repoRoot, '.env.local'), override: true })

const ExcelJS = require('exceljs')
const { GoogleGenerativeAI } = require('@google/generative-ai')

const SHEET_TO_CATEGORY = {
  Camera: 'cameras',
  'Camera Acc': 'accessories',
  Lenses: 'lenses',
  Tripodgimbals: 'tripods-gimbals',
  Boxes: 'cases-bags',
  Light: 'lighting',
  'Light Acc': 'lighting-accessories',
  Grips: 'grip',
  monitors: 'monitors',
  Monitors: 'monitors',
  Battery: 'power',
  Sound: 'audio',
  'Live and mixing': 'live-production',
}

const KNOWN_BRANDS = {
  sony: 'sony',
  arri: 'arri',
  red: 'red',
  canon: 'canon',
  nikon: 'nikon',
  blackmagic: 'blackmagic',
  bmpcc: 'blackmagic',
  godox: 'godox',
  aputure: 'aputure',
  capture: 'aputure',
  nanlux: 'nanlux',
  nanlite: 'nanlite',
  tilta: 'tilta',
  dji: 'dji',
  ronin: 'dji',
  sennheiser: 'sennheiser',
  rode: 'rode',
  zoom: 'zoom',
  saramonic: 'saramonic',
  sigma: 'sigma',
  zeiss: 'zeiss',
  dzofilm: 'dzofilm',
  smallhd: 'smallhd',
  atomos: 'atomos',
  vaxis: 'vaxis',
  teradek: 'teradek',
  easyrig: 'easyrig',
  flycam: 'flycam',
  benro: 'benro',
  manfrotto: 'manfrotto',
  gopro: 'gopro',
  brinno: 'brinno',
  ikan: 'ikan',
  sekonic: 'sekonic',
  tiffen: 'tiffen',
  schneider: 'schneider',
  metabones: 'metabones',
  gvm: 'gvm',
  amaran: 'aputure',
  astera: 'astera',
  swit: 'swit',
  innox: 'innox',
  blueshape: 'blueshape',
  blushape: 'blueshape',
  'blue shape': 'blueshape',
  newell: 'newell',
  vemico: 'vemico',
  lowepro: 'lowepro',
  orca: 'orca',
  porta: 'portabrace',
  'e-image': 'e-image',
  luawa: 'laowa',
  laowa: 'laowa',
  oconnor: 'oconnor',
  armour: 'armour',
  occonor: 'oconnor',
  'o connor': 'oconnor',
}

const SAUDI_MARKET_HINTS = {
  'arri alexa 35': { daily: 5500, weekly: 22000, monthly: 55000 },
  'alexa mini': { daily: 3850, weekly: 15400, monthly: 38500 },
  'alexa lf': { daily: 4200, weekly: 16800, monthly: 42000 },
  'red komodo': { daily: 1320, weekly: 5280, monthly: 13200 },
  'v-raptor': { daily: 2500, weekly: 10000, monthly: 25000 },
  raptor: { daily: 2500, weekly: 10000, monthly: 25000 },
  dsmc: { daily: 2000, weekly: 8000, monthly: 20000 },
  mavic: { daily: 400, weekly: 1600, monthly: 4000 },
  drone: { daily: 350, weekly: 1400, monthly: 3500 },
  armour: { daily: 120, weekly: 480, monthly: 1200 },
  'o connor': { daily: 350, weekly: 1400, monthly: 3500 },
  'v mount': { daily: 50, weekly: 200, monthly: 500 },
  speedlite: { daily: 40, weekly: 160, monthly: 400 },
}

const MODEL_NAME = process.env.GEMINI_MODEL || 'gemini-2.0-flash'
const WEEKLY_FACTOR = Number(process.env.PRICING_WEEKLY_FACTOR || 4)
const MONTHLY_FACTOR = Number(process.env.PRICING_MONTHLY_FACTOR || 12)
const PROGRESS_PATH = path.join(__dirname, '.cache', 'merge-flixcam-ai-progress.json')

function parseArgs(argv) {
  const o = {
    master: null,
    stock: null,
    out: null,
    dryRun: false,
    delayMs: 2000,
    /** Comma-separated substrings — only NEW stock rows whose name matches one */
    keywords: null,
    noBackup: false,
  }
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--master') o.master = argv[++i]
    else if (a === '--stock') o.stock = argv[++i]
    else if (a === '--out') o.out = argv[++i]
    else if (a === '--dry-run') o.dryRun = true
    else if (a === '--delay-ms') o.delayMs = parseInt(argv[++i], 10) || 2000
    else if (a === '--keywords') o.keywords = argv[++i]
    else if (a === '--no-backup') o.noBackup = true
  }
  return o
}

/**
 * Keeps only new items whose name matches ANY keyword substring (case-insensitive).
 */
function filterGrouped(grouped, keywordsCsv) {
  if (!keywordsCsv || !keywordsCsv.trim()) return grouped
  const ks = keywordsCsv
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
  if (!ks.length) return grouped

  /** @type {typeof grouped} */
  const next = {}
  for (const [sheet, rows] of Object.entries(grouped)) {
    const keep = rows.filter((it) =>
      ks.some((k) => String(it.name).toLowerCase().includes(k))
    )
    if (keep.length) next[sheet] = keep
  }
  return next
}

function backupMasterSameAsDest(masterPath, destPath, noBackup) {
  if (noBackup) return
  const ma = path.resolve(masterPath)
  const dp = path.resolve(destPath)
  if (ma !== dp) return
  const stamped = ma.replace(/\.xlsx$/i, `.SAFE-BEFORE-MERGE.${Date.now()}.xlsx`)
  fs.copyFileSync(masterPath, stamped)
  console.log('Safety backup (original master untouched until save completes):')
  console.log(' ', stamped)
}

function normSheet(n) {
  return String(n || '')
    .trim()
    .replace(/\s+/g, ' ')
}

function lookupCategorySlug(masterSheetName) {
  const n = normSheet(masterSheetName).toLowerCase()
  const nk = Object.keys(SHEET_TO_CATEGORY).find((k) => normSheet(k).toLowerCase() === n)
  return nk ? SHEET_TO_CATEGORY[nk] : 'accessories'
}

function masterKeyFromStock(stockSheetName, masterSheets) {
  const t = normSheet(stockSheetName)
  const hit = masterSheets.find((s) => normSheet(s) === t)
  if (hit) return hit
  const tl = t.toLowerCase()
  return masterSheets.find((s) => normSheet(s).toLowerCase() === tl) || null
}

function cellStr(v) {
  if (v == null) return ''
  if (typeof v === 'object' && v.text != null) return String(v.text).trim()
  if (typeof v === 'object' && v.richText)
    return v.richText.map((x) => x.text).join('').trim()
  return String(v).trim()
}

function looksLikeBarcode(s) {
  const t = cellStr(s).replace(/\s/g, '')
  return /^\d{5,12}$/.test(t)
}

function looksLikeName(s) {
  const t = cellStr(s)
  if (!t || t.length < 2) return false
  if (t.startsWith('http')) return false
  if (/^\d+$/.test(t.replace(/\s/g, ''))) return false
  return /[a-zA-Z\u0600-\u06FF]/.test(t)
}

function resolveStockColumns(matrix) {
  const maxScan = Math.min(15, matrix.length)
  for (let hr = 0; hr < maxScan; hr++) {
    const row = (matrix[hr] || []).map((c) => cellStr(c).toLowerCase())
    const nameIdx = row.findIndex((h) => h === 'name' || h === '*')
    const barIdx = row.findIndex((h) => h.includes('barcode'))
    if (nameIdx >= 0 && barIdx >= 0) {
      const qtyIdx = row.findIndex(
        (h, i) => i !== barIdx && h.includes('quantity') && !h.includes('on hand')
      )
      const witbIdx = row.findIndex((h) => h.includes('witb') || h.includes('what'))
      return {
        headerRow: hr,
        nameIdx,
        barIdx,
        qtyIdx: qtyIdx >= 0 ? qtyIdx : row.findIndex((h) => h.includes('quantity')),
        witbIdx: witbIdx >= 0 ? witbIdx : -1,
      }
    }
  }
  return { headerRow: -1, nameIdx: 0, barIdx: 1, qtyIdx: 2, witbIdx: 3 }
}

function extractStockRows(matrix, col) {
  const out = []
  const start = col.headerRow >= 0 ? col.headerRow + 1 : 0
  for (let i = start; i < matrix.length; i++) {
    const row = matrix[i] || []
    const name = row[col.nameIdx]
    const barcode = row[col.barIdx]
    if (!looksLikeBarcode(barcode)) continue
    let n = cellStr(name)
    const b = cellStr(barcode).replace(/\s/g, '')
    if (!looksLikeName(name)) {
      n = `Barcode ${b} (no name in Stock export — infer full product identity from barcode & category)`
    }
    if (n.startsWith('http')) continue
    const qty =
      col.qtyIdx >= 0 && row[col.qtyIdx] != null && row[col.qtyIdx] !== ''
        ? Number(row[col.qtyIdx])
        : 1
    const witb = col.witbIdx >= 0 ? cellStr(row[col.witbIdx]) : ''
    out.push({
      name: n,
      barcode: b,
      quantity: Number.isFinite(qty) && qty >= 0 ? qty : 1,
      witb,
    })
  }
  return out
}

async function sheetToMatrix(ws) {
  const matrix = []
  ws.eachRow({ includeEmpty: true }, (row, rowNumber) => {
    const r = []
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      while (r.length < colNumber) r.push(null)
      r[colNumber - 1] = cell.value
    })
    matrix[rowNumber - 1] = r
  })
  return matrix
}

async function readMasterBarcodeSets(masterPath) {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(masterPath)
  const map = new Map()
  for (const ws of wb.worksheets) {
    const rows = await sheetToMatrix(ws)
    if (!rows[0]) continue
    const headers = rows[0].map((h) => cellStr(h).toLowerCase())
    const bi = headers.findIndex((h) => h === 'barcode')
    if (bi < 0) continue
    const set = new Set()
    for (let r = 1; r < rows.length; r++) {
      const b = cellStr(rows[r][bi]).replace(/\s/g, '')
      if (looksLikeBarcode(b)) set.add(b)
    }
    map.set(ws.name, set)
  }
  return { masterWb: wb, barcodeSets: map }
}

function detectBrand(name) {
  const lower = name.toLowerCase()
  for (const [key, slug] of Object.entries(KNOWN_BRANDS)) {
    if (lower.includes(key)) return slug
  }
  return 'flix'
}

function withWeeklyMonthly(daily) {
  return {
    daily,
    weekly: Math.round(daily * WEEKLY_FACTOR),
    monthly: Math.round(daily * MONTHLY_FACTOR),
  }
}

function lookupPrice(name, categorySlug) {
  const lower = name.toLowerCase()
  for (const [key, p] of Object.entries(SAUDI_MARKET_HINTS)) {
    if (lower.includes(key)) return { ...p }
  }
  const cd = {
    cameras: 300,
    lenses: 150,
    lighting: 200,
    'lighting-accessories': 50,
    accessories: 75,
    'tripods-gimbals': 150,
    monitors: 150,
    audio: 100,
    power: 50,
    grip: 50,
    'cases-bags': 25,
    'live-production': 400,
  }
  const daily = cd[categorySlug] || 100
  return withWeeklyMonthly(daily)
}

function generateSKU(brand, name, barcode) {
  const b = (brand || 'FLIX').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 5)
  const modelParts = name
    .toUpperCase()
    .replace(/[^A-Z0-9\s]/g, '')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 3)
    .join('-')
    .slice(0, 20)
  const suffix = barcode ? barcode.slice(-3) : '001'
  return `${b}-${modelParts}-${suffix}`
}

function determineBudgetTier(daily) {
  if (daily >= 500) return 'PREMIUM'
  if (daily >= 150) return 'PROFESSIONAL'
  return 'ESSENTIAL'
}

function determineFeatured(name, daily) {
  const hero = [
    'alexa',
    'mavic',
    'teradek',
    'easyrig',
    'atomos neon',
    'ultimatte',
    'atem',
    'red komodo',
    'komodo',
    'raptor',
    'v-raptor',
    'dsmc',
    'red digital',
  ]
  const lower = name.toLowerCase()
  if (hero.some((k) => lower.includes(k))) return true
  if (daily >= 500) return true
  return false
}

function determineRequiresAssistant(name, category) {
  const k = ['alexa', 'hydra', 'nanlux', 'easyrig', 'ultimatte', 'atem', 'float', 'dolly', 'komodo', 'raptor']
  const lower = name.toLowerCase()
  if (k.some((x) => lower.includes(x))) return true
  if (category === 'live-production') return true
  return false
}

function determineCondition(categorySlug, name) {
  const lower = name.toLowerCase()
  if (lower.includes('alexa') || lower.includes('ultra prime') || lower.includes('nanlux'))
    return 'EXCELLENT'
  if (['cameras', 'lenses', 'monitors'].includes(categorySlug)) return 'EXCELLENT'
  return 'GOOD'
}

function buildAIPrompt(item, price) {
  return `You are a senior rental catalog editor for FlixCam (premium cinema gear in Riyadh, Saudi Arabia).

ITEM NAME (warehouse): ${item.name}
DETECTED BRAND SLUG: ${item.brand_slug}
PRODUCT CATEGORY SLUG: ${item.category_slug}
SUGGESTED SAR DAILY RATE (editorial hint only): ${price.daily}
WITB / KIT NOTES: ${item.witb || 'Not provided — infer typical rental kit realistically'}

Respond with ONLY JSON (no markdown, no backticks).

{
  "name_en": "...",
  "name_ar": "...",
  "name_zh": "...",
  "shortDescription_en": "...",
  "shortDescription_ar": "...",
  "shortDescription_zh": "...",
  "longDescription_en": "150–220 words.",
  "longDescription_ar": "150–220 words.",
  "longDescription_zh": "150–220 words.",
  "description_en": "...",
  "description_ar": "...",
  "description_zh": "...",
  "seoTitle_en": "55–60 chars, FlixCam + Riyadh rental",
  "seoTitle_ar": "50–60 chars",
  "seoTitle_zh": "50–60 chars",
  "seoDescription_en": "155–160 chars strong CTA",
  "seoDescription_ar": "150–160 chars",
  "seoDescription_zh": "150–160 chars",
  "seoKeywords_en": "15–20 comma keywords",
  "seoKeywords_ar": "15–20",
  "seoKeywords_zh": "15–20",
  "tags": "18–24 mixed EN/AR tags comma-separated",
  "boxContents": "Realistic comma list / line breaks OK",
  "specifications_notes": "Three blocks with exact headings:\\n\\n1. SHORT SPECS\\n- bullets\\n\\n2. FULL SPECS\\nkey: value\\n\\n3. TECHNICIAN SPECS\\ntechnical detail"
}

Rules: every string non-empty; specs credible; rental language; no fake legal claims.`
}

function parseAIResponse(raw) {
  const strategies = [
    () => JSON.parse(raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()),
    () => {
      const m = raw.match(/\{[\s\S]*\}/)
      if (!m) throw new Error('no json')
      return JSON.parse(m[0])
    },
  ]
  for (const s of strategies) {
    try {
      const o = s()
      if (o && typeof o === 'object') return o
    } catch (_) {
      /* next */
    }
  }
  return {}
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms))
}

async function callGemini(model, prompt, retries = 3) {
  for (let a = 1; a <= retries; a++) {
    try {
      const result = await model.generateContent(prompt)
      const text = result.response.text()
      return parseAIResponse(text)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      if (/429|quota|RATE_LIMIT|exhausted/i.test(msg)) await sleep(a * 15000)
      else await sleep(2000 * a)
    }
  }
  return {}
}

function filledRowArray(item, ai, price, headers) {
  const brand = item.brand_slug || detectBrand(item.name)
  const sku = generateSKU(brand, item.name, item.barcode)
  const featured = determineFeatured(item.name, price.daily)
  const reqA = determineRequiresAssistant(item.name, item.category_slug)
  const cond = determineCondition(item.category_slug, item.name)
  const tier = determineBudgetTier(price.daily)
  const T = (k, alt = '') => String(ai[k] ?? alt ?? '').trim()

  const data = {
    sku,
    model: T('name_en', item.name),
    category_slug: item.category_slug,
    brand_slug: brand,
    condition: cond,
    quantityTotal: String(item.quantity),
    quantityAvailable: String(item.quantity),
    dailyPrice: String(price.daily),
    weeklyPrice: String(price.weekly),
    monthlyPrice: String(price.monthly),
    purchasePrice: '',
    depositAmount: String(Math.round(price.daily * 3)),
    requiresDeposit: price.daily >= 200 ? 'true' : 'false',
    featured: featured ? 'true' : 'false',
    isActive: 'true',
    requiresAssistant: reqA ? 'true' : 'false',
    budgetTier: tier,
    warehouseLocation: '',
    barcode: item.barcode,
    tags: T('tags'),
    boxContents: T('boxContents', item.witb),
    bufferTime: '0',
    bufferTimeUnit: 'hours',
    featuredImageUrl: '',
    galleryImageUrls: '',
    videoUrl: '',
    name_ar: T('name_ar'),
    name_en: T('name_en', item.name),
    name_zh: T('name_zh'),
    description_ar: T('description_ar', T('shortDescription_ar')),
    description_en: T('description_en', T('shortDescription_en')),
    description_zh: T('description_zh', T('shortDescription_zh')),
    shortDescription_ar: T('shortDescription_ar'),
    shortDescription_en: T('shortDescription_en'),
    shortDescription_zh: T('shortDescription_zh'),
    longDescription_ar: T('longDescription_ar'),
    longDescription_en: T('longDescription_en'),
    longDescription_zh: T('longDescription_zh'),
    seoTitle_ar: T('seoTitle_ar'),
    seoTitle_en: T('seoTitle_en'),
    seoTitle_zh: T('seoTitle_zh'),
    seoDescription_ar: T('seoDescription_ar'),
    seoDescription_en: T('seoDescription_en'),
    seoDescription_zh: T('seoDescription_zh'),
    seoKeywords_ar: T('seoKeywords_ar'),
    seoKeywords_en: T('seoKeywords_en'),
    seoKeywords_zh: T('seoKeywords_zh'),
    specifications_notes: T('specifications_notes'),
  }

  return headers.map((h) => (h ? data[h] ?? '' : ''))
}

async function appendToWorkbook(masterPath, rowsBySheet, outPath) {
  const wb = new ExcelJS.Workbook()
  await wb.xlsx.readFile(masterPath)
  for (const [sheetKey, rows] of Object.entries(rowsBySheet)) {
    if (!rows || !rows.length) continue
    const ws = wb.getWorksheet(sheetKey)
    if (!ws) {
      console.warn('Missing worksheet:', sheetKey)
      continue
    }
    for (const vals of rows) ws.addRow(vals)
  }
  await wb.xlsx.writeFile(outPath)
}

async function main() {
  const args = parseArgs(process.argv)
  if (!args.master || !args.stock) {
    console.error(
      'Usage: node scripts/merge-new-stock-into-flixcam.cjs --master ./Flixcam_invetory.xlsx --stock "./Flix Stock …(4).xlsx" [--out ./out.xlsx] [--keywords alexa,komodo,red]'
    )
    process.exit(1)
  }
  if (!fs.existsSync(args.master) || !fs.existsSync(args.stock)) {
    console.error('File not found')
    process.exit(1)
  }

  const apiKey = process.env.GEMINI_API_KEY || ''
  if (!args.dryRun && !apiKey.trim()) {
    console.error(
      'Set GEMINI_API_KEY in project .env or the environment (unless --dry-run).'
    )
    process.exit(1)
  }

  const { barcodeSets } = await readMasterBarcodeSets(args.master)
  const masterSheetNames = [...barcodeSets.keys()]

  const headersBySheet = {}
  {
    const tmp = new ExcelJS.Workbook()
    await tmp.xlsx.readFile(args.master)
    for (const ws of tmp.worksheets) {
      const m = await sheetToMatrix(ws)
      headersBySheet[ws.name] = (m[0] || []).map((c) => cellStr(c))
    }
  }

  const stockWb = new ExcelJS.Workbook()
  await stockWb.xlsx.readFile(args.stock)

  let grouped = {}
  let totalNew = 0

  for (const sws of stockWb.worksheets) {
    const mk = masterKeyFromStock(sws.name, masterSheetNames)
    if (!mk) {
      console.warn('Stock sheet unmatched:', sws.name)
      continue
    }
    const categorySlug = lookupCategorySlug(mk)
    const matrix = await sheetToMatrix(sws)
    const coldef = resolveStockColumns(matrix)
    const stockRows = extractStockRows(matrix, coldef)
    const existing = barcodeSets.get(mk) || new Set()

    for (const r of stockRows) {
      if (!r.barcode || existing.has(r.barcode)) continue
      existing.add(r.barcode)
      totalNew++
      if (!grouped[mk]) grouped[mk] = []
      grouped[mk].push({
        sheet: mk,
        name: r.name,
        barcode: r.barcode,
        quantity: r.quantity,
        witb: r.witb,
        category_slug: categorySlug,
        brand_slug: detectBrand(r.name),
      })
    }
  }

  if (args.keywords && args.keywords.trim()) {
    const before = totalNew
    grouped = filterGrouped(grouped, args.keywords)
    totalNew = Object.values(grouped).reduce((sum, rows) => sum + rows.length, 0)
    console.log(`--keywords "${args.keywords}": kept ${totalNew} of ${before} new row(s)`)
  }

  console.log(
    `New SKUs to append (existing rows / Alexa & RED already in master are NOT modified): ${totalNew}`
  )
  if (args.dryRun) {
    for (const [sh, arr] of Object.entries(grouped)) {
      for (const it of arr) console.log(`${sh}\t${it.barcode}\t${it.name}`)
    }
    return
  }

  fs.mkdirSync(path.dirname(PROGRESS_PATH), { recursive: true })
  let progress = {}
  if (fs.existsSync(PROGRESS_PATH)) {
    try {
      progress = JSON.parse(fs.readFileSync(PROGRESS_PATH, 'utf8'))
    } catch (_) {
      progress = {}
    }
  }

  const genAI = new GoogleGenerativeAI(apiKey.trim())
  const model = genAI.getGenerativeModel({ model: MODEL_NAME })

  const pending = []
  for (const arr of Object.values(grouped))
    for (const it of arr) pending.push(it)

  /** @type {Record<string, Array<Array<string|number>>>} */
  const outRows = {}

  for (const item of pending) {
    const key = `${item.sheet}::${item.barcode}`
    const price = lookupPrice(item.name, item.category_slug)
    let ai = progress[key]
    if (!ai || !ai.name_en) {
      ai = await callGemini(model, buildAIPrompt(item, price))
      progress[key] = ai
      fs.writeFileSync(PROGRESS_PATH, JSON.stringify(progress))
    }

    const hdrs = headersBySheet[item.sheet]
    if (!hdrs || hdrs.length < 10) continue

    const row = filledRowArray(item, ai, price, hdrs)
    if (!outRows[item.sheet]) outRows[item.sheet] = []
    outRows[item.sheet].push(row)
    console.log(`OK ${item.barcode} ${item.name.slice(0, 52)}`)

    await sleep(args.delayMs)
  }

  const dest =
    args.out || args.master.replace(/\.xlsx$/i, `.updated.${Date.now()}.xlsx`)

  backupMasterSameAsDest(args.master, dest, args.noBackup)
  await appendToWorkbook(args.master, outRows, dest)
  console.log('\nSaved:', path.resolve(dest))
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
