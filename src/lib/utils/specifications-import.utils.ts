import type { StructuredSpecifications } from '@/lib/types/specifications.types'
import { isStructuredSpecifications } from '@/lib/types/specifications.types'
import {
  convertFlatToStructured,
  extractHighlights,
  extractQuickSpecs,
  validateSpecifications,
} from '@/lib/utils/specifications.utils'

const SECTION_SHORT = /^(?:\d+\.\s*)?short\s+specs$/i
const SECTION_FULL = /^(?:\d+\.\s*)?full\s+specs$/i
const SECTION_TECH = /^(?:\d+\.\s*)?technician\s+specs$/i
const SECTION_ANY = /^(?:\d+\.\s*)?(short|full|technician)\s+specs$/i
const MAX_KEY_LENGTH = 80

export type NormalizeSpecsSource =
  | 'json'
  | 'notes_sectioned'
  | 'flat_converted'
  | 'ai_enriched'
  | 'empty'

export type NormalizeResult = {
  structured: StructuredSpecifications | null
  source: NormalizeSpecsSource
  confidence: number
  warnings: string[]
  rawNotesBackup?: string
}

type NormalizeInput = {
  specsRaw: unknown
  specsRawNotes?: unknown
  suggestionSpecs?: unknown
  categoryHint?: string
}

function compactObject(input: unknown): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {}
  const entries = Object.entries(input as Record<string, unknown>)
    .map(([k, v]) => [String(k).trim(), v] as const)
    .filter(([k, v]) => k.length > 0 && v != null && String(v).trim() !== '')
  return Object.fromEntries(entries)
}

function normalizeKey(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, MAX_KEY_LENGTH)
}

function keyToLabel(key: string): string {
  return key
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function parseLineSeparatedKeyValues(text: string): Record<string, string> {
  const out: Record<string, string> = {}
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  for (const line of lines) {
    const idx = line.indexOf(':')
    if (idx <= 0) continue
    const key = normalizeKey(line.slice(0, idx))
    const value = line.slice(idx + 1).trim()
    if (!key || !value) continue
    out[key] = value
  }
  return out
}

function buildStructuredFromFlat(
  flat: Record<string, unknown>,
  categoryHint?: string
): StructuredSpecifications | null {
  const normalized = compactObject(flat)
  if (Object.keys(normalized).length === 0) return null
  const structured = convertFlatToStructured(normalized, categoryHint)
  if (!structured.quickSpecs?.length) structured.quickSpecs = extractQuickSpecs(structured, 5)
  if (!structured.highlights?.length) structured.highlights = extractHighlights(structured, 4)
  return structured
}

export function parseStructuredSpecsText(text: string): StructuredSpecifications | null {
  if (!text || typeof text !== 'string' || !text.trim()) return null
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
  if (!lines.some((line) => SECTION_ANY.test(line))) return null

  const groups: StructuredSpecifications['groups'] = []
  let currentGroup: StructuredSpecifications['groups'][number] | null = null

  const pushCurrentGroup = () => {
    if (!currentGroup) return
    if (currentGroup.specs.length > 0) groups.push(currentGroup)
    currentGroup = null
  }

  for (const line of lines) {
    if (SECTION_SHORT.test(line)) {
      pushCurrentGroup()
      currentGroup = { label: 'Short Specs', icon: 'star', priority: groups.length + 1, specs: [] }
      continue
    }
    if (SECTION_FULL.test(line)) {
      pushCurrentGroup()
      currentGroup = { label: 'Full Specs', icon: 'info', priority: groups.length + 1, specs: [] }
      continue
    }
    if (SECTION_TECH.test(line)) {
      pushCurrentGroup()
      currentGroup = {
        label: 'Technician Specs',
        icon: 'zap',
        priority: groups.length + 1,
        specs: [],
      }
      continue
    }
    if (!currentGroup) continue

    if (line.startsWith('-')) {
      const value = line.replace(/^-+/, '').trim()
      if (!value) continue
      const index = currentGroup.specs.length + 1
      currentGroup.specs.push({
        key: `feature_${index}`,
        label: 'Feature',
        value,
        type: 'text',
        highlight: currentGroup.label === 'Short Specs' && index <= 3,
      })
      continue
    }

    const kvIndex = line.indexOf(':')
    if (kvIndex > 0) {
      const key = normalizeKey(line.slice(0, kvIndex))
      const value = line.slice(kvIndex + 1).trim()
      if (!key || !value) continue
      currentGroup.specs.push({
        key,
        label: keyToLabel(key),
        value,
        type: 'text',
        highlight: currentGroup.label === 'Short Specs' && currentGroup.specs.length < 3,
      })
      continue
    }

    const index = currentGroup.specs.length + 1
    currentGroup.specs.push({
      key: `note_${index}`,
      label: 'Note',
      value: line,
      type: 'text',
    })
  }

  pushCurrentGroup()
  if (groups.length === 0) return null

  const structured: StructuredSpecifications = { groups }
  structured.quickSpecs = extractQuickSpecs(structured, 5)
  structured.highlights = extractHighlights(structured, 4)
  return structured
}

function parseUnknownToStructured(
  input: unknown,
  categoryHint?: string
): { structured: StructuredSpecifications | null; usedTextFallback: boolean } {
  if (input == null) return { structured: null, usedTextFallback: false }

  if (typeof input === 'object') {
    if (isStructuredSpecifications(input)) return { structured: input, usedTextFallback: false }
    return { structured: buildStructuredFromFlat(input as Record<string, unknown>, categoryHint), usedTextFallback: false }
  }

  if (typeof input !== 'string') return { structured: null, usedTextFallback: false }
  const text = input.trim()
  if (!text) return { structured: null, usedTextFallback: false }

  try {
    const parsed = JSON.parse(text) as unknown
    if (isStructuredSpecifications(parsed)) return { structured: parsed, usedTextFallback: false }
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return {
        structured: buildStructuredFromFlat(parsed as Record<string, unknown>, categoryHint),
        usedTextFallback: false,
      }
    }
  } catch {
    // no-op: continue text fallback parsing
  }

  const parsedSectioned = parseStructuredSpecsText(text)
  if (parsedSectioned) return { structured: parsedSectioned, usedTextFallback: true }

  const kvFlat = parseLineSeparatedKeyValues(text)
  const structured = buildStructuredFromFlat(kvFlat, categoryHint)
  return { structured, usedTextFallback: true }
}

function flattenStructured(specs: StructuredSpecifications): Record<string, string> {
  const out: Record<string, string> = {}
  for (const group of specs.groups) {
    for (const spec of group.specs) {
      if (spec.key && spec.value) out[spec.key] = String(spec.value)
    }
  }
  return out
}

function mergeStructured(base: StructuredSpecifications, incoming: StructuredSpecifications): StructuredSpecifications {
  const merged: StructuredSpecifications = {
    groups: [...base.groups.map((group) => ({ ...group, specs: [...group.specs] }))],
    highlights: base.highlights ? [...base.highlights] : undefined,
    quickSpecs: base.quickSpecs ? [...base.quickSpecs] : undefined,
    customHtml: base.customHtml,
  }

  const mergedFlat = flattenStructured(base)
  for (const [key, value] of Object.entries(flattenStructured(incoming))) {
    // Heuristic: if incoming value is longer, it's likely more detailed, so prefer it
    if (!mergedFlat[key] || String(value).length > String(mergedFlat[key]).length) {
      mergedFlat[key] = value
    }
  }
  return buildStructuredFromFlat(mergedFlat) ?? merged
}

function scoreStructuredConfidence(
  specs: StructuredSpecifications | null,
  warningsCount: number
): number {
  if (!specs) return 0
  const groupCount = specs.groups.length
  const specCount = specs.groups.reduce((sum, group) => sum + group.specs.length, 0)
  let score = 35
  if (groupCount >= 1) score += 20
  if (groupCount >= 2) score += 10
  if (specCount >= 4) score += 15
  if (specCount >= 8) score += 10
  if ((specs.highlights?.length ?? 0) > 0) score += 5
  if ((specs.quickSpecs?.length ?? 0) > 0) score += 5
  score -= warningsCount * 8
  return Math.max(0, Math.min(100, score))
}

export function normalizeImportedSpecifications(input: NormalizeInput): NormalizeResult {
  const warnings: string[] = []

  const primary = parseUnknownToStructured(input.specsRaw, input.categoryHint)
  const notes = parseUnknownToStructured(input.specsRawNotes, input.categoryHint)
  const ai = parseUnknownToStructured(input.suggestionSpecs, input.categoryHint)

  let source: NormalizeSpecsSource = 'empty'
  let structured = primary.structured

  if (structured) {
    source = primary.usedTextFallback ? 'flat_converted' : 'json'
  }

  if (!structured && notes.structured) {
    structured = notes.structured
    source = 'notes_sectioned'
  }

  if (structured && ai.structured) {
    structured = mergeStructured(structured, ai.structured)
    source = 'ai_enriched'
  } else if (!structured && ai.structured) {
    structured = ai.structured
    source = 'ai_enriched'
  }

  if (structured) {
    const validation = validateSpecifications(structured)
    if (!validation.valid) warnings.push(...validation.errors.slice(0, 4))
    if ((structured.groups?.length ?? 0) === 0) warnings.push('No grouped specifications detected')
  } else if (input.specsRaw || input.specsRawNotes) {
    warnings.push('Input contains specs text but no structured groups were extracted')
  }

  return {
    structured,
    source,
    confidence: scoreStructuredConfidence(structured, warnings.length),
    warnings,
    rawNotesBackup:
      typeof input.specsRawNotes === 'string' && input.specsRawNotes.trim().length > 0
        ? input.specsRawNotes.trim()
        : undefined,
  }
}

