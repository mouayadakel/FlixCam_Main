/**
 * Locale cookie helpers (Phase 1.4).
 * Cookie name: NEXT_LOCALE. Used for persistence and first-paint script in layout.
 */

import type { Locale } from './locales'
import { parseLocale } from './locales'

export const LOCALE_COOKIE_NAME = 'NEXT_LOCALE'
const LOCALE_COOKIE_MAX_AGE_DAYS = 365

/**
 * Get locale from document.cookie (client-only).
 */
export function getLocaleFromCookie(): Locale | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE_NAME}=([^;]*)`))
  const value = match ? decodeURIComponent(match[1]) : null
  return value ? parseLocale(value) : null
}

/**
 * Set locale cookie (client-only).
 */
export function setLocaleCookie(locale: Locale): void {
  if (typeof document === 'undefined') return
  const maxAge = LOCALE_COOKIE_MAX_AGE_DAYS * 24 * 60 * 60
  document.cookie = `${LOCALE_COOKIE_NAME}=${encodeURIComponent(locale)}; path=/; max-age=${maxAge}; SameSite=Lax`
}

/**
 * Script fragment to run in head for first-paint locale (sets html lang and dir from cookie).
 */
export const LOCALE_INIT_SCRIPT = `
(function(){
  var m = document.cookie.match(/(?:^|; )NEXT_LOCALE=([^;]*)/);
  var locale = m ? decodeURIComponent(m[1]) : '';
  if (locale === 'ar' || locale === 'en' || locale === 'zh') {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
  }
})();
`
  .replace(/\s+/g, ' ')
  .trim()
