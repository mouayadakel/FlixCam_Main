/**
 * @file ai-spec-parser.service.ts
 * @description LLM-based spec inference with confidence scoring.
 * >90% auto-save, 70-90% save as suggestion, <70% flag for manual entry.
 * @module lib/services
 */

import { getExpectedSpecs } from '@/lib/ai/spec-templates'
import type { InferredSpec } from '@/lib/types/backfill.types'
import {
  isStructuredSpecifications,
  type StructuredSpecifications,
} from '@/lib/types/specifications.types'
import {
  flattenStructuredSpecs,
  resolveSpecKey,
} from '@/lib/utils/specifications.utils'
import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'

export type ProductForSpecInference = {
  id: string
  sku: string | null
  category?: { name: string } | null
  brand?: { name: string } | null
  boxContents?: string | null
  translations: Array<{
    locale: string
    name: string
    shortDescription: string | null
    longDescription: string | null
    specifications: unknown
  }>
}

/**
 * Infer missing specification values using LLM (product name, category, description, partial specs).
 * Confidence: >90% auto-save, 70-90% suggestion, <70% flag for manual.
 */
export async function inferMissingSpecs(product: ProductForSpecInference | null): Promise<{
  specs: InferredSpec[]
  autoSaved: number
  suggestions: number
  discarded: number
  cost: number
}> {
  if (!product) {
    return { specs: [], autoSaved: 0, suggestions: 0, discarded: 0, cost: 0 }
  }

  const categoryName = product.category?.name ?? 'Cameras'
  const expected = getExpectedSpecs(categoryName)
  const firstTranslation =
    product.translations.find((t) => t.locale === 'en') ?? product.translations[0]
  const rawSpecs = firstTranslation?.specifications ?? {}
  const existingSpecs = isStructuredSpecifications(rawSpecs as StructuredSpecifications)
    ? flattenStructuredSpecs(rawSpecs as StructuredSpecifications)
    : (rawSpecs as Record<string, unknown>)

  const missingKeys = expected.filter((k) => {
    const v = existingSpecs[k] ?? existingSpecs[resolveSpecKey(k)]
    return v == null || (typeof v === 'string' && (v as string).trim() === '')
  })

  if (missingKeys.length === 0) {
    return { specs: [], autoSaved: 0, suggestions: 0, discarded: 0, cost: 0 }
  }

  const name = firstTranslation?.name ?? product.sku ?? ''
  const desc = [
    firstTranslation?.shortDescription,
    firstTranslation?.longDescription,
    product.boxContents,
  ]
    .filter(Boolean)
    .join(' ')
    .slice(0, 800)

  const prompt = `You are a world-class cinema equipment specifications expert for FlixCam, a professional cinematic equipment rental platform in Riyadh, Saudi Arabia. Your job is to provide comprehensive, accurate, and highly detailed technical specifications.

Product name: ${name}
Brand: ${product.brand?.name ?? 'Unknown'}
Category: ${categoryName}
Description: ${desc}
Existing specs (partial): ${JSON.stringify(existingSpecs)}

Missing keys to infer: ${missingKeys.join(', ')}

═══════════════════════════════════════════════
MANDATORY RULE: FILL EVERY SINGLE SPEC — NO EXCEPTIONS
═══════════════════════════════════════════════
You MUST provide a value for EVERY missing key listed above. NEVER return "unknown", "N/A", "Not available", or leave any spec empty. If you are unsure, provide your best professional estimate based on the product line, brand tier, and category norms. A reasonable estimate is ALWAYS better than an empty field.

═══════════════════════════════════════════════
CREATIVE MEASUREMENT RULES (MANDATORY FORMAT)
═══════════════════════════════════════════════
Every spec value MUST follow these professional formatting standards:

1. DIMENSIONS & SIZE — Always include exact mm/cm values with context:
   ✓ "Super 35mm (25.1 × 13.1 mm, 3:2 crop area)"
   ✓ "7\" IPS LCD (17.8 cm diagonal, 1920 × 1200)"
   ✗ "Super 35" or "7 inch"

2. RESOLUTION & VIDEO — List ALL supported modes with pixel counts:
   ✓ "6144 × 3456 (6K DCI) / 4096 × 2160 (4K DCI) / 3840 × 2160 (4K UHD) / 1920 × 1080 (Full HD)"
   ✗ "6K" or "4K"

3. CODEC & RECORDING — Full codec names with compression ratios:
   ✓ "BRAW (3:1, 5:1, 8:1, 12:1) / Apple ProRes (422 HQ, 422, LT, Proxy) / H.265 Main10"
   ✗ "BRAW / ProRes"

4. RANGE VALUES — Always show full range with expandable/boost info:
   ✓ "ISO 100–25,600 (native dual: 400 & 3200, expandable to 102,400)"
   ✓ "2800K–10,000K (±0.2 Green/Magenta, stepless adjustment)"
   ✗ "100-25600" or "bicolor"

5. WEIGHT — Exact value with condition notes:
   ✓ "1.84 kg (body only) / 2.13 kg (with battery & card)"
   ✗ "1.8 kg"

6. POWER — Include voltage, wattage, and consumption:
   ✓ "12V DC (11–17V range) / 28W typical draw / 35W peak"
   ✗ "12V"

7. FRAMERATES — All modes at each resolution:
   ✓ "6K: 24/25/30/50/60 fps / 4K: up to 120 fps / 2K: up to 240 fps (windowed)"
   ✗ "up to 120fps"

8. AUDIO — Full technical specs with tolerances:
   ✓ "20 Hz – 20 kHz (±2 dB) / -132 dBV equivalent noise / 137 dB SPL max"
   ✗ "20-20kHz"

9. CONNECTIVITY — Port type, version, and capabilities:
   ✓ "1× HDMI 2.0 (4K60 4:2:2 10-bit) / 1× USB-C 3.1 Gen 2 (10 Gbps, data + charging)"
   ✗ "HDMI, USB-C"

10. BOOLEAN SPECS — Always "Yes" or "No" with detail:
    ✓ "Yes (5-axis, up to 7 stops compensation)" for IBIS
    ✓ "Yes (2, 4, 6 stops motorized)" for ND
    ✓ "No (requires external receiver)" for WiFi
    ✗ "Yes" or "No" alone

11. STOPS & DYNAMIC RANGE — Include measurement standard:
    ✓ "13.5 stops (measured at SNR 2, Cinema EI mode)"
    ✗ "13+ stops"

12. LIGHT OUTPUT — Include distance and beam angle context:
    ✓ "56,200 lux @ 1m (spot, 10° beam) / 4,800 lux @ 1m (flood, 60° beam)"
    ✗ "56200 lux"

13. BATTERY — Include capacity, runtime, and compatibility:
    ✓ "Sony NP-F970 compatible / 98 Wh capacity / approx. 3.5 hrs continuous recording"
    ✗ "NP-F970"

14. COLOR SCIENCE — Include standards and accuracy metrics:
    ✓ "Rec. 709 / DCI-P3 (98% coverage) / Rec. 2020 (76% coverage) / ACES AP0/AP1 supported"
    ✗ "DCI-P3"

UNITS ARE MANDATORY: kg, g, cm, mm, m, W, V, A, Hz, kHz, dB, dBV, fps, stops, nits, cd/m², lux, lm, °, Wh, mAh, Gbps, ms, hrs, min.

Return a JSON array. Each object: { "key": "spec_name", "value": "detailed value per creative measurement rules above", "confidence": 0-100 }
Confidence: 90-100 = recognized exact model; 70-89 = very likely from product line; 50-69 = educated estimate from brand/category; 30-49 = reasonable industry default for this category tier.
REMEMBER: Every key MUST have a real, useful value. Zero tolerance for empty or unknown fields.
Output ONLY the JSON array, no markdown, no explanation.`

  let specs: InferredSpec[] = []
  let cost = 0

  const openaiKey = process.env.OPENAI_API_KEY
  if (openaiKey) {
    try {
      const openai = new OpenAI({ apiKey: openaiKey })
      const res = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 4000,
      })
      const text = res.choices[0]?.message?.content?.trim()
      const match = text?.replace(/```json?\s*|\s*```/g, '').match(/\[[\s\S]*\]/)
      if (match) {
        const arr = JSON.parse(match[0]) as Array<{
          key: string
          value: string
          confidence: number
        }>
        if (Array.isArray(arr)) {
          specs = arr
            .filter((s) => missingKeys.includes(s.key) && String(s.value).trim() !== '')
            .map((s) => ({
              key: s.key,
              value: String(s.value),
              confidence:
                typeof s.confidence === 'number' ? Math.max(0, Math.min(100, s.confidence)) : 50,
              source: 'ai_inference' as const,
              autoSaved: typeof s.confidence === 'number' && s.confidence >= 70,
            }))
          cost = 0.0002
        }
      }
    } catch {
      // fall through to Gemini
    }
  }

  if (specs.length === 0) {
    const geminiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY
    if (geminiKey) {
      try {
        const genAI = new GoogleGenerativeAI(geminiKey)
        const model = genAI.getGenerativeModel({
          model: 'gemini-2.0-flash',
          generationConfig: { maxOutputTokens: 4000 },
        })
        const result = await model.generateContent(prompt)
        const text = result.response.text()?.trim()
        const match = text?.replace(/```json?\s*|\s*```/g, '').match(/\[[\s\S]*\]/)
        if (match) {
          const arr = JSON.parse(match[0]) as Array<{
            key: string
            value: string
            confidence: number
          }>
          if (Array.isArray(arr)) {
            specs = arr
              .filter((s) => missingKeys.includes(s.key) && String(s.value).trim() !== '')
              .map((s) => ({
                key: s.key,
                value: String(s.value),
                confidence:
                  typeof s.confidence === 'number' ? Math.max(0, Math.min(100, s.confidence)) : 50,
                source: 'ai_inference' as const,
                autoSaved: typeof s.confidence === 'number' && s.confidence >= 70,
              }))
            cost = 0.0001
          }
        }
      } catch {
        // return empty
      }
    }
  }

  let autoSaved = 0
  let suggestions = 0
  let discarded = 0
  for (const s of specs) {
    if (s.confidence >= 90) autoSaved++
    else if (s.confidence >= 70) suggestions++
    else discarded++
  }

  return { specs, autoSaved, suggestions, discarded, cost }
}
