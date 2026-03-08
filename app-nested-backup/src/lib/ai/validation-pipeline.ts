/**
 * Validation pipeline for AI-generated content before saving.
 * Short/long description, SEO, and translation validation with optional auto-fix.
 */

export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
  autoFixable: boolean
  fixedText?: string
}

/**
 * Validate AI-generated short description.
 */
export function validateShortDescription(text: string, _locale: string): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const trimmed = text?.trim() ?? ''
  if (trimmed.length === 0) errors.push('Empty content')
  if (trimmed.length < 30) errors.push('Too short (min ~30 chars)')
  if (trimmed.length > 800) warnings.push('Long for a short description')
  const placeholders = ['lorem ipsum', 'tbd', 'todo', 'placeholder', 'xxx']
  if (placeholders.some((p) => trimmed.toLowerCase().includes(p))) {
    errors.push('Contains placeholder text')
  }
  if (/<[a-z][\s\S]*>/i.test(trimmed)) errors.push('HTML not allowed')
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    autoFixable: errors.length === 0 && trimmed !== text,
    fixedText: trimmed !== text ? trimmed : undefined,
  }
}

/**
 * Validate AI-generated long description.
 */
export function validateLongDescription(text: string, _locale: string): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const trimmed = text?.trim() ?? ''
  if (trimmed.length === 0) errors.push('Empty content')
  if (trimmed.length < 150) errors.push('Too short (min ~150 chars)')
  if (trimmed.length > 3000) warnings.push('Very long')
  const placeholders = ['lorem ipsum', 'tbd', 'todo', 'placeholder']
  if (placeholders.some((p) => trimmed.toLowerCase().includes(p))) {
    errors.push('Contains placeholder text')
  }
  if (/<script|<\/script>/i.test(trimmed)) errors.push('Invalid HTML')
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    autoFixable: errors.length === 0 && trimmed !== text,
    fixedText: trimmed !== text ? trimmed : undefined,
  }
}

/**
 * Validate SEO metadata object.
 */
export function validateSEO(seo: {
  seoTitle: string
  seoDescription: string
  seoKeywords: string
}): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const title = (seo.seoTitle ?? '').trim()
  const desc = (seo.seoDescription ?? '').trim()
  const keywords = (seo.seoKeywords ?? '').trim()
  if (title.length < 30) errors.push('seoTitle too short (min 30 chars)')
  if (title.length > 65) errors.push('seoTitle too long (max 65)')
  if (desc.length < 100) errors.push('seoDescription too short (min 100)')
  if (desc.length > 165) errors.push('seoDescription too long (max 165)')
  const kwList = keywords
    .split(',')
    .map((k) => k.trim())
    .filter(Boolean)
  if (kwList.length < 3) errors.push('Need at least 3 keywords')
  if (kwList.length > 15) warnings.push('Many keywords')
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    autoFixable: false,
  }
}

/**
 * Validate translation output (length and basic sanity).
 */
export function validateTranslation(
  text: string,
  _locale: string,
  sourceLength: number
): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const trimmed = text?.trim() ?? ''
  if (trimmed.length === 0) errors.push('Empty translation')
  const ratio = sourceLength > 0 ? trimmed.length / sourceLength : 1
  if (ratio < 0.5) errors.push('Translation much shorter than source')
  if (ratio > 2) warnings.push('Translation much longer than source')
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    autoFixable: errors.length === 0 && trimmed !== text,
    fixedText: trimmed !== text ? trimmed : undefined,
  }
}
