/**
 * Helper utilities for retrieving locale-specific content from database models
 * Sprint 3: Dynamic Content Localization
 */

import type { Locale } from './locales'

/**
 * Get localized field value from a database model
 * Falls back to default (Arabic) field if locale-specific field is not available
 *
 * @example
 * const name = getLocalizedField(equipment, 'name', 'en')
 * // Returns equipment.nameEn if available, otherwise equipment.name
 */
export function getLocalizedField<T extends Record<string, any>>(
  item: T | null | undefined,
  fieldName: string,
  locale: Locale
): string {
  if (!item) return ''

  // For Arabic (default), use the base field
  if (locale === 'ar') {
    return item[fieldName] || ''
  }

  // Try locale-specific field first
  const localeField = `${fieldName}${locale.charAt(0).toUpperCase() + locale.slice(1)}`
  if (item[localeField]) {
    return item[localeField]
  }

  // Fallback to default (Arabic) field
  return item[fieldName] || ''
}

/**
 * Get localized name for Equipment, Studio, or Kit
 */
export function getLocalizedName<T extends { name?: string; nameEn?: string; nameZh?: string }>(
  item: T | null | undefined,
  locale: Locale
): string {
  return getLocalizedField(item, 'name', locale)
}

/**
 * Get localized description for Equipment, Studio, or Kit
 */
export function getLocalizedDescription<
  T extends {
    description?: string
    descriptionEn?: string
    descriptionZh?: string
  },
>(item: T | null | undefined, locale: Locale): string {
  return getLocalizedField(item, 'description', locale)
}

/**
 * Get localized hero tagline for Studio
 */
export function getLocalizedHeroTagline<
  T extends {
    heroTagline?: string
    heroTaglineEn?: string
    heroTaglineZh?: string
  },
>(studio: T | null | undefined, locale: Locale): string {
  return getLocalizedField(studio, 'heroTagline', locale)
}

/**
 * Check if a model has locale-specific content for a given locale
 */
export function hasLocaleContent<T extends Record<string, any>>(
  item: T | null | undefined,
  fieldName: string,
  locale: Locale
): boolean {
  if (!item || locale === 'ar') return true

  const localeField = `${fieldName}${locale.charAt(0).toUpperCase() + locale.slice(1)}`
  return Boolean(item[localeField])
}

/**
 * Get completion percentage for locale-specific content
 */
export function getLocaleCompletionPercentage<T extends Record<string, any>>(
  item: T | null | undefined,
  fields: string[],
  locale: Locale
): number {
  if (!item || locale === 'ar') return 100

  let completed = 0
  for (const field of fields) {
    if (hasLocaleContent(item, field, locale)) {
      completed++
    }
  }

  return Math.round((completed / fields.length) * 100)
}
