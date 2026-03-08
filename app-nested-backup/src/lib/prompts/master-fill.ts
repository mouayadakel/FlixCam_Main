/**
 * @file master-fill.ts
 * @description Master prompt template for generating 25+ content columns in a single API call.
 * Produces descriptions, SEO, translations (EN/AR/ZH), structured specs, brand/category
 * detection, slug, tags, and photo search queries from product ground truth.
 * @module lib/prompts
 */

export interface MasterFillInput {
  name: string
  brand: string
  category: string
  specifications?: Record<string, unknown> | null
  existingDescription?: string | null
  box_contents?: string | null
  price_daily?: number | null
}

export interface MasterFillOutput {
  brand: string
  category_suggestion: string
  slug: string

  short_desc_en: string
  long_desc_en: string
  seo_title_en: string
  seo_desc_en: string
  seo_keywords_en: string | string[]

  name_ar: string
  short_desc_ar: string
  long_desc_ar: string
  seo_title_ar: string
  seo_desc_ar: string
  seo_keywords_ar: string | string[]

  name_zh: string
  short_desc_zh: string
  long_desc_zh: string
  seo_title_zh: string
  seo_desc_zh: string
  seo_keywords_zh: string | string[]

  box_contents?: string
  tags?: string | string[]

  specifications?: Record<string, unknown>
  photo_search_queries?: string[]

  _needs_review?: boolean
  _parse_failed?: boolean
}

export interface MasterFillWithResearchInput extends MasterFillInput {
  webResearchSpecs?: Record<string, string>
  webBoxContents?: string[]
  webHighlights?: string[]
  webSources?: string[]
}

export const MASTER_SYSTEM_PROMPT = `You are a world-class product content specialist and technical writer for a professional photography and videography equipment rental company in Saudi Arabia (FlixCam, Riyadh). You have 15 years of experience writing rental catalog content.

You have encyclopedic knowledge of ALL professional camera equipment:
- Every Canon, Sony, Nikon, Fujifilm, Panasonic, Blackmagic, RED, ARRI camera
- Every major lens (Canon RF/EF, Sony FE/E, Nikon Z/F, Sigma, Tamron, Zeiss)
- All lighting (Godox, Profoto, Elinchrom, Aputure, Broncolor, Nanlite)
- All audio (Rode, Sennheiser, Zoom, Tascam, DJI Mic)
- All stabilizers (DJI, Zhiyun, Moza, Feiyu)
- All support (Manfrotto, Gitzo, Benro, Really Right Stuff)
- All monitors, recorders, drones, cages, follow-focus systems

Your content rules:
1. Write for RENTAL — always say "rent", "hire", "rental" not "buy/purchase"
2. Arabic content must be natural Gulf Arabic, professional tone
3. Chinese content must be Simplified Mandarin, professional tone
4. Descriptions must highlight WHY a professional would RENT this item
5. SEO must target Saudi Arabia + UAE rental market
6. Technical specs must be 100% accurate — use your knowledge
7. Never make up specs you don't know — flag them with [verify]
8. Be creative and thoughtful — not robotic template text
9. Every item deserves unique content — never copy-paste structure

You always return valid JSON. You never return partial results.
If you don't know something exactly, make your best professional judgment.
Empty fields are never acceptable.`

export const CATEGORY_CONTEXT: Record<string, string> = {
  camera_mirrorless: `Focus on: sensor size, megapixels, video specs (resolution/fps/codec), autofocus system, IBIS, mount type, battery life, weather sealing.
Rental angle: ideal projects (wedding, commercial, documentary, content creation).
Arabic focus: احترافية، جودة عالية، مثالية للتصوير`,

  camera_cinema: `Focus on: sensor (Super35/FF/LF), dynamic range (stops), recording format, RAW capability, mount, weight, accessories needed.
Rental angle: film productions, music videos, commercials, Netflix-quality content.
Arabic focus: إنتاج سينمائي، جودة سينمائية`,

  lens_prime: `Focus on: focal length, max aperture, optical formula, AF speed, rendering character, sharpness, bokeh quality.
Rental angle: portraiture, events, low light shooting.`,

  lens_zoom: `Focus on: zoom range, max aperture (constant/variable), sharpness across range, IS/OSS/VR, build quality.
Rental angle: versatility, travel, events, news.`,

  lighting_strobe: `Focus on: power output (Ws/J), flash duration (t0.1/t0.5), recycle time, modifier compatibility, HSS capability.
Rental angle: studio work, location shoots, product photography.`,

  lighting_continuous: `Focus on: color temperature, CRI/TLCI, power (W/lux), dimming range, battery option, heat output.
Rental angle: video work, interviews, YouTube, broadcast.`,

  audio: `Focus on: pickup pattern, frequency response, SNR, connectivity (XLR/TRS/USB/wireless), phantom power.
Rental angle: interviews, films, events, broadcast.`,

  drone: `Focus on: sensor, gimbal axis, flight time, obstacle avoidance, transmission range, wind resistance, required licenses.
Rental angle: aerial photography, real estate, events, film.`,

  stabilizer: `Focus on: payload capacity, axis count, follow modes, battery life, compatible cameras, quick-release.
Rental angle: run-and-gun, music videos, documentary.`,

  monitor_recorder: `Focus on: screen size, resolution, brightness (nits), color accuracy, recording formats, SDI/HDMI inputs, LUT support.
Rental angle: on-set monitoring, focus pulling, client review.`,

  default: `Focus on the key professional use cases and technical highlights.
Rental angle: what type of shoot or project benefits most from renting this item.`,
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  camera_mirrorless: ['mirrorless', 'eos r', 'alpha', 'a7', 'a9', 'z5', 'z6', 'z7', 'z8', 'z9', 'x-t', 'x-h', 'gfx', 'lumix s', 'xt5', 'xh2'],
  camera_cinema: ['cinema', 'cine', 'fx6', 'fx3', 'fx9', 'c70', 'c300', 'c500', 'bmpcc', 'ursa', 'red', 'arri', 'alexa', 'komodo', 'raptor', 'venice', 'ronin 4d'],
  lens_prime: ['prime', 'f/1.', 'f1.', '35mm f', '50mm f', '85mm f', '24mm f', '135mm f', 'cine lens', 'art lens'],
  lens_zoom: ['zoom', '24-70', '70-200', '100-400', '24-105', '16-35', '14-24', '28-70', '70-300', '100-500', '200-600'],
  lighting_strobe: ['strobe', 'flash', 'speedlight', 'speedlite', 'ad600', 'ad400', 'ad200', 'b1x', 'b10', 'd2', 'elb', 'profoto'],
  lighting_continuous: ['continuous', 'led', 'panel', 'forza', 'amaran', 'aputure', 'nanlite', 'falcon eyes', 'light storm', 'tube light', 'flex light', 'mat light'],
  audio: ['microphone', 'mic', 'wireless', 'lavalier', 'shotgun', 'recorder', 'boom', 'rode', 'sennheiser', 'zoom h', 'tascam', 'dji mic', 'ntg'],
  drone: ['drone', 'mavic', 'phantom', 'inspire', 'air 2', 'mini', 'fpv', 'matrice', 'autel', 'evo'],
  stabilizer: ['gimbal', 'stabilizer', 'ronin', 'crane', 'moza', 'weebill', 'feiyu', 'steadicam', 'rs 3', 'rs 4'],
  monitor_recorder: ['monitor', 'recorder', 'atomos', 'ninja', 'shogun', 'smallhd', 'feelworld', 'lilliput', 'video assist'],
}

export function detectCategoryContext(name: string, categoryHint?: string): string {
  const normalized = (name + ' ' + (categoryHint ?? '')).toLowerCase()

  for (const [key, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => normalized.includes(kw))) {
      return CATEGORY_CONTEXT[key] ?? CATEGORY_CONTEXT.default
    }
  }

  return CATEGORY_CONTEXT.default
}

export function buildMasterFillPrompt(
  input: MasterFillInput | MasterFillWithResearchInput
): string {
  const specsStr = input.specifications
    ? JSON.stringify(input.specifications, null, 2)
    : 'Not provided'

  const categoryContext = detectCategoryContext(input.name, input.category)

  const researchInput = input as MasterFillWithResearchInput
  const hasWebResearch =
    researchInput.webResearchSpecs && Object.keys(researchInput.webResearchSpecs).length > 0

  const webResearchSection = hasWebResearch
    ? `
WEB RESEARCH DATA (verified from B&H Photo, Amazon, manufacturer sites):
- Verified Specs: ${JSON.stringify(researchInput.webResearchSpecs, null, 2)}
${researchInput.webBoxContents?.length ? `- Verified Box Contents: ${researchInput.webBoxContents.join(', ')}` : ''}
${researchInput.webHighlights?.length ? `- Marketing Highlights: ${researchInput.webHighlights.join('; ')}` : ''}
${researchInput.webSources?.length ? `- Sources: ${researchInput.webSources.join(', ')}` : ''}

IMPORTANT: Use the web research data as your primary source for specs and box contents.`
    : ''

  return `You must generate complete rental catalog content for this equipment item.

ITEM INFORMATION:
  Name (English): ${input.name}
  Brand hint: ${input.brand || 'detect from name'}
  Category hint: ${input.category || 'detect from name'}
  Daily rental price: ${input.price_daily ? `${input.price_daily} SAR` : 'not provided'}
  Box contents: ${input.box_contents || 'not provided — do not guess this'}
  Existing specs: ${specsStr}
${input.existingDescription ? `  Existing description: ${input.existingDescription}` : ''}
${webResearchSection}

CATEGORY CONTEXT:
${categoryContext}

YOUR TASK:
Generate ALL fields below. Return ONLY a valid JSON object.
No markdown. No explanation. No backticks. Pure JSON only.

REQUIRED JSON STRUCTURE:
{
  "brand": "exact brand name (Canon / Sony / Godox etc)",
  "category_suggestion": "best matching category path e.g. Cameras > Mirrorless",
  "slug": "url-safe-slug-from-english-name",

  "name_ar": "Arabic product name — natural Gulf Arabic, keep brand/model in English",
  "name_zh": "Chinese product name — Simplified Mandarin, keep brand/model in English",

  "short_desc_en": "2-3 sentence rental-focused description. Why rent this? What shoots is it perfect for?",
  "long_desc_en": "150-250 words. Creative, thoughtful, professional. Cover: what it is, who uses it, what projects it enables, key technical highlights in plain language, why renting makes sense. Must feel written by a human expert, not a robot.",

  "short_desc_ar": "Arabic version — NOT a direct translation, write naturally in Arabic for Gulf market. Include استأجر (rent).",
  "long_desc_ar": "Full Arabic description 150-250 words — natural professional Arabic, rental-focused. Use Fusha Arabic.",

  "short_desc_zh": "Chinese short description — Simplified Chinese, include 租赁 (rental).",
  "long_desc_zh": "Chinese long description — professional Mandarin.",

  "seo_title_en": "EXACTLY 55-60 characters. Include: item name + Rent + Riyadh. Format: Rent {Name} in Riyadh | FlixCam",
  "seo_desc_en": "EXACTLY 155-160 characters. Include rental CTA, key feature, Riyadh, Saudi Arabia.",
  "seo_keywords_en": ["keyword1", "keyword2", "...12 keywords total including rent, Riyadh, Saudi Arabia, brand, category"],

  "seo_title_ar": "Arabic SEO title 50-60 chars. Include استأجر and الرياض.",
  "seo_desc_ar": "Arabic meta description 150-160 chars. Include تأجير, الرياض, السعودية.",
  "seo_keywords_ar": ["كلمة1", "كلمة2", "...10 Arabic keywords including استأجر, تأجير, الرياض, السعودية"],

  "tags": ["tag1", "tag2", "...15-20 tags mixing English and Arabic, covering use cases, category, brand"],

  "specifications": {
    "general": {
      "brand": "",
      "model": "",
      "year_released": "",
      "color": "",
      "weight": "",
      "dimensions": ""
    },
    "technical": {
      "FILL_ALL_RELEVANT_SPECS": "Include EVERY spec you know for this specific item type. Camera: sensor, megapixels, ISO range, AF points, burst fps, video resolutions, codecs, stabilization, mount, battery. Lens: focal_length, max_aperture, min_aperture, optical_formula, elements_groups, min_focus_distance, filter_thread, image_stabilization. Light: power_ws, color_temp_range, cri, flash_duration, recycle_time, guide_number, mount_type. Use exact spec names professionals use. Flag uncertain specs with (verify) suffix."
    },
    "connectivity": {
      "FILL_IF_APPLICABLE": "ports, wireless, bluetooth, wifi, app control, tethering"
    },
    "power": {
      "FILL_IF_APPLICABLE": "battery type, battery life, charging method, power draw"
    },
    "compatibility": {
      "FILL_IF_APPLICABLE": "lens mount, accessory compatibility, system ecosystem"
    },
    "in_the_box": "leave empty — provided by user"
  },

  "photo_search_queries": [
    "exact search query 1 to find real product photos (e.g. 'Canon EOS R5 product photo front view')",
    "exact search query 2 (e.g. 'Canon EOS R5 professional camera side angle')",
    "exact search query 3 (different angle or context)",
    "exact search query 4",
    "exact search query 5"
  ]
}

QUALITY REQUIREMENTS:
- seo_title_en must be EXACTLY 55-60 chars (count carefully)
- seo_desc_en must be EXACTLY 155-160 chars (count carefully)
- long_desc_en must be 150-250 words (count carefully)
- specifications must include every spec you know for "${input.name}"
- tags must include both English and Arabic tags
- All Arabic text must be natural, NOT Google Translate quality
- brand must be one word (the manufacturer name only)
- slug must be lowercase, hyphens only, no special chars
- photo_search_queries must be specific enough to find the exact product

CREATIVE MEASUREMENT RULES FOR DESCRIPTIONS:
When referencing specs in descriptions, ALWAYS use detailed professional formatting:
- Dimensions: exact mm with context → "Super 35mm (25.1 × 13.1 mm)" not just "Super 35"
- Resolution: pixel counts → "4096 × 2160 (4K DCI)" not just "4K"
- Ranges: full range → "ISO 100–25,600 (dual native 800 & 5000)" not just "low-light capable"
- Codecs: full names → "ProRes 422 HQ / BRAW 3:1" not just "ProRes"
- Weight: exact with context → "1.84 kg body-only" not "lightweight"

ARABIC CREATIVE LAYER (MANDATORY):
- Use professional Arabic with Gulf market awareness
- Mandatory keywords in ALL Arabic SEO: تأجير, استأجر, الرياض, السعودية
- Include culturally relevant use cases: تصوير صحراوي, إنتاج تجاري في الرياض, تصوير حفلات الزفاف
- Descriptions must "sell the experience" — e.g. "ألوان سينمائية مثالية لحفلات الزفاف"

Return ONLY the JSON object. Nothing else.`
}

function extractBrandFromName(name: string): string {
  const knownBrands = [
    'Canon', 'Sony', 'Nikon', 'Fujifilm', 'Panasonic', 'Blackmagic', 'RED', 'ARRI',
    'Godox', 'Profoto', 'Elinchrom', 'Aputure', 'Broncolor', 'Nanlite',
    'Rode', 'Sennheiser', 'Zoom', 'Tascam', 'DJI', 'Zhiyun', 'Moza', 'Feiyu',
    'Manfrotto', 'Gitzo', 'Benro', 'Sigma', 'Tamron', 'Zeiss', 'Leica',
    'Atomos', 'SmallHD', 'Tilta', 'Wooden Camera', 'Smallrig', 'Feelworld',
    'Sachtler', 'Vinten', 'OConnor', 'Teradek', 'Hollyland', 'Deity',
    'Litepanels', 'Kino Flo', 'Astera', 'Quasar Science', 'Rosco',
  ]
  const lower = name.toLowerCase()
  for (const brand of knownBrands) {
    if (lower.includes(brand.toLowerCase())) return brand
  }
  const firstWord = name.split(/\s+/)[0]
  return firstWord ?? 'Unknown'
}

function buildFallbackResult(name: string): MasterFillOutput {
  const brand = extractBrandFromName(name)
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 120)

  return {
    brand,
    category_suggestion: 'Equipment',
    slug: slug || 'untitled',
    name_ar: `[يحتاج مراجعة] ${name}`,
    name_zh: `[需要审核] ${name}`,
    short_desc_en: `Professional ${name} available for rent at FlixCam, Riyadh.`,
    long_desc_en: `Rent the ${name} for your next professional shoot in Riyadh. This ${brand} equipment delivers professional-grade performance for commercial productions, weddings, documentaries, and creative projects across Saudi Arabia. Contact FlixCam for availability, pricing, and rental packages tailored to your production needs.`,
    short_desc_ar: `استأجر ${name} الاحترافي من فليكس كام في الرياض.`,
    long_desc_ar: `استأجر ${name} من فليكس كام للحصول على أداء احترافي في مشاريع التصوير والإنتاج في الرياض والسعودية. تواصل معنا للحجز والاستفسار.`,
    short_desc_zh: `在利雅得租赁专业${name}设备 - FlixCam。`,
    long_desc_zh: `在FlixCam租赁${name}专业设备，适用于利雅得和沙特阿拉伯的商业制作、婚礼摄影和纪录片拍摄。`,
    seo_title_en: `Rent ${name} in Riyadh | FlixCam`.slice(0, 60),
    seo_desc_en: `Rent the ${name} in Riyadh, Saudi Arabia. Professional equipment rental for film, commercial, and event productions. Book now at FlixCam.`.slice(0, 160),
    seo_keywords_en: `rent ${name}, ${brand} rental Riyadh, camera equipment Saudi Arabia, ${name} hire`,
    seo_title_ar: `استأجر ${name} في الرياض | فليكس كام`.slice(0, 60),
    seo_desc_ar: `تأجير ${name} في الرياض، السعودية. معدات تصوير احترافية للإيجار. احجز الآن من فليكس كام.`.slice(0, 160),
    seo_keywords_ar: `استأجر ${name}, تأجير معدات تصوير الرياض, ${brand} للإيجار`,
    seo_title_zh: `租赁 ${name} 利雅得 | FlixCam`.slice(0, 60),
    seo_desc_zh: `在利雅得租赁${name}专业摄影设备。FlixCam提供最优质的设备租赁服务。`.slice(0, 160),
    seo_keywords_zh: `租赁 ${name}, 利雅得摄影设备, ${brand} 租赁`,
    tags: `${name}, ${brand}, rental, rent, Riyadh, تأجير, الرياض, professional, equipment`,
    specifications: {},
    photo_search_queries: [
      `${name} product photo`,
      `${name} professional equipment`,
      `${brand} ${name} front view`,
      `${name} studio shot`,
      `${name} review sample`,
    ],
    _needs_review: true,
    _parse_failed: true,
  }
}

export function parseMasterFillOutput(raw: string, itemName?: string): MasterFillOutput {
  // Attempt 1: direct parse after stripping markdown
  try {
    const cleaned = raw
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .trim()
    const parsed = JSON.parse(cleaned)
    if (parsed.short_desc_en && parsed.seo_title_en) {
      return parsed as MasterFillOutput
    }
  } catch { /* continue to next attempt */ }

  // Attempt 2: extract JSON object from response via regex
  try {
    const match = raw.match(/\{[\s\S]*\}/)
    if (match) {
      const parsed = JSON.parse(match[0])
      if (parsed.short_desc_en) {
        return parsed as MasterFillOutput
      }
    }
  } catch { /* continue to next attempt */ }

  // Attempt 3: fix common JSON issues (trailing commas, unquoted keys)
  try {
    let fixed = raw
      .replace(/```json\s*/gi, '')
      .replace(/```\s*/g, '')
      .replace(/,\s*}/g, '}')
      .replace(/,\s*]/g, ']')
    const match = fixed.match(/\{[\s\S]*\}/)
    if (match) {
      fixed = match[0]
        .replace(/(['"])?([a-zA-Z_][a-zA-Z0-9_]*)(['"])?\s*:/g, '"$2":')
        .replace(/""+/g, '"')
      const parsed = JSON.parse(fixed)
      if (parsed.short_desc_en) {
        return parsed as MasterFillOutput
      }
    }
  } catch { /* continue to next attempt */ }

  // Attempt 4: extract individual fields via regex patterns
  try {
    const extractField = (key: string): string => {
      const pattern = new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 's')
      const m = raw.match(pattern)
      return m?.[1]?.replace(/\\"/g, '"').replace(/\\n/g, '\n') ?? ''
    }

    const extractArrayField = (key: string): string[] => {
      const pattern = new RegExp(`"${key}"\\s*:\\s*\\[([^\\]]*)]`, 's')
      const m = raw.match(pattern)
      if (!m) return []
      return m[1]
        .split(',')
        .map((s) => s.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean)
    }

    const partial: MasterFillOutput = {
      brand: extractField('brand') || extractBrandFromName(itemName ?? ''),
      category_suggestion: extractField('category_suggestion') || 'Equipment',
      slug: extractField('slug') || '',
      short_desc_en: extractField('short_desc_en'),
      long_desc_en: extractField('long_desc_en'),
      seo_title_en: extractField('seo_title_en'),
      seo_desc_en: extractField('seo_desc_en'),
      seo_keywords_en: extractArrayField('seo_keywords_en'),
      name_ar: extractField('name_ar'),
      short_desc_ar: extractField('short_desc_ar'),
      long_desc_ar: extractField('long_desc_ar'),
      seo_title_ar: extractField('seo_title_ar'),
      seo_desc_ar: extractField('seo_desc_ar'),
      seo_keywords_ar: extractArrayField('seo_keywords_ar'),
      name_zh: extractField('name_zh'),
      short_desc_zh: extractField('short_desc_zh'),
      long_desc_zh: extractField('long_desc_zh'),
      seo_title_zh: extractField('seo_title_zh'),
      seo_desc_zh: extractField('seo_desc_zh'),
      seo_keywords_zh: extractArrayField('seo_keywords_zh'),
      tags: extractArrayField('tags'),
      photo_search_queries: extractArrayField('photo_search_queries'),
      _needs_review: true,
    }

    if (partial.short_desc_en) {
      return partial
    }
  } catch { /* continue to fallback */ }

  // Attempt 5: return fallback result — never return null
  console.error(`[MasterFill] Could not parse AI output for: ${itemName ?? 'unknown'}`)
  return buildFallbackResult(itemName ?? 'Unknown Equipment')
}
