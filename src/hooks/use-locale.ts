/**
 * useLocale hook (Phase 1.4). Returns locale, dir, t(), and setLocale.
 */

'use client'

import { useCallback } from 'react'
import { useLocaleStore } from '@/lib/stores/locale.store'
import { t as tFn } from '@/lib/i18n/translate'
import type { Locale } from '@/lib/i18n/locales'

export function useLocale() {
  const { locale, dir, setLocale } = useLocaleStore()

  const t = useCallback(
    (key: string) => tFn(locale, key),
    [locale]
  )

  return {
    locale,
    dir,
    setLocale,
    t,
    isRtl: dir === 'rtl',
  }
}
