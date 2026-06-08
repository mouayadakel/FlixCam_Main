/**
 * Direction helpers for RTL/LTR mirroring (FIX-029).
 */

'use client'

import { useLocale } from '@/hooks/use-locale'
import { cn } from '@/lib/utils'

export function useDirection() {
  const { dir, isRtl, locale } = useLocale()

  const mirrorClass = (className?: string) =>
    cn(className, isRtl && 'rtl-mirror rotate-180')

  return { dir, isRtl, locale, mirrorClass }
}
