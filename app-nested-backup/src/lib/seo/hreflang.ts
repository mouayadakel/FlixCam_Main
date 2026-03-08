/**
 * Hreflang and SEO metadata utilities for multi-language support
 */

import type { Locale } from '@/lib/i18n/locales'
import { LOCALES } from '@/lib/i18n/locales'

const BASE_URL = process.env.NEXTAUTH_URL || process.env.APP_URL || 'https://flixcam.rent'

/**
 * Generate hreflang links for a given path
 */
export function generateHreflangLinks(path: string = '/') {
  const languages: Record<string, string> = {}

  // Add all supported locales
  for (const locale of LOCALES) {
    const url = `${BASE_URL}${path}${path.includes('?') ? '&' : '?'}locale=${locale}`
    languages[locale] = url
  }

  // Add x-default (points to Arabic as default)
  languages['x-default'] = `${BASE_URL}${path}`

  return languages
}

/**
 * Get locale-specific Open Graph locale tag
 */
export function getOgLocale(locale: Locale): string {
  const localeMap: Record<Locale, string> = {
    ar: 'ar_SA',
    en: 'en_US',
    zh: 'zh_CN',
    fr: 'fr_FR',
  }
  return localeMap[locale] || 'ar_SA'
}

/**
 * Get canonical URL for a page
 */
export function getCanonicalUrl(path: string = '/'): string {
  // Canonical always points to the default (Arabic) version
  return `${BASE_URL}${path}`
}

/**
 * Generate alternate links metadata for Next.js
 */
export function generateAlternatesMetadata(path: string = '/') {
  return {
    canonical: getCanonicalUrl(path),
    languages: generateHreflangLinks(path),
  }
}
