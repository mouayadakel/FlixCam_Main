/**
 * LocaleProvider (Phase 1.4). Syncs locale from cookie on mount and updates document lang/dir.
 */

'use client'

import { useEffect, type ReactNode } from 'react'
import { useLocaleStore } from '@/lib/stores/locale.store'

interface LocaleProviderProps {
  children: ReactNode
}

export function LocaleProvider({ children }: LocaleProviderProps) {
  const initFromCookie = useLocaleStore((s) => s.initFromCookie)

  useEffect(() => {
    initFromCookie()
  }, [initFromCookie])

  return <>{children}</>
}
