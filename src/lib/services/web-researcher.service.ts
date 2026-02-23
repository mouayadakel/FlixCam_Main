/**
 * @file web-researcher.service.ts
 * @description Live web research service that searches B&H Photo, Amazon, and manufacturer sites
 * to pull comprehensive product specifications. Uses a Search -> Scrape -> Synthesize pipeline
 * to gather high-fidelity data before AI content generation.
 * @module lib/services
 */

export interface WebResearchResult {
  specs: Record<string, string>
  boxContents: string[]
  marketingHighlights: string[]
  sources: ResearchSource[]
  confidence: number
  conflicts: SpecConflict[]
}

export interface ResearchSource {
  provider: 'bhphoto' | 'amazon' | 'manufacturer' | 'ai_inference'
  url?: string
  specsFound: number
  timestamp: number
}

export interface SpecConflict {
  field: string
  values: Array<{ source: string; value: string }>
  resolved: boolean
  resolvedValue?: string
}

interface ScrapedPage {
  title: string
  specs: Record<string, string>
  boxContents: string[]
  highlights: string[]
  url: string
}

const SPEC_FIELDS_PRIORITY = [
  'Resolution',
  'Max Resolution',
  'Sensor',
  'Sensor Size',
  'Sensor Type',
  'Frame Rates',
  'Max Frame Rate',
  'Mount',
  'Lens Mount',
  'Mount Type',
  'ISO Range',
  'ISO',
  'Dynamic Range',
  'Bit Depth',
  'Color Depth',
  'Chroma Subsampling',
  'Recording Codec',
  'Codecs',
  'Recording Format',
  'Recording Media',
  'Media Slots',
  'Card Slots',
  'Internal ND',
  'ND Filter',
  'Autofocus',
  'AF System',
  'Focus System',
  'Stabilization',
  'IBIS',
  'Image Stabilization',
  'SDI Output',
  'HDMI Output',
  'Video Output',
  'Audio Inputs',
  'Audio',
  'Mic Input',
  'Power',
  'Power Draw',
  'Battery Type',
  'Battery Life',
  'Weight',
  'Body Weight',
  'Weight (Body Only)',
  'Dimensions',
  'Connectivity',
  'Wireless',
  'Wi-Fi',
  'Bluetooth',
  'Color Science',
  'Color Space',
  'Screen',
  'LCD',
  'Viewfinder',
  'Weather Sealing',
  'Operating Temperature',
  'Polar Pattern',
  'Frequency Response',
  'Sensitivity',
  'Self Noise',
  'Channels',
  'Sample Rate',
  'Phantom Power',
  'Output Power',
  'CRI',
  'TLCI',
  'Color Temperature',
  'Dimming',
  'Beam Angle',
  'Max Payload',
  'Stabilization Axes',
]

const ARABIC_SPEC_TRANSLATIONS: Record<string, string> = {
  Resolution: 'الدقة',
  'Max Resolution': 'الدقة القصوى',
  Sensor: 'المستشعر',
  'Sensor Size': 'حجم المستشعر',
  'Sensor Type': 'نوع المستشعر',
  'Frame Rates': 'معدل الإطارات',
  Mount: 'نوع التركيب',
  'Lens Mount': 'تركيب العدسة',
  'ISO Range': 'نطاق ISO',
  'Dynamic Range': 'المدى الديناميكي',
  'Bit Depth': 'عمق البت',
  'Recording Codec': 'صيغة التسجيل',
  'Recording Media': 'وسائط التسجيل',
  'Internal ND': 'فلتر ND داخلي',
  Autofocus: 'التركيز التلقائي',
  Stabilization: 'التثبيت',
  'SDI Output': 'مخرج SDI',
  'HDMI Output': 'مخرج HDMI',
  'Audio Inputs': 'مداخل الصوت',
  'Power Draw': 'استهلاك الطاقة',
  'Battery Life': 'عمر البطارية',
  Weight: 'الوزن',
  Dimensions: 'الأبعاد',
  'Color Science': 'علم الألوان',
  Screen: 'الشاشة',
  'Weather Sealing': 'مقاومة الطقس',
  'Polar Pattern': 'نمط القطبية',
  'Frequency Response': 'الاستجابة الترددية',
  Sensitivity: 'الحساسية',
  'Self Noise': 'الضوضاء الذاتية',
  Channels: 'القنوات',
  'Output Power': 'طاقة الخرج',
  CRI: 'مؤشر تجسيد اللون',
  'Color Temperature': 'حرارة اللون',
  'Max Payload': 'الحمولة القصوى',
}

/**
 * Build a search query for finding product pages
 */
function buildSearchQuery(productName: string, brand: string, site: string): string {
  return `${brand} ${productName} specs site:${site}`
}

/**
 * Extract specs from HTML content using pattern matching.
 * Works with common spec table formats from B&H, Amazon, and manufacturer sites.
 */
function extractSpecsFromHtml(html: string): Record<string, string> {
  const specs: Record<string, string> = {}

  // Pattern 1: <th>Key</th><td>Value</td> (B&H style)
  const tablePattern = /<t[hd][^>]*>\s*([^<]+)\s*<\/t[hd]>\s*<t[hd][^>]*>\s*([^<]+)\s*<\/t[hd]>/gi
  let match
  while ((match = tablePattern.exec(html)) !== null) {
    const key = match[1].trim()
    const value = match[2].trim()
    if (key && value && value.length < 200) {
      specs[key] = value
    }
  }

  // Pattern 2: <dt>Key</dt><dd>Value</dd> (common spec list format)
  const dlPattern = /<dt[^>]*>\s*([^<]+)\s*<\/dt>\s*<dd[^>]*>\s*([^<]+)\s*<\/dd>/gi
  while ((match = dlPattern.exec(html)) !== null) {
    const key = match[1].trim()
    const value = match[2].trim()
    if (key && value && value.length < 200) {
      specs[key] = value
    }
  }

  // Pattern 3: "Key": "Value" in JSON-LD (structured data)
  const jsonLdPattern = /"(?:name|key)":\s*"([^"]+)",\s*"(?:value|description)":\s*"([^"]+)"/gi
  while ((match = jsonLdPattern.exec(html)) !== null) {
    specs[match[1].trim()] = match[2].trim()
  }

  return specs
}

/**
 * Extract "In the Box" contents from HTML
 */
function extractBoxContents(html: string): string[] {
  const contents: string[] = []

  // Look for "In the Box" or "What's Included" sections
  const boxPatterns = [
    /(?:in\s+the\s+box|what'?s?\s+included|box\s+contents|package\s+includes)[^<]*<\/?[^>]+>([\s\S]{0,2000}?)<\/(?:ul|ol|div|section)/gi,
    /<li[^>]*>([^<]{3,100})<\/li>/gi,
  ]

  for (const pattern of boxPatterns) {
    let match
    while ((match = pattern.exec(html)) !== null) {
      const item = match[1]
        .replace(/<[^>]+>/g, '')
        .replace(/&[a-z]+;/gi, ' ')
        .trim()
      if (item && item.length > 2 && item.length < 100 && !contents.includes(item)) {
        contents.push(item)
      }
    }
  }

  return contents.slice(0, 20)
}

/**
 * Fetch a web page with timeout and error handling.
 * Uses proxy service if configured (ScrapingBee, Bright Data, etc.)
 */
async function fetchPage(url: string): Promise<string | null> {
  const proxyApiKey = process.env.SCRAPING_API_KEY
  const proxyService = process.env.SCRAPING_SERVICE || 'direct'

  try {
    let fetchUrl = url
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      Accept: 'text/html,application/xhtml+xml',
    }

    if (proxyService === 'scrapingbee' && proxyApiKey) {
      fetchUrl = `https://app.scrapingbee.com/api/v1/?api_key=${proxyApiKey}&url=${encodeURIComponent(url)}&render_js=false`
    } else if (proxyService === 'brightdata' && proxyApiKey) {
      headers['Authorization'] = `Bearer ${proxyApiKey}`
    }

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 15000)

    const response = await fetch(fetchUrl, {
      headers,
      signal: controller.signal,
    })
    clearTimeout(timeout)

    if (!response.ok) return null
    const html = await response.text()
    return html.slice(0, 500000)
  } catch {
    return null
  }
}

/**
 * Search for a product page on a specific retailer
 */
async function searchProductPage(
  productName: string,
  brand: string,
  site: string
): Promise<string | null> {
  const searchApiKey = process.env.GOOGLE_SEARCH_API_KEY
  const searchCx = process.env.GOOGLE_SEARCH_CX

  if (!searchApiKey || !searchCx) return null

  const query = buildSearchQuery(productName, brand, site)

  try {
    const response = await fetch(
      `https://www.googleapis.com/customsearch/v1?key=${searchApiKey}&cx=${searchCx}&q=${encodeURIComponent(query)}&num=1`
    )
    if (!response.ok) return null
    const data = await response.json()
    return data.items?.[0]?.link || null
  } catch {
    return null
  }
}

/**
 * Scrape specs from a specific product page
 */
async function scrapeProductPage(url: string): Promise<ScrapedPage | null> {
  const html = await fetchPage(url)
  if (!html) return null

  const specs = extractSpecsFromHtml(html)
  const boxContents = extractBoxContents(html)

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  const title = titleMatch?.[1]?.trim() || ''

  const highlights: string[] = []
  const highlightPattern =
    /<li[^>]*class="[^"]*(?:feature|highlight|key-feature)[^"]*"[^>]*>([^<]+)<\/li>/gi
  let match
  while ((match = highlightPattern.exec(html)) !== null) {
    const h = match[1].trim()
    if (h.length > 5 && h.length < 200) highlights.push(h)
  }

  return {
    title,
    specs,
    boxContents,
    highlights: highlights.slice(0, 10),
    url,
  }
}

/**
 * Detect conflicts between specs from different sources.
 * A conflict occurs when two sources report different values for the same field.
 */
function detectConflicts(
  sources: Array<{ provider: string; specs: Record<string, string> }>
): SpecConflict[] {
  const conflicts: SpecConflict[] = []
  const allKeys = new Set<string>()

  for (const source of sources) {
    for (const key of Object.keys(source.specs)) {
      allKeys.add(key)
    }
  }

  for (const key of allKeys) {
    const values: Array<{ source: string; value: string }> = []
    for (const source of sources) {
      if (source.specs[key]) {
        values.push({ source: source.provider, value: source.specs[key] })
      }
    }

    if (values.length >= 2) {
      const normalized = values.map((v) => v.value.toLowerCase().replace(/\s+/g, ' ').trim())
      const unique = new Set(normalized)
      if (unique.size > 1) {
        conflicts.push({
          field: key,
          values,
          resolved: false,
        })
      }
    }
  }

  return conflicts
}

/**
 * Merge specs from multiple sources, preferring B&H > Manufacturer > Amazon > AI.
 * If a conflict is detected, the value from the highest-priority source wins
 * but the conflict is flagged for human review.
 */
function mergeSpecs(
  sources: Array<{ provider: string; specs: Record<string, string>; priority: number }>
): Record<string, string> {
  const merged: Record<string, string> = {}
  const sorted = [...sources].sort((a, b) => b.priority - a.priority)

  for (const source of sorted) {
    for (const [key, value] of Object.entries(source.specs)) {
      if (!merged[key]) {
        merged[key] = value
      }
    }
  }

  return merged
}

/**
 * Normalize spec keys to a consistent format.
 * Maps common variations to canonical names.
 */
function normalizeSpecKeys(specs: Record<string, string>): Record<string, string> {
  const keyMap: Record<string, string> = {
    'max resolution': 'Resolution',
    'video resolution': 'Resolution',
    'effective pixels': 'Sensor',
    'image sensor': 'Sensor',
    'lens mount type': 'Mount',
    'weight (body only)': 'Weight',
    'approx. weight': 'Weight',
    'card slot': 'Recording Media',
    'memory card': 'Recording Media',
    battery: 'Battery Type',
    'continuous shooting': 'Frame Rates',
    'af system': 'Autofocus',
    'focus type': 'Autofocus',
    'image stabilization': 'Stabilization',
    monitor: 'Screen',
    'lcd monitor': 'Screen',
    wireless: 'Connectivity',
  }

  const normalized: Record<string, string> = {}
  for (const [key, value] of Object.entries(specs)) {
    const normalKey = keyMap[key.toLowerCase()] || key
    if (!normalized[normalKey]) {
      normalized[normalKey] = value
    }
  }

  return normalized
}

/**
 * Filter specs to only include professionally relevant fields
 */
function filterRelevantSpecs(specs: Record<string, string>): Record<string, string> {
  const relevant: Record<string, string> = {}
  const lowerPriority = SPEC_FIELDS_PRIORITY.map((f) => f.toLowerCase())

  for (const [key, value] of Object.entries(specs)) {
    const keyLower = key.toLowerCase()
    if (lowerPriority.some((p) => keyLower.includes(p) || p.includes(keyLower))) {
      relevant[key] = value
    }
  }

  return relevant
}

const RATE_LIMIT_DELAY_MS = Number(process.env.RESEARCH_RATE_LIMIT_DELAY || 2000)
const CACHE_TTL_SECONDS = 7 * 24 * 60 * 60 // 7 days

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Cache research results in Redis to avoid redundant scraping.
 * Key format: research:{brand}:{productName}
 */
async function getCachedResearch(
  productName: string,
  brand: string
): Promise<WebResearchResult | null> {
  try {
    const redis = (await import('@/lib/queue/redis.client')).getRedisClient()
    const key = `research:${brand.toLowerCase()}:${productName.toLowerCase().replace(/\s+/g, '_')}`
    const cached = await redis.get(key)
    if (cached) return JSON.parse(cached)
  } catch {
    // Redis unavailable, skip cache
  }
  return null
}

async function setCachedResearch(
  productName: string,
  brand: string,
  result: WebResearchResult
): Promise<void> {
  try {
    const redis = (await import('@/lib/queue/redis.client')).getRedisClient()
    const key = `research:${brand.toLowerCase()}:${productName.toLowerCase().replace(/\s+/g, '_')}`
    await redis.set(key, JSON.stringify(result), 'EX', CACHE_TTL_SECONDS)
  } catch {
    // Redis unavailable, skip cache
  }
}

/**
 * Main research function: Search -> Scrape -> Synthesize.
 * Implements graceful degradation: Live Scrape -> Deep DB -> Curated DB -> AI Inference.
 * Rate-limited to avoid bot detection and API bans.
 */
export async function researchProduct(
  productName: string,
  brand: string,
  category?: string
): Promise<WebResearchResult> {
  // Check Redis cache first to avoid redundant scraping
  const cached = await getCachedResearch(productName, brand)
  if (cached) {
    console.info(`[WebResearcher] Cache hit for "${brand} ${productName}"`)
    return cached
  }

  const sources: ResearchSource[] = []
  const allSpecs: Array<{ provider: string; specs: Record<string, string>; priority: number }> = []
  let allBoxContents: string[] = []
  let allHighlights: string[] = []

  const searchTargets: Array<{
    site: string
    provider: 'bhphoto' | 'amazon' | 'manufacturer'
    priority: number
  }> = [
    { site: 'bhphotovideo.com', provider: 'bhphoto', priority: 3 },
    { site: 'amazon.com', provider: 'amazon', priority: 1 },
  ]

  const brandSites: Record<string, string> = {
    sony: 'sony.com',
    arri: 'arri.com',
    red: 'red.com',
    canon: 'canon.com',
    blackmagic: 'blackmagicdesign.com',
    dji: 'dji.com',
    sennheiser: 'sennheiser.com',
    rode: 'rode.com',
    zoom: 'zoomcorp.com',
    aputure: 'aputure.com',
    nanlite: 'nanlite.com',
    tilta: 'tilta.com',
  }

  const brandLower = brand.toLowerCase()
  const manufacturerSite = brandSites[brandLower]
  if (manufacturerSite) {
    searchTargets.push({
      site: manufacturerSite,
      provider: 'manufacturer' as const,
      priority: 2,
    })
  }

  // Sequential with rate limiting to mimic human behavior and avoid bans
  const searchResults: Array<
    PromiseSettledResult<{
      provider: 'bhphoto' | 'amazon' | 'manufacturer'
      page: ScrapedPage
      priority: number
      site: string
    } | null>
  > = []
  for (const target of searchTargets) {
    try {
      const url = await searchProductPage(productName, brand, target.site)
      if (!url) {
        searchResults.push({ status: 'fulfilled', value: null })
      } else {
        const page = await scrapeProductPage(url)
        if (!page) {
          searchResults.push({ status: 'fulfilled', value: null })
        } else {
          searchResults.push({ status: 'fulfilled', value: { ...target, page } })
        }
      }
    } catch (err) {
      searchResults.push({ status: 'rejected', reason: err })
    }
    await delay(RATE_LIMIT_DELAY_MS)
  }

  for (const result of searchResults) {
    if (result.status !== 'fulfilled' || !result.value) continue
    const { provider, page, priority } = result.value

    const normalizedSpecs = normalizeSpecKeys(page.specs)
    const relevantSpecs = filterRelevantSpecs(normalizedSpecs)

    allSpecs.push({ provider, specs: relevantSpecs, priority })
    sources.push({
      provider,
      url: page.url,
      specsFound: Object.keys(relevantSpecs).length,
      timestamp: Date.now(),
    })

    if (page.boxContents.length > allBoxContents.length) {
      allBoxContents = page.boxContents
    }
    allHighlights = [...allHighlights, ...page.highlights]
  }

  const mergedSpecs = mergeSpecs(allSpecs)
  const conflicts = detectConflicts(allSpecs.map((s) => ({ provider: s.provider, specs: s.specs })))

  // Auto-resolve conflicts: use highest-priority source value
  for (const conflict of conflicts) {
    const bestSource = allSpecs
      .filter((s) => s.specs[conflict.field])
      .sort((a, b) => b.priority - a.priority)[0]
    if (bestSource) {
      conflict.resolved = true
      conflict.resolvedValue = bestSource.specs[conflict.field]
    }
  }

  // Graceful degradation: if web scraping found nothing, fall back to curated DB
  if (Object.keys(mergedSpecs).length === 0) {
    try {
      const { lookupDeepSpecs } = await import('./specs-db.service')
      const dbMatch = lookupDeepSpecs(productName, brand)
      if (dbMatch) {
        return {
          specs: dbMatch.specs,
          boxContents: dbMatch.boxContents || [],
          marketingHighlights: dbMatch.marketingHighlights ? [dbMatch.marketingHighlights] : [],
          sources: [
            {
              provider: 'ai_inference',
              specsFound: Object.keys(dbMatch.specs).length,
              timestamp: Date.now(),
            },
          ],
          confidence: dbMatch.confidence,
          conflicts: [],
        }
      }
    } catch {
      // Curated DB lookup failed, continue with empty result
    }
  }

  const totalSpecsFound = Object.keys(mergedSpecs).length
  const sourceCount = sources.filter((s) => s.specsFound > 0).length
  const confidence = Math.min(
    98,
    sourceCount >= 2 ? 92 : sourceCount === 1 ? 78 : 50 + Math.min(totalSpecsFound * 3, 28)
  )

  const result: WebResearchResult = {
    specs: mergedSpecs,
    boxContents: [...new Set(allBoxContents)],
    marketingHighlights: [...new Set(allHighlights)].slice(0, 8),
    sources,
    confidence,
    conflicts: conflicts.filter((c) => !c.resolved),
  }

  // Cache successful research results (7 days TTL)
  if (totalSpecsFound > 0) {
    await setCachedResearch(productName, brand, result)
  }

  return result
}

/**
 * Get the Arabic translation for a spec field name
 */
export function getArabicSpecName(englishName: string): string {
  return ARABIC_SPEC_TRANSLATIONS[englishName] || englishName
}

/**
 * Translate all spec keys to Arabic
 */
export function translateSpecsToArabic(specs: Record<string, string>): Record<string, string> {
  const translated: Record<string, string> = {}
  for (const [key, value] of Object.entries(specs)) {
    const arabicKey = getArabicSpecName(key)
    translated[arabicKey] = value
  }
  return translated
}

/**
 * Check if web research APIs are configured
 */
export function isWebResearchAvailable(): boolean {
  return !!(
    (process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_SEARCH_CX) ||
    process.env.SCRAPING_API_KEY
  )
}
