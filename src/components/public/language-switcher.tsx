/**
 * Language switcher (Phase 1.4). Dropdown to switch between AR, EN, ZH.
 */

'use client'

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
  const { locale, setLocale } = useLocale()

  const handleSelect = (next: Locale) => {
    setLocale(next)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-2"
          aria-label="Switch language"
        >
          <Languages className="h-4 w-4" />
          <span className="font-medium">{LOCALE_LABELS[locale]}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[10rem]">
        {LOCALES.map((loc) => (
          <DropdownMenuItem
            key={loc}
            onClick={() => handleSelect(loc)}
            className={locale === loc ? 'bg-accent' : ''}
          >
            {LOCALE_LABELS[loc]}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
