/**
 * @file column-mapper.service.ts
 * @description Smart column mapping with fuzzy matching, synonym dictionary, mapping memory,
 * and AI fallback for ambiguous headers. Replaces hardcoded header lookups.
 * @module lib/services
 */

import { prisma } from '@/lib/db/prisma'

export interface ColumnMapping {
  sourceHeader: string
  mappedField: string | null
  confidence: number
  method: 'exact' | 'synonym' | 'fuzzy' | 'history' | 'ai' | 'skip'
}

export type SystemField =
  | 'name'
  | 'brand'
  | 'model'
  | 'sku'
  | 'barcode'
  | 'daily_price'
  | 'weekly_price'
  | 'monthly_price'
  | 'deposit'
  | 'quantity'
  | 'condition'
  | 'warehouse_location'
  | 'featured'
  | 'is_active'
  | 'short_description'
  | 'long_description'
  | 'seo_title'
  | 'seo_description'
  | 'seo_keywords'
  | 'featured_image'
  | 'gallery'
  | 'video'
  | 'specifications'
  | 'box_contents'
  | 'tags'
  | 'related_products'
  | 'buffer_time'
  | 'buffer_time_unit'
  | 'sub_category'
  | 'name_ar'
  | 'short_desc_ar'
  | 'long_desc_ar'
  | 'seo_title_ar'
  | 'seo_desc_ar'
  | 'seo_keywords_ar'
  | 'name_zh'
  | 'short_desc_zh'
  | 'long_desc_zh'
  | 'seo_title_zh'
  | 'seo_desc_zh'
  | 'seo_keywords_zh'

const SYNONYM_MAP: Record<string, SystemField> = {
  name: 'name',
  'product name': 'name',
  product: 'name',
  اسم: 'name',
  '*': 'name',
  'item name': 'name',
  title: 'name',

  brand: 'brand',
  'brand name': 'brand',
  manufacturer: 'brand',
  brand_name: 'brand',
  الماركة: 'brand',
  'العلامة التجارية': 'brand',
  make: 'brand',

  model: 'model',
  'model name': 'model',
  model_name: 'model',
  الموديل: 'model',
  'product model': 'model',

  sku: 'sku',
  'internal reference': 'sku',
  'product code': 'sku',
  'item code': 'sku',
  'article number': 'sku',

  barcode: 'barcode',
  upc: 'barcode',
  ean: 'barcode',
  gtin: 'barcode',

  'daily price': 'daily_price',
  'price daily': 'daily_price',
  daily_price: 'daily_price',
  price_daily: 'daily_price',
  'sales price': 'daily_price',
  price: 'daily_price',
  'السعر اليومي': 'daily_price',
  'rental price': 'daily_price',
  rate: 'daily_price',

  'weekly price': 'weekly_price',
  weekly_price: 'weekly_price',
  price_weekly: 'weekly_price',
  'السعر الأسبوعي': 'weekly_price',

  'monthly price': 'monthly_price',
  monthly_price: 'monthly_price',
  price_monthly: 'monthly_price',
  'السعر الشهري': 'monthly_price',

  deposit: 'deposit',
  deposit_amount: 'deposit',
  'deposit amount': 'deposit',
  'security deposit': 'deposit',

  quantity: 'quantity',
  qty: 'quantity',
  stock: 'quantity',
  'quantity on hand': 'quantity',
  الكمية: 'quantity',
  available: 'quantity',

  condition: 'condition',
  الحالة: 'condition',
  'equipment condition': 'condition',
  'item condition': 'condition',

  'warehouse location': 'warehouse_location',
  warehouse_location: 'warehouse_location',
  location: 'warehouse_location',
  'موقع المستودع': 'warehouse_location',
  shelf: 'warehouse_location',
  'storage location': 'warehouse_location',

  featured: 'featured',
  'is featured': 'featured',
  مميز: 'featured',

  active: 'is_active',
  'is active': 'is_active',
  is_active: 'is_active',
  نشط: 'is_active',
  status: 'is_active',

  'sub category': 'sub_category',
  sub_category: 'sub_category',
  subcategory: 'sub_category',
  'الفئة الفرعية': 'sub_category',

  'short description': 'short_description',
  short_description: 'short_description',
  summary: 'short_description',
  'وصف مختصر': 'short_description',

  description: 'long_description',
  discription: 'long_description',

  'long description': 'long_description',
  long_description: 'long_description',
  'full description': 'long_description',
  'وصف طويل': 'long_description',
  'detailed description': 'long_description',
  الوصف: 'long_description',

  'seo title': 'seo_title',
  seo_title: 'seo_title',
  'meta title': 'seo_title',
  'page title': 'seo_title',

  'seo description': 'seo_description',
  seo_description: 'seo_description',
  'meta description': 'seo_description',

  'seo keywords': 'seo_keywords',
  seo_keywords: 'seo_keywords',
  'meta keywords': 'seo_keywords',
  keywords: 'seo_keywords',

  'featured image': 'featured_image',
  featured_image: 'featured_image',
  'main image': 'featured_image',
  image: 'featured_image',
  'image 128': 'featured_image',
  صورة: 'featured_image',
  thumbnail: 'featured_image',

  gallery: 'gallery',
  gallery_images: 'gallery',
  'gallery images': 'gallery',
  'additional images': 'gallery',
  photos: 'gallery',

  video: 'video',
  video_url: 'video',
  'video url': 'video',
  youtube: 'video',

  specifications: 'specifications',
  specs: 'specifications',
  المواصفات: 'specifications',
  'technical specs': 'specifications',

  'box contents': 'box_contents',
  box_contents: 'box_contents',
  witb: 'box_contents',
  "what's in the box": 'box_contents',
  'محتوى الصندوق': 'box_contents',
  'included accessories': 'box_contents',
  'in the box': 'box_contents',
  'package contents': 'box_contents',

  tags: 'tags',
  tag: 'tags',
  labels: 'tags',

  'related products': 'related_products',
  related: 'related_products',
  related_products: 'related_products',
  accessories: 'related_products',

  'buffer time': 'buffer_time',
  buffer_time: 'buffer_time',
  'وقت الفاصل': 'buffer_time',

  'buffer time unit': 'buffer_time_unit',
  buffer_time_unit: 'buffer_time_unit',
  'وحدة الوقت': 'buffer_time_unit',

  الاسم: 'name_ar',
  'name (ar)': 'name_ar',
  name_ar: 'name_ar',
  'arabic name': 'name_ar',

  'short description (ar)': 'short_desc_ar',
  short_description_ar: 'short_desc_ar',

  'long description (ar)': 'long_desc_ar',
  long_description_ar: 'long_desc_ar',

  'seo title (ar)': 'seo_title_ar',
  seo_title_ar: 'seo_title_ar',

  'seo description (ar)': 'seo_desc_ar',
  seo_description_ar: 'seo_desc_ar',

  'seo keywords (ar)': 'seo_keywords_ar',
  seo_keywords_ar: 'seo_keywords_ar',

  名称: 'name_zh',
  'name (zh)': 'name_zh',
  name_zh: 'name_zh',
  'chinese name': 'name_zh',

  'short description (zh)': 'short_desc_zh',
  short_description_zh: 'short_desc_zh',

  'long description (zh)': 'long_desc_zh',
  long_description_zh: 'long_desc_zh',

  'seo title (zh)': 'seo_title_zh',
  seo_title_zh: 'seo_title_zh',

  'seo description (zh)': 'seo_desc_zh',
  seo_description_zh: 'seo_desc_zh',

  'seo keywords (zh)': 'seo_keywords_zh',
  seo_keywords_zh: 'seo_keywords_zh',
}

const REQUIRED_FIELDS: SystemField[] = ['name']
const AI_FILLABLE_FIELDS: SystemField[] = [
  'short_description',
  'long_description',
  'seo_title',
  'seo_description',
  'seo_keywords',
  'name_ar',
  'short_desc_ar',
  'long_desc_ar',
  'seo_title_ar',
  'seo_desc_ar',
  'seo_keywords_ar',
  'name_zh',
  'short_desc_zh',
  'long_desc_zh',
  'seo_title_zh',
  'seo_desc_zh',
  'seo_keywords_zh',
  'specifications',
  'box_contents',
  'tags',
  'related_products',
]

/**
 * Levenshtein distance between two strings
 */
function levenshtein(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0))
  for (let i = 0; i <= m; i++) dp[i][0] = i
  for (let j = 0; j <= n; j++) dp[0][j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      )
    }
  }
  return dp[m][n]
}

function fuzzyScore(source: string, target: string): number {
  const a = source.toLowerCase().trim()
  const b = target.toLowerCase().trim()
  if (a === b) return 100
  const maxLen = Math.max(a.length, b.length)
  if (maxLen === 0) return 0
  const dist = levenshtein(a, b)
  return Math.round((1 - dist / maxLen) * 100)
}

/**
 * Map an array of Excel column headers to system fields.
 * Uses: 1) exact match, 2) synonym dictionary, 3) mapping history, 4) fuzzy matching
 */
export async function mapColumns(
  headers: string[],
  options?: { useHistory?: boolean }
): Promise<ColumnMapping[]> {
  const results: ColumnMapping[] = []
  const usedFields = new Set<string>()

  let historyMap = new Map<string, { field: string; freq: number }>()
  if (options?.useHistory !== false) {
    try {
      const history = await prisma.columnMappingHistory.findMany({
        orderBy: { frequency: 'desc' },
      })
      for (const h of history) {
        const key = h.sourceHeader.toLowerCase().trim()
        if (!historyMap.has(key)) {
          historyMap.set(key, { field: h.mappedField, freq: h.frequency })
        }
      }
    } catch {
      // Table may not exist yet
    }
  }

  for (const header of headers) {
    const trimmed = header.trim()
    const normalized = trimmed.toLowerCase().replace(/\s+/g, ' ')

    // 1. Exact synonym match
    const exactMatch = SYNONYM_MAP[normalized]
    if (exactMatch && !usedFields.has(exactMatch)) {
      usedFields.add(exactMatch)
      results.push({
        sourceHeader: trimmed,
        mappedField: exactMatch,
        confidence: 98,
        method: 'synonym',
      })
      continue
    }

    // 2. History-based match
    const histMatch = historyMap.get(normalized)
    if (histMatch && !usedFields.has(histMatch.field)) {
      usedFields.add(histMatch.field)
      results.push({
        sourceHeader: trimmed,
        mappedField: histMatch.field,
        confidence: Math.min(95, 70 + histMatch.freq * 5),
        method: 'history',
      })
      continue
    }

    // 3. Fuzzy match against synonym keys
    let bestFuzzy: { field: string; score: number } | null = null
    for (const [key, field] of Object.entries(SYNONYM_MAP)) {
      if (usedFields.has(field)) continue
      const score = fuzzyScore(normalized, key)
      if (score > (bestFuzzy?.score ?? 0) && score >= 60) {
        bestFuzzy = { field, score }
      }
    }

    if (bestFuzzy && !usedFields.has(bestFuzzy.field)) {
      usedFields.add(bestFuzzy.field)
      results.push({
        sourceHeader: trimmed,
        mappedField: bestFuzzy.field,
        confidence: bestFuzzy.score,
        method: 'fuzzy',
      })
      continue
    }

    // 4. No match found
    results.push({
      sourceHeader: trimmed,
      mappedField: null,
      confidence: 0,
      method: 'skip',
    })
  }

  return results
}

/**
 * Save user-confirmed column mappings to history for future use
 */
export async function saveMappingHistory(
  mappings: Array<{ sourceHeader: string; mappedField: string }>
): Promise<void> {
  for (const m of mappings) {
    if (!m.mappedField || m.mappedField === 'skip') continue
    try {
      await prisma.columnMappingHistory.upsert({
        where: {
          sourceHeader_mappedField: {
            sourceHeader: m.sourceHeader.toLowerCase().trim(),
            mappedField: m.mappedField,
          },
        },
        create: {
          sourceHeader: m.sourceHeader.toLowerCase().trim(),
          mappedField: m.mappedField,
          frequency: 1,
        },
        update: {
          frequency: { increment: 1 },
          lastUsedAt: new Date(),
        },
      })
    } catch {
      // Silently ignore if table doesn't exist yet
    }
  }
}

/**
 * Get field metadata for UI display
 */
export function getFieldInfo(field: SystemField | string) {
  const isRequired = REQUIRED_FIELDS.includes(field as SystemField)
  const isAiFillable = AI_FILLABLE_FIELDS.includes(field as SystemField)
  return { isRequired, isAiFillable }
}

export { REQUIRED_FIELDS, AI_FILLABLE_FIELDS, SYNONYM_MAP }
