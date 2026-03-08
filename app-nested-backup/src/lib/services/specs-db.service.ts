/**
 * @file specs-db.service.ts
 * @description Product name recognizer + curated specs database.
 * If a known product model is detected (e.g., "Sony FX6"), pulls specs at 98% confidence
 * without needing an LLM call. Falls back to LLM inference for unknown products.
 * @module lib/services
 */

import curatedSpecs from '@/lib/data/curated-specs.json'
import deepSpecs from '@/lib/data/deep-specs-schema.json'

export interface SpecMatch {
  specs: Record<string, string>
  confidence: number
  source: 'curated' | 'deep' | 'web' | 'ai'
  matchedModel: string | null
  boxContents?: string[]
  marketingHighlights?: string
  webReferences?: Record<string, string>
}

const CURATED_DB = curatedSpecs as Record<string, Record<string, string>>
const DEEP_DB = deepSpecs as Record<
  string,
  {
    marketing_highlights?: string
    technical_specs: Record<string, string>
    web_references?: Record<string, string>
    box_contents?: string[]
  }
>

const MODEL_KEYS = Object.keys(CURATED_DB)
const DEEP_KEYS = Object.keys(DEEP_DB)

/**
 * Compute similarity between two strings (case-insensitive)
 * Uses longest common subsequence ratio
 */
function similarity(a: string, b: string): number {
  const al = a.toLowerCase()
  const bl = b.toLowerCase()
  if (al === bl) return 1

  if (al.includes(bl) || bl.includes(al)) {
    return Math.min(al.length, bl.length) / Math.max(al.length, bl.length)
  }

  const tokens_a = al.split(/[\s\-_]+/)
  const tokens_b = bl.split(/[\s\-_]+/)
  let matches = 0
  for (const ta of tokens_a) {
    if (tokens_b.some((tb) => tb === ta || tb.includes(ta) || ta.includes(tb))) {
      matches++
    }
  }
  return matches / Math.max(tokens_a.length, tokens_b.length)
}

/**
 * Extract brand + model from a product name
 * E.g., "sony a7siii Full Frame Camera" -> tries to match "Sony A7S III"
 */
function normalizeProductName(name: string): string {
  return name.replace(/\s+/g, ' ').replace(/[-_]+/g, ' ').trim()
}

/**
 * Look up curated specs for a product by name.
 * Returns null if no match found above threshold (0.6).
 */
export function lookupCuratedSpecs(productName: string, brandName?: string): SpecMatch | null {
  const normalized = normalizeProductName(productName)
  const searchString = brandName ? `${brandName} ${normalized}` : normalized

  let bestMatch: string | null = null
  let bestScore = 0

  for (const modelKey of MODEL_KEYS) {
    const score = similarity(searchString, modelKey)
    if (score > bestScore) {
      bestScore = score
      bestMatch = modelKey
    }

    const nameScore = similarity(normalized, modelKey)
    if (nameScore > bestScore) {
      bestScore = nameScore
      bestMatch = modelKey
    }
  }

  if (bestMatch && bestScore >= 0.6) {
    return {
      specs: CURATED_DB[bestMatch],
      confidence: bestScore >= 0.9 ? 98 : bestScore >= 0.7 ? 90 : 75,
      source: 'curated',
      matchedModel: bestMatch,
    }
  }

  return null
}

/**
 * Look up deep specs (expanded format with box contents, marketing, and web references).
 * Falls back to basic curated lookup if no deep match.
 */
export function lookupDeepSpecs(productName: string, brandName?: string): SpecMatch | null {
  const normalized = normalizeProductName(productName)
  const searchString = brandName ? `${brandName} ${normalized}` : normalized

  // Deep specs use underscore format keys like SONY_FX6
  const deepSearchKey = searchString.toUpperCase().replace(/\s+/g, '_')

  let bestMatch: string | null = null
  let bestScore = 0

  for (const deepKey of DEEP_KEYS) {
    const humanKey = deepKey.replace(/_/g, ' ')
    const score = similarity(searchString, humanKey)
    if (score > bestScore) {
      bestScore = score
      bestMatch = deepKey
    }
  }

  if (bestMatch && bestScore >= 0.5) {
    const deep = DEEP_DB[bestMatch]
    const specs: Record<string, string> = {}
    for (const [k, v] of Object.entries(deep.technical_specs)) {
      specs[k.replace(/_/g, ' ')] = v
    }

    return {
      specs,
      confidence: bestScore >= 0.9 ? 98 : bestScore >= 0.7 ? 92 : 80,
      source: 'deep',
      matchedModel: bestMatch.replace(/_/g, ' '),
      boxContents: deep.box_contents,
      marketingHighlights: deep.marketing_highlights,
      webReferences: deep.web_references,
    }
  }

  return lookupCuratedSpecs(productName, brandName)
}

/**
 * Get all known product models in the curated database
 */
export function getKnownModels(): string[] {
  return [...MODEL_KEYS, ...DEEP_KEYS.map((k) => k.replace(/_/g, ' '))]
}

/**
 * Check if a specific model exists in the curated database
 */
export function hasModel(modelName: string): boolean {
  return MODEL_KEYS.some((key) => key.toLowerCase() === modelName.toLowerCase())
}

/**
 * Add or update specs for a model in the runtime cache.
 * For persistent storage, use the CuratedSpec Prisma model.
 */
export function addToRuntime(modelName: string, specs: Record<string, string>): void {
  CURATED_DB[modelName] = specs
  if (!MODEL_KEYS.includes(modelName)) {
    MODEL_KEYS.push(modelName)
  }
}
