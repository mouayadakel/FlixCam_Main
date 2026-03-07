/**
 * Language switcher (Phase 1.4). Dropdown to switch between AR, EN, ZH.
 */

'use client'

import { useEffect, useState } from 'react'
import { useLocale } from '@/hooks/use-locale'
import { LOCALES, LOCALE_LABELS, type Locale } from '@/lib/i18n/locales'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Languages } from 'lucide-react'

export function LanguageSwitcher() {
  const [mounted, setMounted] = useState(false)
  const { locale, setLocale } = useLocale()

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSelect = (next: Locale) => {
    setLocale(next)
  }

  const ariaLabels: Record<Locale, string> = {
    ar: 'تبديل اللغة',
    en: 'Switch language',
    zh: '切换语言',
    fr: 'Changer de langue',
  }

  const ariaCurrentLabels: Record<Locale, string> = {
    ar: 'اللغة الحالية',
    en: 'Current language',
    zh: '当前语言',
    fr: 'Langue actuelle',
  }

  // Render dropdown only after mount so Radix IDs match (avoids hydration mismatch)
  if (!mounted) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="gap-2"
        aria-label={ariaLabels[locale]}
        aria-haspopup="menu"
        type="button"
      >
        <Languages className="h-4 w-4" aria-hidden="true" />
        <span className="font-medium">{LOCALE_LABELS[locale]}</span>
      </Button>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          aria-label={ariaLabels[locale]}
          aria-haspopup="menu"
          aria-expanded="false"
        >
          <Languages className="h-4 w-4" aria-hidden="true" />
          <span className="font-medium">{LOCALE_LABELS[locale]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[10rem]" role="menu">
        {LOCALES.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => handleSelect(loc)}
            className={locale === loc ? 'bg-accent' : ''}
            role="menuitem"
            aria-current={locale === loc ? 'true' : undefined}
            aria-label={`${LOCALE_LABELS[loc]}${locale === loc ? ` (${ariaCurrentLabels[locale]})` : ''}`}
          >
            {LOCALE_LABELS[loc]}
            {locale === loc && <span className="sr-only"> ({ariaCurrentLabels[locale]})</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
