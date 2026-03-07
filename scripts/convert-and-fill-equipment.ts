/**
 * Full Equipment Conversion + AI Fill Pipeline
 *
 * Reads the Flix Stock inventory XLSX, converts every sheet to the standard
 * equipment-import-template format, then calls Gemini to fill ALL fields:
 *   - Names (EN/AR/ZH)
 *   - Descriptions (short, long) in 3 languages
 *   - SEO (title, description, keywords) in 3 languages
 *   - Specifications (SHORT / FULL / TECHNICIAN)
 *   - Tags, brand, category, SKU, condition, budgetTier, featured, requiresAssistant
 *   - Daily/weekly/monthly prices (researched from Saudi rental market)
 *   - Box contents
 *
 * Usage:
 *   npx tsx scripts/convert-and-fill-equipment.ts [path-to-xlsx]
 *
 * Outputs:
 *   docs/templates/equipment-full-ai-filled.xlsx
 *   docs/templates/equipment-full-ai-filled.csv
 *   docs/templates/equipment-ai-progress.json  (checkpoint)
 */

import * as fs from 'fs'
import * as path from 'path'
import XLSX from '@e965/xlsx'
import { GoogleGenerativeAI } from '@google/generative-ai'

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'AIzaSyBNoiZ-ky8diZxKMFShoTwR3IawAStPECQ'
const MODEL_NAME = 'gemini-2.0-flash'

const genAI = new GoogleGenerativeAI(GEMINI_API_KEY)
const model = genAI.getGenerativeModel({ model: MODEL_NAME })

const TEMPLATES_DIR = path.join(process.cwd(), 'docs', 'templates')
const PROGRESS_FILE = path.join(TEMPLATES_DIR, 'equipment-ai-progress.json')

const SHEET_TO_CATEGORY: Record<string, string> = {
  'Camera': 'cameras',
  'Camera Acc': 'accessories',
  'Lenses': 'lenses',
  'Tripodgimbals': 'tripods-gimbals',
  'Boxes': 'cases-bags',
  'Light': 'lighting',
  'Light Acc': 'lighting-accessories',
  'Grips': 'grip',
  'monitors': 'monitors',
  'Battery': 'power',
  'Sound': 'audio',
  'Live and mixing': 'live-production',
}

const KNOWN_BRANDS: Record<string, string> = {
  'sony': 'sony',
  'arri': 'arri',
  'red': 'red',
  'canon': 'canon',
  'nikon': 'nikon',
  'blackmagic': 'blackmagic',
  'bmpcc': 'blackmagic',
  'godox': 'godox',
  'aputure': 'aputure',
  'apture': 'aputure',
  'nanlux': 'nanlux',
  'nanlite': 'nanlite',
  'tilta': 'tilta',
  'dji': 'dji',
  'ronin': 'dji',
  'sennheiser': 'sennheiser',
  'rode': 'rode',
  'zoom': 'zoom',
  'saramonic': 'saramonic',
  'sigma': 'sigma',
  'zeiss': 'zeiss',
  'dzofilm': 'dzofilm',
  'smallhd': 'smallhd',
  'atomos': 'atomos',
  'vaxis': 'vaxis',
  'teradek': 'teradek',
  'easyrig': 'easyrig',
  'flycam': 'flycam',
  'benro': 'benro',
  'manfrotto': 'manfrotto',
  'gopro': 'gopro',
  'brinno': 'brinno',
  'ikan': 'ikan',
  'sekonic': 'sekonic',
  'tiffen': 'tiffen',
  'schneider': 'schneider',
  'metabones': 'metabones',
  'meike': 'meike',
  'nisi': 'nisi',
  'gvm': 'gvm',
  'amaran': 'aputure',
  'astera': 'astera',
  'phottix': 'phottix',
  'selens': 'selens',
  'lifefoto': 'lifefoto',
  'pottix': 'phottix',
  'swit': 'swit',
  'innox': 'innox',
  'blueshape': 'blueshape',
  'blushape': 'blueshape',
  'blue shape': 'blueshape',
  'newell': 'newell',
  'vemico': 'vemico',
  'lowepro': 'lowepro',
  'orca': 'orca',
  'porta': 'portabrace',
  'impact': 'impact',
  'e-image': 'e-image',
  'luawa': 'laowa',
  'laowa': 'laowa',
  'revar': 'revar-cine',
  'r&m': 'r-and-m',
  'gobox': 'gobox',
}

const SAUDI_MARKET_PRICES: Record<string, { daily: number; weekly: number; monthly: number }> = {
  'sony a7siii': { daily: 300, weekly: 1200, monthly: 3500 },
  'sony a7r5': { daily: 350, weekly: 1400, monthly: 4000 },
  'brinno': { daily: 150, weekly: 600, monthly: 1800 },
  'gopro': { daily: 100, weekly: 400, monthly: 1200 },
  'arri alexa 35': { daily: 5500, weekly: 22000, monthly: 55000 },
  'arri alexa mini lf': { daily: 3850, weekly: 15400, monthly: 38500 },
  'red komodo': { daily: 1320, weekly: 5280, monthly: 13200 },
  'sony fx6': { daily: 550, weekly: 2200, monthly: 5500 },
  'sony fx3': { daily: 400, weekly: 1600, monthly: 4000 },
  'sony fx9': { daily: 1540, weekly: 6160, monthly: 15400 },
  'blackmagic ursa mini pro': { daily: 239, weekly: 956, monthly: 2390 },
  'teradek bolt': { daily: 400, weekly: 1600, monthly: 4000 },
  'tilta nucleus': { daily: 200, weekly: 800, monthly: 2000 },
  'director cage': { daily: 75, weekly: 300, monthly: 750 },
  'sekonic': { daily: 100, weekly: 400, monthly: 1000 },
  'cfexpress reader': { daily: 50, weekly: 200, monthly: 500 },
  'filter': { daily: 50, weekly: 200, monthly: 500 },
  'nd filter': { daily: 50, weekly: 200, monthly: 500 },
  'matte box': { daily: 150, weekly: 600, monthly: 1500 },
  'mount adapter': { daily: 75, weekly: 300, monthly: 750 },
  'converter': { daily: 100, weekly: 400, monthly: 1000 },
  'ronin rs4': { daily: 250, weekly: 1000, monthly: 2500 },
  'slider': { daily: 200, weekly: 800, monthly: 2000 },
  'tilta float': { daily: 500, weekly: 2000, monthly: 5000 },
  'tilta hydra arm': { daily: 600, weekly: 2400, monthly: 6000 },
  'flycam flowline': { daily: 300, weekly: 1200, monthly: 3000 },
  'easyrig': { daily: 500, weekly: 2000, monthly: 5000 },
  'benro tripod': { daily: 75, weekly: 300, monthly: 750 },
  'tripod': { daily: 75, weekly: 300, monthly: 750 },
  'dolly': { daily: 200, weekly: 800, monthly: 2000 },
  'hi hat': { daily: 50, weekly: 200, monthly: 500 },
  'hard case': { daily: 25, weekly: 100, monthly: 250 },
  'casebag': { daily: 25, weekly: 100, monthly: 250 },
  'backbag': { daily: 25, weekly: 100, monthly: 250 },
  'gvm': { daily: 100, weekly: 400, monthly: 1000 },
  'aputure 300d': { daily: 250, weekly: 1000, monthly: 2500 },
  'aputure 600d': { daily: 325, weekly: 1300, monthly: 3250 },
  'aputure 600c': { daily: 400, weekly: 1600, monthly: 4000 },
  'aputure cs 1500': { daily: 880, weekly: 3520, monthly: 8800 },
  'nanlux 1200d': { daily: 600, weekly: 2400, monthly: 6000 },
  'godox ad600': { daily: 200, weekly: 800, monthly: 2000 },
  'godox ad400': { daily: 150, weekly: 600, monthly: 1500 },
  'godox ad1200': { daily: 400, weekly: 1600, monthly: 4000 },
  'amaran f22c': { daily: 100, weekly: 400, monthly: 1000 },
  'tube light': { daily: 75, weekly: 300, monthly: 750 },
  'astera titan': { daily: 200, weekly: 800, monthly: 2000 },
  'mc 12 light': { daily: 150, weekly: 600, monthly: 1500 },
  'smoke machine': { daily: 200, weekly: 800, monthly: 2000 },
  'haze': { daily: 389, weekly: 1556, monthly: 3890 },
  'fog machine': { daily: 200, weekly: 800, monthly: 2000 },
  'infinibar': { daily: 150, weekly: 600, monthly: 1500 },
  'softbox': { daily: 50, weekly: 200, monthly: 500 },
  'fresnel': { daily: 75, weekly: 300, monthly: 750 },
  'light dome': { daily: 50, weekly: 200, monthly: 500 },
  'lantern': { daily: 50, weekly: 200, monthly: 500 },
  'beauty dish': { daily: 50, weekly: 200, monthly: 500 },
  'spacelight': { daily: 25, weekly: 100, monthly: 250 },
  'diffuser': { daily: 25, weekly: 100, monthly: 250 },
  'reflector': { daily: 25, weekly: 100, monthly: 250 },
  'scrim': { daily: 50, weekly: 200, monthly: 500 },
  'cloth': { daily: 50, weekly: 200, monthly: 500 },
  'chroma': { daily: 100, weekly: 400, monthly: 1000 },
  'muslin': { daily: 50, weekly: 200, monthly: 500 },
  'light cone': { daily: 25, weekly: 100, monthly: 250 },
  'umbrella': { daily: 25, weekly: 100, monthly: 250 },
  'strip': { daily: 30, weekly: 120, monthly: 300 },
  'butterfly': { daily: 75, weekly: 300, monthly: 750 },
  'air tube': { daily: 50, weekly: 200, monthly: 500 },
  'spotlight mount': { daily: 50, weekly: 200, monthly: 500 },
  'tube holder': { daily: 25, weekly: 100, monthly: 250 },
  'apple box': { daily: 25, weekly: 100, monthly: 250 },
  'q-drop': { daily: 50, weekly: 200, monthly: 500 },
  'wheels': { daily: 25, weekly: 100, monthly: 250 },
  'vaxis': { daily: 200, weekly: 800, monthly: 2000 },
  'atomos neon': { daily: 500, weekly: 2000, monthly: 5000 },
  'atomos shinobi': { daily: 75, weekly: 300, monthly: 750 },
  'atomos shogun': { daily: 200, weekly: 800, monthly: 2000 },
  'smallhd ultra 7': { daily: 200, weekly: 800, monthly: 2000 },
  'smallhd ultra 5': { daily: 150, weekly: 600, monthly: 1500 },
  'b mount battery': { daily: 75, weekly: 300, monthly: 750 },
  'v mount battery': { daily: 50, weekly: 200, monthly: 500 },
  'v mount charger': { daily: 50, weekly: 200, monthly: 500 },
  'b mount charger': { daily: 50, weekly: 200, monthly: 500 },
  'np-f': { daily: 15, weekly: 60, monthly: 150 },
  'np-fz100': { daily: 25, weekly: 100, monthly: 250 },
  'charger': { daily: 25, weekly: 100, monthly: 250 },
  'battery': { daily: 25, weekly: 100, monthly: 250 },
  'xlr cable': { daily: 15, weekly: 60, monthly: 150 },
  'aux cable': { daily: 10, weekly: 40, monthly: 100 },
  'rode link': { daily: 150, weekly: 600, monthly: 1500 },
  'sennheiser ew': { daily: 200, weekly: 800, monthly: 2000 },
  'sennheiser mke 600': { daily: 150, weekly: 600, monthly: 1500 },
  'sennheiser mzx': { daily: 100, weekly: 400, monthly: 1000 },
  'rode mic': { daily: 75, weekly: 300, monthly: 750 },
  'saramonic': { daily: 100, weekly: 400, monthly: 1000 },
  'zoom f6': { daily: 200, weekly: 800, monthly: 2000 },
  'lavalier': { daily: 75, weekly: 300, monthly: 750 },
  'ultimatte': { daily: 400, weekly: 1600, monthly: 4000 },
  'atem': { daily: 500, weekly: 2000, monthly: 5000 },
  'auto q': { daily: 300, weekly: 1200, monthly: 3000 },
  'arri zeiss ultra prime': { daily: 1500, weekly: 6000, monthly: 15000 },
  'dzofilm pictor': { daily: 400, weekly: 1600, monthly: 4000 },
  'sigma art 24-70': { daily: 175, weekly: 700, monthly: 1750 },
  'sigma art 135': { daily: 150, weekly: 600, monthly: 1500 },
  'sigma art 50': { daily: 125, weekly: 500, monthly: 1250 },
  'sigma art 35': { daily: 125, weekly: 500, monthly: 1250 },
  'sigma art 14-24': { daily: 175, weekly: 700, monthly: 1750 },
  'sony 90 micro': { daily: 150, weekly: 600, monthly: 1500 },
  'laowa 12mm': { daily: 100, weekly: 400, monthly: 1000 },
  'ikan handle': { daily: 50, weekly: 200, monthly: 500 },
  'camera saddle': { daily: 25, weekly: 100, monthly: 250 },
  'rota pola': { daily: 75, weekly: 300, monthly: 750 },
  'godox cs-85d': { daily: 50, weekly: 200, monthly: 500 },
}

interface SourceItem {
  sheet: string
  name: string
  barcode: string
  quantity: number
  witb: string
  category_slug: string
  brand_slug: string
}

interface FilledItem {
  source_sheet: string
  sku: string
  model: string
  category_slug: string
  brand_slug: string
  condition: string
  quantityTotal: string
  quantityAvailable: string
  dailyPrice: string
  weeklyPrice: string
  monthlyPrice: string
  purchasePrice: string
  depositAmount: string
  requiresDeposit: string
  featured: string
  isActive: string
  requiresAssistant: string
  budgetTier: string
  warehouseLocation: string
  barcode: string
  tags: string
  boxContents: string
  bufferTime: string
  bufferTimeUnit: string
  featuredImageUrl: string
  galleryImageUrls: string
  videoUrl: string
  name_ar: string
  name_en: string
  name_zh: string
  description_ar: string
  description_en: string
  description_zh: string
  shortDescription_ar: string
  shortDescription_en: string
  shortDescription_zh: string
  longDescription_ar: string
  longDescription_en: string
  longDescription_zh: string
  seoTitle_ar: string
  seoTitle_en: string
  seoTitle_zh: string
  seoDescription_ar: string
  seoDescription_en: string
  seoDescription_zh: string
  seoKeywords_ar: string
  seoKeywords_en: string
  seoKeywords_zh: string
  specifications_notes: string
}

function detectBrand(name: string): string {
  const lower = name.toLowerCase()
  for (const [key, slug] of Object.entries(KNOWN_BRANDS)) {
    if (lower.includes(key)) return slug
  }
  return ''
}

function lookupPrice(name: string, category: string): { daily: number; weekly: number; monthly: number } {
  const lower = name.toLowerCase()
  for (const [key, price] of Object.entries(SAUDI_MARKET_PRICES)) {
    if (lower.includes(key)) return price
  }
  const catDefaults: Record<string, { daily: number; weekly: number; monthly: number }> = {
    'cameras': { daily: 300, weekly: 1200, monthly: 3000 },
    'lenses': { daily: 150, weekly: 600, monthly: 1500 },
    'lighting': { daily: 200, weekly: 800, monthly: 2000 },
    'lighting-accessories': { daily: 50, weekly: 200, monthly: 500 },
    'accessories': { daily: 75, weekly: 300, monthly: 750 },
    'tripods-gimbals': { daily: 150, weekly: 600, monthly: 1500 },
    'monitors': { daily: 150, weekly: 600, monthly: 1500 },
    'audio': { daily: 100, weekly: 400, monthly: 1000 },
    'power': { daily: 50, weekly: 200, monthly: 500 },
    'grip': { daily: 50, weekly: 200, monthly: 500 },
    'cases-bags': { daily: 25, weekly: 100, monthly: 250 },
    'live-production': { daily: 400, weekly: 1600, monthly: 4000 },
  }
  return catDefaults[category] || { daily: 100, weekly: 400, monthly: 1000 }
}

function generateSKU(brand: string, name: string, barcode: string): string {
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

function determineBudgetTier(daily: number): string {
  if (daily >= 500) return 'PREMIUM'
  if (daily >= 150) return 'PROFESSIONAL'
  return 'ESSENTIAL'
}

function determineFeatured(name: string, daily: number): boolean {
  const heroKeywords = ['alexa', 'red komodo', 'teradek bolt', 'easyrig', 'atomos neon',
    'nanlux 1200', 'aputure 600', 'ultra prime', 'hydra arm', 'ultimatte', 'atem', 'fx3', 'fx6']
  const lower = name.toLowerCase()
  if (heroKeywords.some(k => lower.includes(k))) return true
  if (daily >= 500) return true
  return false
}

function determineRequiresAssistant(name: string, category: string): boolean {
  const assistantKeywords = ['alexa', 'hydra arm', 'nanlux 1200', 'godox ad1200', 'easyrig',
    'ultimatte', 'atem', 'ultra prime', 'float', 'crane', 'dolly', 'smoke machine', 'fog machine', 'haze']
  const lower = name.toLowerCase()
  if (assistantKeywords.some(k => lower.includes(k))) return true
  if (category === 'live-production') return true
  return false
}

function determineCondition(category: string, name: string): string {
  const lower = name.toLowerCase()
  if (lower.includes('alexa') || lower.includes('ultra prime') || lower.includes('nanlux'))
    return 'EXCELLENT'
  if (['cameras', 'lenses', 'monitors'].includes(category)) return 'EXCELLENT'
  if (['lighting', 'audio'].includes(category)) return 'GOOD'
  return 'GOOD'
}

function buildAIPrompt(item: SourceItem, price: { daily: number; weekly: number; monthly: number }): string {
  return `You are a world-class product content specialist for FlixCam, a premium cinema and photography equipment rental company in Riyadh, Saudi Arabia. Generate COMPLETE rental catalog content.

ITEM: ${item.name}
BRAND: ${item.brand_slug || 'detect from name'}
CATEGORY: ${item.category_slug}
DAILY PRICE: ${price.daily} SAR
BOX CONTENTS: ${item.witb || 'not provided — generate typical box contents'}

You MUST return ONLY a valid JSON object (no markdown, no explanation, no backticks).

REQUIRED JSON:
{
  "name_en": "Professional English product name",
  "name_ar": "Arabic name — Gulf Arabic, brand/model stays English",
  "name_zh": "Chinese name — Simplified Mandarin, brand/model in English",

  "shortDescription_en": "2-3 sentences, 200-400 chars. Rental-focused, key features, use cases. Creative and unique — not template.",
  "shortDescription_ar": "Arabic short — natural Gulf Arabic. Include استأجر. NOT literal translation.",
  "shortDescription_zh": "Chinese short — include 租赁. Professional Mandarin.",

  "longDescription_en": "150-250 words. Cover: what it is, who uses it, projects it enables, technical highlights in plain language, why renting makes sense. Must feel written by human expert. Use creative measurement rules: exact mm dimensions, pixel counts, ISO ranges, codec names. UNIQUE for this item.",
  "longDescription_ar": "150-250 words Arabic. Professional Fusha. Rental-focused. Include استأجر, تأجير. Culturally relevant use cases: تصوير صحراوي, إنتاج تجاري, حفلات الزفاف. Sell the experience.",
  "longDescription_zh": "150-250 words Chinese. Professional Mandarin. Include 租赁. Cover use cases for Saudi market.",

  "description_en": "One paragraph product description, creative, seller-focused.",
  "description_ar": "One paragraph Arabic description.",
  "description_zh": "One paragraph Chinese description.",

  "seoTitle_en": "EXACTLY 55-60 chars. Format: Rent {Name} in Riyadh | FlixCam",
  "seoTitle_ar": "50-60 chars Arabic. Include استأجر and الرياض.",
  "seoTitle_zh": "50-60 chars Chinese. Include 租赁 and 利雅得.",

  "seoDescription_en": "EXACTLY 155-160 chars. Rental CTA + key feature + Riyadh + Saudi Arabia + FlixCam. Include: rent, hire, rental, professional, Riyadh, Saudi Arabia, production, cinema, filmmaking.",
  "seoDescription_ar": "150-160 chars Arabic. Include تأجير معدات تصوير, الرياض, السعودية, فليكس كام, إنتاج, سينمائي, إيجار, احترافي.",
  "seoDescription_zh": "150-160 chars Chinese. Include 租赁, 利雅得, 沙特, 专业.",

  "seoKeywords_en": "Comma-separated, 15-20 keywords. MUST include: rent ${item.name}, ${item.brand_slug} rental Riyadh, camera equipment Saudi Arabia, cinema rental, film equipment hire, professional gear rental Riyadh, ${item.category_slug} rental, FlixCam, Saudi film production, video production Riyadh, rent ${item.brand_slug}, equipment hire KSA",
  "seoKeywords_ar": "15-20 Arabic keywords. MUST include: استأجر ${item.name}, تأجير ${item.brand_slug} الرياض, معدات تصوير للإيجار, تأجير معدات سينمائية, فليكس كام, السعودية, إنتاج أفلام, معدات فيديو",
  "seoKeywords_zh": "15-20 Chinese keywords. Include: 租赁 ${item.name}, ${item.brand_slug} 利雅得租赁, 摄影设备, 沙特, FlixCam",

  "tags": "Comma-separated, 15-20 tags. Mix English + Arabic. Include: brand name, category, use cases, technical features, rental, تأجير, معدات, ${item.brand_slug}, ${item.category_slug}",

  "boxContents": "${item.witb || 'Generate typical box contents for ' + item.name}",

  "specifications_notes": "THREE BLOCKS in this exact format:\\n\\n1. SHORT SPECS\\n- 3-5 bullet points (rental highlights, key features, use case)\\n\\n2. FULL SPECS\\nsnake_case key: value pairs. Include ALL of: dimensions (exact mm), weight (kg with condition), resolution (pixel counts), codecs (full names + ratios), ISO range (full + expandable), color science, mount type, power (V/W/Wh), connectivity (HDMI version, SDI, XLR etc), media slots, weather seal, operating temp. Use manufacturer specs — NO unknown/N/A — use [verify] if unsure.\\n\\n3. TECHNICIAN SPECS\\nSame keys as full but with: standards (Rec. 709, DCI-P3), tolerances (±dB), flange distance (mm), exact connector types (HDMI 2.1, SDI 12G), frame rates per resolution, calibration notes. Every spec the model has.\\n\\nFor ${item.category_slug === 'lenses' ? 'LENSES: focal_length, max_aperture, optical_design, elements_groups, min_focus_distance, filter_thread, mount, image_circle, weight, length, weather_seal, gear_pitch' : item.category_slug === 'lighting' ? 'LIGHTING: power_watts, color_temp_range, cri_tlci, output_lux_at_1m, beam_angle, dimming_range, power_source, weight, dimensions, mount, control, wireless' : item.category_slug === 'audio' ? 'AUDIO: pickup_pattern, frequency_response, snr, max_spl, sensitivity, connectivity, phantom_power, weight, dimensions' : item.category_slug === 'monitors' ? 'MONITORS: screen_size, resolution, brightness_nits, color_space, inputs, recording_codecs, lut_support, weight' : 'ALL relevant specs for this product type'}"
}

CRITICAL RULES:
- EVERY field must be filled — NO empty strings
- Descriptions MUST be unique and creative — not template text
- SEO must have LOTS of keywords for search engine optimization
- Arabic must be natural Gulf Arabic — NOT Google Translate
- Chinese must be professional Simplified Mandarin
- Specs must be as detailed as possible from your knowledge
- This is for a RENTAL company — always use rent/hire/rental language
- Include Saudi Arabia, Riyadh, KSA in SEO
- Reference competitors: qsmrent, filmrent, grabgrip for SEO context

Return ONLY the JSON. No markdown. No backticks. No explanation.`
}

function parseAIResponse(raw: string): Record<string, string> {
  const strategies = [
    () => {
      const cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim()
      return JSON.parse(cleaned)
    },
    () => {
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('no JSON object')
      return JSON.parse(match[0])
    },
    () => {
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('no JSON object')
      const fixed = match[0].replace(/,\s*}/g, '}').replace(/,\s*]/g, ']')
      return JSON.parse(fixed)
    },
    () => {
      const match = raw.match(/\{[\s\S]*\}/)
      if (!match) throw new Error('no JSON object')
      let fixed = match[0]
        .replace(/,\s*}/g, '}')
        .replace(/,\s*]/g, ']')
        .replace(/\n/g, '\\n')
        .replace(/\r/g, '')
        .replace(/\t/g, '\\t')
      return JSON.parse(fixed)
    },
  ]
  for (const strategy of strategies) {
    try {
      const result = strategy()
      if (result && typeof result === 'object') return result
    } catch { /* try next */ }
  }
  return {}
}

function hasRequiredKeys(obj: Record<string, string>): boolean {
  const essentialKeys = ['name_en', 'shortDescription_en', 'seoTitle_en', 'name_ar', 'specifications_notes']
  return essentialKeys.some(k => obj[k] && String(obj[k]).length > 5)
}

async function callGemini(prompt: string, itemName: string, retries = 3): Promise<Record<string, string>> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await model.generateContent(prompt)
      const text = result.response.text()
      const parsed = parseAIResponse(text)
      if (hasRequiredKeys(parsed)) {
        return parsed
      }
      const keys = Object.keys(parsed).slice(0, 5)
      console.warn(`  [${itemName}] Attempt ${attempt}: parsed ${Object.keys(parsed).length} keys (${keys.join(',')}) but missing essentials`)
      if (Object.keys(parsed).length > 3) return parsed
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err)
      if (msg.includes('429') || msg.includes('quota') || msg.includes('RATE_LIMIT') || msg.includes('Resource has been exhausted')) {
        const wait = attempt * 20000
        console.warn(`  [${itemName}] Rate limited (attempt ${attempt}). Waiting ${wait / 1000}s...`)
        await sleep(wait)
      } else {
        console.warn(`  [${itemName}] Attempt ${attempt} error: ${msg.substring(0, 100)}`)
        await sleep(3000 * attempt)
      }
    }
  }
  return {}
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

function extractItems(filePath: string): SourceItem[] {
  const wb = XLSX.readFile(filePath)
  const items: SourceItem[] = []

  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName]
    const data: unknown[][] = XLSX.utils.sheet_to_json(ws, { header: 1 })
    if (data.length < 2) continue

    const headers = (data[0] as string[]).map(h => String(h ?? '').toLowerCase().trim())
    const nameIdx = headers.findIndex(h => h === 'name' || h === '*' || h === 'name ')
    const barcodeIdx = headers.findIndex(h => h.includes('barcode'))
    const qtyIdx = headers.findIndex(h => h.includes('quantity') && !h.includes('on hand'))
    const witbIdx = headers.findIndex(h => h.includes('witb') || h.includes('what'))

    const cleanSheet = sheetName.trim()
    const category = SHEET_TO_CATEGORY[cleanSheet] || 'accessories'

    for (let i = 1; i < data.length; i++) {
      const row = data[i] as unknown[]
      if (!row || !row[nameIdx]) continue
      const rawName = String(row[nameIdx]).trim()
      if (!rawName || rawName.startsWith('http')) continue

      items.push({
        sheet: cleanSheet,
        name: rawName,
        barcode: barcodeIdx >= 0 ? String(row[barcodeIdx] ?? '') : '',
        quantity: qtyIdx >= 0 ? Number(row[qtyIdx]) || 1 : 1,
        witb: witbIdx >= 0 ? String(row[witbIdx] ?? '') : '',
        category_slug: category,
        brand_slug: detectBrand(rawName),
      })
    }
  }
  return items
}

function toString(val: unknown): string {
  if (val == null) return ''
  if (Array.isArray(val)) return val.join(', ')
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}

function buildFilledRow(item: SourceItem, ai: Record<string, string>, price: { daily: number; weekly: number; monthly: number }): FilledItem {
  const sku = generateSKU(item.brand_slug, item.name, item.barcode)
  const featured = determineFeatured(item.name, price.daily)
  const requiresAssistant = determineRequiresAssistant(item.name, item.category_slug)
  const condition = determineCondition(item.category_slug, item.name)
  const budgetTier = determineBudgetTier(price.daily)

  return {
    source_sheet: item.sheet,
    sku,
    model: ai.name_en || item.name,
    category_slug: item.category_slug,
    brand_slug: item.brand_slug || (ai.brand_slug ? String(ai.brand_slug).toLowerCase() : ''),
    condition,
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
    requiresAssistant: requiresAssistant ? 'true' : 'false',
    budgetTier,
    warehouseLocation: '',
    barcode: item.barcode,
    tags: toString(ai.tags),
    boxContents: toString(ai.boxContents) || item.witb || '',
    bufferTime: '0',
    bufferTimeUnit: 'hours',
    featuredImageUrl: '',
    galleryImageUrls: '',
    videoUrl: '',
    name_ar: toString(ai.name_ar),
    name_en: toString(ai.name_en) || item.name,
    name_zh: toString(ai.name_zh),
    description_ar: toString(ai.description_ar) || toString(ai.shortDescription_ar),
    description_en: toString(ai.description_en) || toString(ai.shortDescription_en),
    description_zh: toString(ai.description_zh) || toString(ai.shortDescription_zh),
    shortDescription_ar: toString(ai.shortDescription_ar),
    shortDescription_en: toString(ai.shortDescription_en),
    shortDescription_zh: toString(ai.shortDescription_zh),
    longDescription_ar: toString(ai.longDescription_ar),
    longDescription_en: toString(ai.longDescription_en),
    longDescription_zh: toString(ai.longDescription_zh),
    seoTitle_ar: toString(ai.seoTitle_ar),
    seoTitle_en: toString(ai.seoTitle_en),
    seoTitle_zh: toString(ai.seoTitle_zh),
    seoDescription_ar: toString(ai.seoDescription_ar),
    seoDescription_en: toString(ai.seoDescription_en),
    seoDescription_zh: toString(ai.seoDescription_zh),
    seoKeywords_ar: toString(ai.seoKeywords_ar),
    seoKeywords_en: toString(ai.seoKeywords_en),
    seoKeywords_zh: toString(ai.seoKeywords_zh),
    specifications_notes: toString(ai.specifications_notes),
  }
}

function escapeCsv(val: unknown): string {
  if (val == null) return ''
  const str = Array.isArray(val) ? val.join(', ') : String(val)
  if (!str) return ''
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

async function main() {
  const inputPath = process.argv[2] ||
    path.join(process.env.HOME || '', 'Downloads', 'Flix Stock invintory  (3) (1).xlsx')

  if (!fs.existsSync(inputPath)) {
    console.error('Source file not found:', inputPath)
    process.exit(1)
  }

  console.log('=== FlixCam Equipment Conversion + AI Fill Pipeline ===')
  console.log('Source:', inputPath)
  console.log('')

  const items = extractItems(inputPath)
  console.log(`Extracted ${items.length} items from source XLSX`)

  let progress: Record<string, Record<string, string>> = {}
  if (fs.existsSync(PROGRESS_FILE)) {
    try {
      progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'))
      console.log(`Loaded ${Object.keys(progress).length} cached AI results`)
    } catch {
      progress = {}
    }
  }

  const CONCURRENT = 3
  const DELAY_BETWEEN_ITEMS_MS = 1500
  let processed = 0
  let cached = 0
  let failed = 0

  for (let i = 0; i < items.length; i += CONCURRENT) {
    const batch = items.slice(i, i + CONCURRENT)
    const promises = batch.map(async (item, batchIdx) => {
      const key = `${item.sheet}::${item.name}::${item.barcode}`

      if (progress[key] && (progress[key].name_en || progress[key].shortDescription_en) && !progress[key]._failed) {
        cached++
        return
      }

      await sleep(batchIdx * 500)

      const price = lookupPrice(item.name, item.category_slug)
      const prompt = buildAIPrompt(item, price)
      const idx = i + batchIdx + 1
      console.log(`  [${idx}/${items.length}] ${item.name} (${item.category_slug})...`)

      const aiResult = await callGemini(prompt, item.name)
      if (Object.keys(aiResult).length > 3) {
        progress[key] = aiResult
        processed++
        console.log(`    OK: ${Object.keys(aiResult).length} fields`)
      } else {
        console.warn(`    FAILED: ${item.name} — will use fallback`)
        progress[key] = { _failed: 'true' }
        failed++
      }
    })

    await Promise.all(promises)

    if ((i + CONCURRENT) % 15 === 0) {
      fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2), 'utf-8')
      console.log(`  [checkpoint] Saved progress (${processed} processed, ${cached} cached)`)
    }

    if (i + CONCURRENT < items.length) {
      await sleep(DELAY_BETWEEN_ITEMS_MS)
    }
  }

  fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress, null, 2), 'utf-8')

  console.log(`\nAI fill complete: ${processed} processed, ${cached} cached, ${failed} failed`)

  const CSV_HEADER = 'source_sheet,sku,model,category_slug,brand_slug,condition,quantityTotal,quantityAvailable,dailyPrice,weeklyPrice,monthlyPrice,purchasePrice,depositAmount,requiresDeposit,featured,isActive,requiresAssistant,budgetTier,warehouseLocation,barcode,tags,boxContents,bufferTime,bufferTimeUnit,featuredImageUrl,galleryImageUrls,videoUrl,name_ar,name_en,name_zh,description_ar,description_en,description_zh,shortDescription_ar,shortDescription_en,shortDescription_zh,longDescription_ar,longDescription_en,longDescription_zh,seoTitle_ar,seoTitle_en,seoTitle_zh,seoDescription_ar,seoDescription_en,seoDescription_zh,seoKeywords_ar,seoKeywords_en,seoKeywords_zh,specifications_notes'

  const columns = CSV_HEADER.split(',')
  const csvLines: string[] = [CSV_HEADER]
  const allRows: FilledItem[] = []

  for (const item of items) {
    const key = `${item.sheet}::${item.name}::${item.barcode}`
    const ai = progress[key] || {}
    const price = lookupPrice(item.name, item.category_slug)
    const row = buildFilledRow(item, ai, price)
    allRows.push(row)

    const csvRow = columns.map(col => escapeCsv((row as Record<string, string>)[col] || '')).join(',')
    csvLines.push(csvRow)
  }

  const wb = XLSX.utils.book_new()
  const wsData = [columns, ...allRows.map(row => columns.map(col => (row as Record<string, string>)[col] || ''))]
  const ws = XLSX.utils.aoa_to_sheet(wsData)

  const colWidths = columns.map(col => {
    if (col.includes('Description') || col.includes('description') || col.includes('longDescription')) return { wch: 80 }
    if (col.includes('specifications')) return { wch: 100 }
    if (col.includes('seoKeywords') || col.includes('tags')) return { wch: 60 }
    if (col.includes('seo') || col.includes('name_')) return { wch: 40 }
    return { wch: 20 }
  })
  ws['!cols'] = colWidths

  XLSX.utils.book_append_sheet(wb, ws, 'Equipment')

  const outXlsxPath = path.join(TEMPLATES_DIR, 'equipment-full-ai-filled.xlsx')
  const outCsvPath = path.join(TEMPLATES_DIR, 'equipment-full-ai-filled.csv')

  XLSX.writeFile(wb, outXlsxPath)
  console.log(`\nWrote XLSX: ${outXlsxPath} (${allRows.length} rows)`)

  fs.writeFileSync(outCsvPath, csvLines.join('\n') + '\n', 'utf-8')
  console.log(`Wrote CSV: ${outCsvPath} (${allRows.length} rows)`)

  const stats = {
    total: allRows.length,
    withAI: allRows.filter(r => r.seoTitle_en).length,
    withSpecs: allRows.filter(r => r.specifications_notes).length,
    withPricing: allRows.filter(r => r.dailyPrice && r.dailyPrice !== '0').length,
    categories: [...new Set(allRows.map(r => r.category_slug))],
    brands: [...new Set(allRows.map(r => r.brand_slug).filter(Boolean))],
  }
  console.log('\n=== SUMMARY ===')
  console.log(`Total items: ${stats.total}`)
  console.log(`With AI content: ${stats.withAI}`)
  console.log(`With specs: ${stats.withSpecs}`)
  console.log(`With pricing: ${stats.withPricing}`)
  console.log(`Categories: ${stats.categories.join(', ')}`)
  console.log(`Brands: ${stats.brands.join(', ')}`)
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
