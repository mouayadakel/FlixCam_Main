/**
 * Translation helpers (Phase 1.4).
 * Loads messages by locale and provides t() for nested keys.
 */

import type { Locale } from './locales'
import { DEFAULT_LOCALE } from './locales'

import ar from '@/messages/ar.json'
import en from '@/messages/en.json'
import zh from '@/messages/zh.json'

// Message structure: nested objects with string values
type Messages = Record<string, string | Record<string, unknown>>

const messages: Record<Locale, Messages> = {
  ar: ar as Messages,
  en: en as Messages,
  zh: zh as Messages,
}

/**
 * Get messages for a locale.
 */
export function getMessages(locale: Locale): Messages {
  return messages[locale] ?? messages[DEFAULT_LOCALE]
}

/**
 * Get a nested value from an object using dot-notation key.
 */
function getNested(obj: Record<string, unknown>, key: string): string | undefined {
  const parts = key.split('.')
  let current: unknown = obj
  for (const part of parts) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined
    }
    current = (current as Record<string, unknown>)[part]
  }
  return typeof current === 'string' ? current : undefined
}

/**
 * Translate a key (e.g. "nav.equipment") for the given locale.
 * Returns the key if translation is missing.
 */
export function t(locale: Locale, key: string): string {
  const messages = getMessages(locale)
  const value = getNested(messages as Record<string, unknown>, key)
  return value ?? key
}
