/**
 * i18n locale configuration (Phase 1.4).
 * Supported: Arabic (RTL), English, Chinese.
 */

export const LOCALES = ['ar', 'en', 'zh', 'fr'] as const
export type Locale = (typeof LOCALES)[number]

export const DEFAULT_LOCALE: Locale = 'ar'

/** Locales that use RTL (right-to-left) direction */
export const RTL_LOCALES: Locale[] = ['ar']

export const LOCALE_LABELS: Record<Locale, string> = {
  ar: 'العربية',
  en: 'English',
  zh: '中文',
  fr: 'Français',
}

export const LOCALE_NATIVE_LABELS: Record<Locale, string> = {
  ar: 'العربية',
  en: 'English',
  zh: '中文',
  fr: 'Français',
}

/**
 * Get text direction for a locale.
 */
export function getDir(locale: Locale): 'rtl' | 'ltr' {
  return RTL_LOCALES.includes(locale) ? 'rtl' : 'ltr'
}

/**
 * Check if locale is RTL.
 */
export function isRtl(locale: Locale): boolean {
  return getDir(locale) === 'rtl'
}

/**
 * Validate and coerce string to Locale.
 */
export function parseLocale(value: string | null | undefined): Locale {
  if (value && LOCALES.includes(value as Locale)) {
    return value as Locale
  }
  return DEFAULT_LOCALE
}
