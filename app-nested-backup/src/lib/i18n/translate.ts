/**
 * Translation helpers (Phase 1.4).
 * Loads messages by locale and provides t() for nested keys.
 * Now with lazy loading for better performance.
 */

import type { Locale } from './locales'
import { DEFAULT_LOCALE } from './locales'

// Message structure: nested objects with string values
type Messages = Record<string, string | Record<string, unknown>>

// Cache for loaded messages
const messageCache = new Map<Locale, Messages>()

/**
 * Dynamically load messages for a locale (lazy loading)
 */
async function loadMessages(locale: Locale): Promise<Messages> {
  // Check cache first
  if (messageCache.has(locale)) {
    return messageCache.get(locale)!
  }

  // Dynamic import based on locale
  let messages: Messages

  switch (locale) {
    case 'ar':
      messages = (await import('@/messages/ar.json')).default as Messages
      break
    case 'en':
      messages = (await import('@/messages/en.json')).default as Messages
      break
    case 'zh':
      messages = (await import('@/messages/zh.json')).default as Messages
      break
    case 'fr':
      messages = (await import('@/messages/fr.json')).default as Messages
      break
    default:
      // Fallback to Arabic
      messages = (await import('@/messages/ar.json')).default as Messages
  }

  // Cache the loaded messages
  messageCache.set(locale, messages)
  return messages
}

/**
 * Get messages for a locale (synchronous version for backward compatibility).
 * Attempts to load messages synchronously for server-side rendering.
 */
export function getMessages(locale: Locale): Messages {
  // Check cache first
  if (messageCache.has(locale)) {
    return messageCache.get(locale)!
  }

  // For server-side rendering, try to load messages synchronously
  if (typeof window === 'undefined') {
    try {
      // Server-side: require the messages directly
      let messages: Messages
      switch (locale) {
        case 'ar':
          messages = require('@/messages/ar.json')
          break
        case 'en':
          messages = require('@/messages/en.json')
          break
        case 'zh':
          messages = require('@/messages/zh.json')
          break
        case 'fr':
          messages = require('@/messages/fr.json')
          break
        default:
          messages = require('@/messages/ar.json')
      }
      messageCache.set(locale, messages)
      return messages
    } catch (error) {
      console.error(`Failed to load messages for locale ${locale}:`, error)
    }
  }

  // Client-side: load synchronously so first paint matches server (avoids hydration mismatch)
  try {
    let messages: Messages
    switch (locale) {
      case 'ar':
        messages = require('@/messages/ar.json') as Messages
        break
      case 'en':
        messages = require('@/messages/en.json') as Messages
        break
      case 'zh':
        messages = require('@/messages/zh.json') as Messages
        break
      case 'fr':
        messages = require('@/messages/fr.json') as Messages
        break
      default:
        messages = require('@/messages/ar.json') as Messages
    }
    messageCache.set(locale, messages)
    return messages
  } catch (error) {
    console.error(`Failed to load messages for locale ${locale}:`, error)
    return {} as Messages
  }
}

/**
 * Async version of getMessages for client-side use
 */
export async function getMessagesAsync(locale: Locale): Promise<Messages> {
  return loadMessages(locale)
}

/**
 * Preload messages for a locale (useful for prefetching)
 */
export function preloadMessages(locale: Locale): void {
  loadMessages(locale).catch(console.error)
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
