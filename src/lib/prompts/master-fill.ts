/**
 * @file master-fill.ts
 * @description Master prompt template for generating 18+ content columns in a single API call.
 * Produces all descriptions, SEO fields, and translations (EN/AR/ZH) from product ground truth.
 * @module lib/prompts
 */

export interface MasterFillInput {
  name: string
  brand: string
  category: string
  specifications?: Record<string, unknown> | null
  existingDescription?: string | null
}

export interface MasterFillOutput {
  short_desc_en: string
  long_desc_en: string
  seo_title_en: string
  seo_desc_en: string
  seo_keywords_en: string
  name_ar: string
  short_desc_ar: string
  long_desc_ar: string
  seo_title_ar: string
  seo_desc_ar: string
  seo_keywords_ar: string
  name_zh: string
  short_desc_zh: string
  long_desc_zh: string
  seo_title_zh: string
  seo_desc_zh: string
  seo_keywords_zh: string
  box_contents?: string
  tags?: string
}

export interface MasterFillWithResearchInput extends MasterFillInput {
  webResearchSpecs?: Record<string, string>
  webBoxContents?: string[]
  webHighlights?: string[]
  webSources?: string[]
}

export function buildMasterFillPrompt(
  input: MasterFillInput | MasterFillWithResearchInput
): string {
  const specsStr = input.specifications
    ? JSON.stringify(input.specifications, null, 2)
    : 'Not provided'

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

IMPORTANT: Use the web research data as your primary source for specs and box contents. These are verified from official retailer listings and are more accurate than AI inference.`
    : ''

  return `You are an expert equipment researcher and product content writer for FlixCam, a professional cinematic equipment rental platform based in Riyadh, Saudi Arabia. Your content must be persuasive, professional, and creative — focused on rental use cases and emotional benefits, NOT dry spec lists.

When specs are provided from web research, use them as-is (they are verified from B&H Photo, Amazon, or manufacturer sites). For specs, don't just list 10 fields — include ALL critical professional details: Resolution, Codecs, Bit Depth, Weight, Power Draw, Mount Type, Sensor Size, Audio Inputs, Frame Rates, Dynamic Range, Internal ND, and Recording Media.

CREATIVE MEASUREMENT RULES FOR DESCRIPTIONS:
When referencing specs in descriptions, ALWAYS use detailed professional formatting:
- Dimensions: exact mm with context → "Super 35mm (25.1 × 13.1 mm)" not just "Super 35"
- Resolution: pixel counts → "4096 × 2160 (4K DCI)" not just "4K"
- Ranges: full range → "ISO 100–25,600 (dual native 800 & 5000)" not just "low-light capable"
- Codecs: full names → "ProRes 422 HQ / BRAW 3:1" not just "ProRes"
- Weight: exact with context → "1.84 kg body-only" not "lightweight"
- Light: with distance → "56,200 lux @ 1m" not "bright"
- Audio: with tolerances → "20 Hz–20 kHz ±2 dB" not "full range"
Your descriptions should weave these precise measurements naturally into compelling rental copy.

Given this equipment:
- Name: ${input.name}
- Brand: ${input.brand}
- Category: ${input.category}
- Specifications: ${specsStr}
${input.existingDescription ? `- Existing Description: ${input.existingDescription}` : ''}
${webResearchSection}

Generate a JSON object with these exact keys:

{
  "short_desc_en": "2-sentence punchy hook highlighting the primary rental benefit. Focus on what the renter will achieve (cinematic skin tones, broadcast-ready color science, crystal clear audio, etc.)",
  "long_desc_en": "3 paragraphs: 1) Technical prowess and key differentiators, 2) Real-world rental scenarios (weddings, commercials, documentaries, music videos, corporate events), 3) Reliability, build quality, and the 'vibe' of working with this gear. Write as if selling the rental experience, not the product.",
  "seo_title_en": "Max 60 chars. Format: Rent {Name} in Riyadh | FlixCam",
  "seo_desc_en": "Max 160 chars. Include 'rent', 'Riyadh', 'Saudi Arabia'. High-intent rental phrases.",
  "seo_keywords_en": "8 comma-separated keywords. Include: rent, Riyadh, Saudi Arabia, category terms, brand name, use cases.",
  "name_ar": "Arabic product name. Keep brand/model in English, add Arabic category descriptor.",
  "short_desc_ar": "Arabic translation of short_desc_en. Formal Fusha Arabic. Include استأجر (rent).",
  "long_desc_ar": "Arabic translation of long_desc_en. Formal Fusha, not dialectal.",
  "seo_title_ar": "Arabic SEO title. Max 60 chars. Include استأجر and الرياض.",
  "seo_desc_ar": "Arabic SEO description. Max 160 chars.",
  "seo_keywords_ar": "8 Arabic keywords. Include: استأجر, تأجير, الرياض, السعودية.",
  "name_zh": "Chinese product name. Keep brand/model in English, add Chinese category.",
  "short_desc_zh": "Simplified Chinese translation of short_desc_en. Include 利雅得 (Riyadh).",
  "long_desc_zh": "Simplified Chinese translation of long_desc_en.",
  "seo_title_zh": "Chinese SEO title. Max 60 chars. Include 租赁 and 利雅得.",
  "seo_desc_zh": "Chinese SEO description. Max 160 chars.",
  "seo_keywords_zh": "8 Chinese keywords. Include: 租赁, 利雅得, 沙特阿拉伯.",
  "box_contents": "Typical rental box contents for this product. Comma-separated list.",
  "tags": "Use-case tags: e.g. cinema, 4k, wedding, documentary, commercial, broadcast, vlog. Comma-separated."
}

CRITICAL RULES:
- Return ONLY valid JSON, no markdown or explanations
- Focus on RENTAL value, not purchase value
- SEO titles must be under 60 characters
- SEO descriptions must be under 160 characters
- Include Riyadh/Saudi Arabia context in ALL languages

ARABIC CREATIVE LAYER (MANDATORY):
- Use Modern Standard Arabic (Fusha) only — no dialectal Arabic
- Maintain a professional rental tone throughout
- Mandatory keywords in ALL Arabic SEO fields: تأجير (rental), استأجر (rent), الرياض (Riyadh), السعودية (Saudi Arabia)
- Include culturally relevant use cases: desert cinematography (تصوير صحراوي), Riyadh-based commercial production (إنتاج تجاري في الرياض), Saudi wedding videography (تصوير حفلات الزفاف)
- Descriptions must "sell the experience" not just list specs — e.g. "ألوان سينمائية مثالية لحفلات الزفاف" (cinematic colors perfect for weddings)

CHINESE LAYER:
- Simplified Chinese only (简体中文)
- Always include 利雅得 (Riyadh) and 沙特阿拉伯 (Saudi Arabia) in SEO
- Include 租赁 (rental) in titles and descriptions

ENGLISH LAYER:
- Always include "Riyadh", "Saudi Arabia", and "rent" or "rental" in SEO fields
- Focus on specific shoot types: wedding, documentary, commercial, broadcast, music video`
}

export function parseMasterFillOutput(raw: string): MasterFillOutput | null {
  try {
    const cleaned = raw
      .replace(/```json\s*/g, '')
      .replace(/```\s*/g, '')
      .trim()
    const parsed = JSON.parse(cleaned)
    if (!parsed.short_desc_en || !parsed.seo_title_en) return null
    return parsed as MasterFillOutput
  } catch {
    return null
  }
}
