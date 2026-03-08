/**
 * Lazy loading for locale bundles
 * Only loads the active locale to reduce initial bundle size
 */

import type { Locale } from './locales'

type Messages = Record<string, string | Record<string, unknown>>

const loadedLocales = new Map<Locale, Messages>()

/**
 * Dynamically import locale messages
 */
export async function loadLocaleMessages(locale: Locale): Promise<Messages> {
  // Check if already loaded
  if (loadedLocales.has(locale)) {
    return loadedLocales.get(locale)!
  }

  // Dynamic import based on locale
  let messages: Messages

  try {
    switch (locale) {
      case 'ar':
        messages = (await import('@/messages/ar.json')).default
        break
      case 'en':
        messages = (await import('@/messages/en.json')).default
        break
      case 'zh':
        messages = (await import('@/messages/zh.json')).default
        break
      case 'fr':
        messages = (await import('@/messages/fr.json')).default
        break
      default:
        // Fallback to Arabic
        messages = (await import('@/messages/ar.json')).default
    }

    // Cache the loaded messages
    loadedLocales.set(locale, messages)
    return messages
  } catch (error) {
    console.error(`Failed to load locale ${locale}:`, error)
    // Fallback to Arabic
    if (locale !== 'ar') {
      return loadLocaleMessages('ar')
    }
    throw error
  }
}

/**
 * Preload a locale in the background
 */
export function preloadLocale(locale: Locale): void {
  if (!loadedLocales.has(locale)) {
    loadLocaleMessages(locale).catch(console.error)
  }
}

/**
 * Clear cached locale messages (useful for hot reload in dev)
 */
export function clearLocaleCache(): void {
  loadedLocales.clear()
}
