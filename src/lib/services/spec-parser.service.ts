/**
 * Two-stage spec inference: rule-based extraction + Gemini AI for missing specs.
 * Fills ProductTranslation.specifications by category template with confidence-based save.
 */

import { prisma } from '@/lib/db/prisma'
import { getExpectedSpecs } from '@/lib/ai/spec-templates'
import { GoogleGenerativeAI } from '@google/generative-ai'
import type { InferredSpec } from '@/lib/types/backfill.types'

const SPEC_PATTERNS: Record<string, RegExp[]> = {
  weight_kg: [/(\d+\.?\d*)\s*kg/i, /weight[:\s]+(\d+\.?\d*)/i],
  sensor_size: [/full[- ]frame/i, /super\s*35/i, /micro\s*four\s*thirds/i, /aps-c/i],
  resolution: [/(\d{1,2})K/i, /(\d{3,4})\s*x\s*(\d{3,4})/i],
  mount_type: [/PL\s*mount/i, /EF\s*mount/i, /E-mount/i, /RF\s*mount/i, /L-mount/i],
  max_framerate: [/(\d+)\s*fps/i, /(\d+)\s*frames?\s*per\s*second/i],
  battery_type: [/V-mount/i, /Gold\s*mount/i, /NP-F/i, /BP-U/i],
  power_watts: [/(\d+)\s*W(?:att)?/i],
  color_temp: [/(\d{4})\s*K/i, /bi-?color/i, /daylight/i, /tungsten/i],
}

type ProductWithRelations = Awaited<
  ReturnType<
    typeof prisma.product.findUnique<{
      where: { id: string }
      include: { translations: true; category: true; brand: true }
    }>
  >
> | null

function extractByRules(
  text: string,
  expectedKeys: string[]
): Array<{ key: string; value: string; confidence: number }> {
  const results: Array<{ key: string; value: string; confidence: number }> = []
  for (const key of expectedKeys) {
    const patterns = SPEC_PATTERNS[key]
    if (!patterns) continue
    for (const re of patterns) {
      const m = text.match(re)
      if (m) {
        const value = m[1]
          ? `${m[1]}${key.includes('_kg') ? ' kg' : key.includes('fps') ? ' fps' : ''}`.trim()
          : m[0]
        results.push({ key, value, confidence: 85 })
        break
      }
    }
  }
  return results
}

/**
 * Infer missing specs for a product. Stage 1: rules, Stage 2: Gemini.
 */
export async function inferMissingSpecs(product: ProductWithRelations): Promise<{
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
    product.translations.find((t: { locale: string }) => t.locale === 'en') ??
    product.translations[0]
  const existingSpecs = (firstTranslation?.specifications as Record<string, unknown>) ?? {}
  const missingKeys = expected.filter((k) => {
    const v = existingSpecs[k]
    return v == null || (typeof v === 'string' && v.trim() === '')
  })
  if (missingKeys.length === 0) {
    return { specs: [], autoSaved: 0, suggestions: 0, discarded: 0, cost: 0 }
  }

  const text = [
    product.sku,
    firstTranslation?.name,
    firstTranslation?.shortDescription,
    firstTranslation?.longDescription,
    product.boxContents,
  ]
    .filter(Boolean)
    .join(' ')
  const ruleResults = extractByRules(text, missingKeys)
  const ruleKeys = new Set(ruleResults.map((r) => r.key))
  const stillMissing = missingKeys.filter((k) => !ruleKeys.has(k))
  let aiSpecs: InferredSpec[] = []
  let cost = 0

  if (stillMissing.length > 0) {
    try {
      const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY
      if (apiKey) {
        const genAI = new GoogleGenerativeAI(apiKey)
        const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })
        const prompt = `You are a cinema equipment specifications expert. Infer the missing specification values.

Product: ${firstTranslation?.name ?? product.sku}
Brand: ${product.brand?.name ?? ''}
Category: ${categoryName}
Description: ${(firstTranslation?.longDescription ?? firstTranslation?.shortDescription ?? '').slice(0, 500)}
Known specs: ${JSON.stringify(existingSpecs)}

Missing specs to infer: ${stillMissing.join(', ')}

For each spec return JSON array of objects: { "key": "spec_name", "value": "inferred value", "confidence": 0-100, "reasoning": "brief" }
Rules: Only return specs you are confident about (>60). Use standard units (kg, cm, watts). Return "unknown" with confidence 0 if you cannot infer.
Output ONLY a JSON array, no markdown.`
        const result = await model.generateContent(prompt)
        const content = result.response.text().trim()
        const jsonMatch = content.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          const arr = JSON.parse(jsonMatch[0]) as Array<{
            key: string
            value: string
            confidence: number
            reasoning?: string
          }>
          aiSpecs = arr.map((s) => ({
            key: s.key,
            value: String(s.value),
            confidence: typeof s.confidence === 'number' ? s.confidence : 0,
            source: 'ai_inference' as const,
            autoSaved: (typeof s.confidence === 'number' ? s.confidence : 0) >= 90,
            reasoning: s.reasoning,
          }))
        }
        cost = 0.0001
      }
    } catch (e) {
      console.error('Spec inference Gemini failed:', e)
    }
  }

  const allSpecs: InferredSpec[] = [
    ...ruleResults.map((r) => ({
      key: r.key,
      value: r.value,
      confidence: r.confidence,
      source: 'description' as const,
      autoSaved: r.confidence >= 90,
    })),
    ...aiSpecs,
  ]
  let autoSaved = 0
  let suggestions = 0
  let discarded = 0
  for (const s of allSpecs) {
    if (s.confidence >= 90) autoSaved++
    else if (s.confidence >= 70) suggestions++
    else if (s.confidence >= 50) suggestions++
    else discarded++
  }
  return { specs: allSpecs, autoSaved, suggestions, discarded, cost }
}

/**
 * Get expected spec keys for a category.
 */
export function getExpectedSpecsForCategory(categoryName: string): string[] {
  return getExpectedSpecs(categoryName)
}

/**
 * Calculate spec completeness (0-100) for existing specifications vs category template.
 */
export function calculateCompleteness(
  existingSpecs: Record<string, unknown>,
  categoryName: string
): number {
  const expected = getExpectedSpecs(categoryName)
  if (expected.length === 0) return 100
  const filled = expected.filter((k) => {
    const v = existingSpecs[k]
    return v != null && String(v).trim() !== ''
  })
  return Math.round((filled.length / expected.length) * 100)
}
