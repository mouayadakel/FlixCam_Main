/**
 * Locale store (Phase 1.4). Zustand store for current locale with cookie sync.
 */

import { create } from 'zustand'
import type { Locale } from '@/lib/i18n/locales'
import { DEFAULT_LOCALE, getDir } from '@/lib/i18n/locales'
import { getLocaleFromCookie, setLocaleCookie } from '@/lib/i18n/cookie'

interface LocaleState {
  locale: Locale
  dir: 'rtl' | 'ltr'
  setLocale: (locale: Locale) => void
  /** Initialize from cookie (call once on mount in client). */
  initFromCookie: () => void
}

export const useLocaleStore = create<LocaleState>((set) => ({
  locale: DEFAULT_LOCALE,
  dir: getDir(DEFAULT_LOCALE),

  setLocale: (locale: Locale) => {
    setLocaleCookie(locale)
    set({ locale, dir: getDir(locale) })
    if (typeof document !== 'undefined') {
      document.documentElement.lang = locale
      document.documentElement.dir = getDir(locale)
    }
  },

  initFromCookie: () => {
    const fromCookie = getLocaleFromCookie()
    if (fromCookie) {
      const dir = getDir(fromCookie)
      set({ locale: fromCookie, dir })
      if (typeof document !== 'undefined') {
        document.documentElement.lang = fromCookie
        document.documentElement.dir = dir
      }
    }
  },
}))
